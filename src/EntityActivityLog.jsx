import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { subscribeToActivityLog, logActivity, updateActivityLog, deleteActivityLog } from "./lib/activityLogApi";
import "./Overview/Overview.css";
import ActivityButton from "./ActivityButton";
import LogNoteModal from "./LogNoteModal";

/**
 * Re-usable activity log scoped to a single entity (client/professional or property).
 *
 * Props:
 * - entityType: "client" | "property" | "professional"
 * - entityName: string
 * - title: optional string for the tile header (defaults to "Activity")
 * - clients: optional array of clients (for offer actions)
 * - properties: optional array of properties (for offer actions)
 * - professionals: optional array of professionals
 * - onAcceptOffer: optional callback(clientName, propertyName, amount)
 * - onDeclineOffer: optional callback(clientName, propertyName)
 * - onCreateSalesProgression: optional callback(clientName, propertyName)
 * - onRemoveSalesProgression: optional callback(clientName, propertyName)
 * - onUpdateClientStatus: optional callback(clientName, status)
 * - onUpdatePropertyOffer: optional callback(propertyName, updates)
 */
function EntityActivityLog({ 
  entityType, 
  entityName, 
  title = "Activity",
  clients = [],
  properties = [],
  professionals = [],
  onAcceptOffer,
  onDeclineOffer,
  onCreateSalesProgression,
  onRemoveSalesProgression,
  onUpdateClientStatus,
  onUpdatePropertyOffer,
  onNoteClick,
  onLogOfferClick,
  onPhoneCallNoteClick,
}) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [counterOfferActivity, setCounterOfferActivity] = useState(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState("");
  const [lastAction, setLastAction] = useState(null);
  const [undoneActions, setUndoneActions] = useState([]); // Stack of undone actions for redo
  const [showCancelOtherOffersModal, setShowCancelOtherOffersModal] = useState(false);
  const [pendingAcceptOffer, setPendingAcceptOffer] = useState(null);
  const [otherPendingOffers, setOtherPendingOffers] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToActivityLog((list) => {
      setActivities(list);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (openMenuId === null) return;
    const handleClickOutside = (event) => {
      const menuRef = menuRefs.current[openMenuId];
      if (menuRef && !menuRef.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return timestamp;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "";
    }
  };

  // Group activities by date
  const groupActivitiesByDate = (activities) => {
    const grouped = {};
    activities.forEach((activity) => {
      const date = new Date(activity.timestamp);
      const dateKey = date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });
    // Sort activities within each date group by timestamp (newest first)
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    });
    // Sort date groups by date (newest first)
    return Object.entries(grouped).sort(([dateA], [dateB]) => {
      return new Date(dateB) - new Date(dateA);
    });
  };

  // Filter activities - for offers, notes, and fallenThrough with clientName/propertyName/professionalName, check those fields too
  const filtered = activities.filter((activity) => {
    // For activities with clientName, propertyName, or professionalName, show if the relevant field matches
    if (activity.clientName && activity.propertyName) {
      if (entityType === "client") {
        return activity.clientName === entityName;
      }
      if (entityType === "property") {
        return activity.propertyName === entityName;
      }
    }
    // For activities with professionalName, show if professional matches
    if (activity.professionalName) {
      if (entityType === "professional") {
        return activity.professionalName === entityName;
      }
    }
    // Default filtering
    return activity.entityType === entityType && activity.entityName === entityName;
  });

  const getTypeLabel = (activity) => {
    if (activity.type === "note") return "Note";
    if (activity.type === "phoneCall") return "Phone Call";
    if (activity.type === "fallenThrough") return "Deal Fallen Through";
    if (activity.type === "offer") {
      if (activity.status === "Rejected") return "Offer Rejected";
      if (activity.status === "Cancelled") return "Offer Cancelled";
      if (activity.status === "Accepted") return "Offer Accepted";
      if (activity.status === "Vendor Counter Offer") return "Vendor Counter Offer Made";
      if (activity.status === "Client Counter Offer") return "Client Counter Offer Made";
      if (activity.status === "Client Accepted") return "Client Accepted Vendor Counter Offer";
      if (activity.status === "Client Rejected") return "Client Rejected Vendor Counter Offer";
      if (activity.status === "Vendor Accepted") return "Vendor Accepted Client Counter Offer";
      if (activity.status === "Vendor Rejected") return "Vendor Rejected Client Counter Offer";
      if (activity.status === "Pending") return "Client Offer Made";
      return "Offer Made";
    }
    return "Activity";
  };

  const handleDeleteNote = async (activity) => {
    if (!window.confirm("Are you sure you want to delete this note? This will remove it from all linked clients and properties.")) {
      return;
    }

    const { updateClientById } = await import("./lib/clientsApi");
    const { updatePropertyById } = await import("./lib/propertiesApi");

    // Delete note from all linked clients
    if (activity.clientName) {
      const clientsToUpdate = clients.filter(c => c.name === activity.clientName);
      for (const client of clientsToUpdate) {
        if (client.id && Array.isArray(client.notes)) {
          // Remove note matching timestamp and details
          const updatedNotes = client.notes.filter(note => 
            !(note.date === activity.timestamp && note.text === activity.details)
          );
          await updateClientById(client.id, { notes: updatedNotes });
        }
      }
    }

    // Delete note from all linked properties
    if (activity.propertyName) {
      const propertiesToUpdate = properties.filter(p => p.name === activity.propertyName);
      for (const property of propertiesToUpdate) {
        if (property.id && Array.isArray(property.notes)) {
          // Remove note matching timestamp and details
          const updatedNotes = property.notes.filter(note => 
            !(note.date === activity.timestamp && note.text === activity.details)
          );
          await updatePropertyById(property.id, { notes: updatedNotes });
        }
      }
    }

    // Delete the activity log entry
    if (activity.id) {
      await deleteActivityLog(activity.id);
    }

    setOpenMenuId(null);
  };

  const handleEditNote = (activity) => {
    setEditingNote({
      noteText: activity.details || "",
      timestamp: activity.timestamp,
      activityId: activity.id,
      clientName: activity.clientName,
      propertyName: activity.propertyName,
      professionalName: activity.professionalName
    });
    setShowEditNoteModal(true);
    setOpenMenuId(null);
  };

  const formatCurrencyInput = (value) => {
    const numericValue = value.replace(/[^\d]/g, "");
    return numericValue ? "£" + Number(numericValue).toLocaleString("en-UK") : "";
  };

  const handleAcceptOffer = async (activity) => {
    const clientName = activity.clientName || (entityType === "client" ? entityName : null);
    const propertyName = activity.propertyName || (entityType === "property" ? entityName : null);
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Check for other pending offers for the same client
    const otherPending = activities.filter(a => 
      a.type === "offer" && 
      a.status === "Pending" && 
      a.clientName === clientName && 
      a.propertyName !== propertyName &&
      !activities.some(act => 
        act.type === "offer" &&
        (act.status === "Accepted" || act.status === "Rejected" || act.status === "Cancelled") &&
        act.clientName === a.clientName &&
        act.propertyName === a.propertyName &&
        Number(act.details) === Number(a.details) &&
        act.createdAt > a.createdAt
      )
    );

    if (otherPending.length > 0) {
      // Show confirmation modal
      setOtherPendingOffers(otherPending);
      setPendingAcceptOffer(activity);
      setShowCancelOtherOffersModal(true);
      return;
    }

    // No other pending offers, proceed with acceptance
    await proceedWithAcceptOffer(activity);
  };

  const proceedWithAcceptOffer = async (activity, cancelOtherOffers = false) => {
    const clientName = activity.clientName || (entityType === "client" ? entityName : null);
    const propertyName = activity.propertyName || (entityType === "property" ? entityName : null);
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Cancel other pending offers if requested
    if (cancelOtherOffers && otherPendingOffers.length > 0) {
      for (const otherOffer of otherPendingOffers) {
        const otherPropertyName = otherOffer.propertyName;
        const otherAmount = Number(otherOffer.details);

        // Update property offer status to cancelled
        if (onUpdatePropertyOffer) {
          await onUpdatePropertyOffer(otherPropertyName, {
            offerAmount: null,
            offerStatus: "None",
            setLastOfferStatus: "Cancelled"
          });
        }

        // Create a new activity log entry for the cancellation
        await logActivity({
          type: "offer",
          entityType: "property",
          entityName: otherPropertyName,
          clientName: clientName,
          propertyName: otherPropertyName,
          details: String(otherAmount),
          status: "Cancelled",
        });
      }
    }

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Compute display client name (same format as used in sales progression)
    let displayClientName = clientName;
    if (client) {
      const hasBothFirstNames = Boolean(client.spouse1FirstName) && Boolean(client.spouse2FirstName);
      if (hasBothFirstNames) {
        displayClientName = `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
      } else if (client.spouse1FirstName || client.spouse1Surname) {
        const first = client.spouse1FirstName || "";
        const surname = client.spouse1Surname || "";
        displayClientName = [first, surname].filter(Boolean).join(" ");
      }
    }

    // Update property offer status
    if (onUpdatePropertyOffer) {
      await onUpdatePropertyOffer(propertyName, {
        offerAmount: amount,
        offerStatus: "Accepted",
        setLastOfferStatus: "Accepted"
      });
    }

    // Update client status
    if (onUpdateClientStatus) {
      await onUpdateClientStatus(clientName, "Matched");
    }

    // Create sales progression
    if (onCreateSalesProgression) {
      await onCreateSalesProgression(clientName, propertyName);
    }

    // Create a new activity log entry for the acceptance (sequential timeline)
    await logActivity({
      type: "offer",
      entityType: "property",
      entityName: propertyName,
      clientName: clientName,
      propertyName: propertyName,
      details: String(amount),
      status: "Accepted",
    });

    // Store action for undo (include displayClientName for sales progression removal)
    setLastAction({
      type: "accept",
      activityId: activity.id,
      activityCreatedAt: activity.createdAt,
      clientName,
      displayClientName, // Store formatted name for sales progression removal
      propertyName,
      amount,
      previousClientStatus,
      previousPropertyStatus,
      previousOfferStatus,
      hasSalesProgression: true
    });

    // Reset modal state
    setShowCancelOtherOffersModal(false);
    setPendingAcceptOffer(null);
    setOtherPendingOffers([]);
  };

  const handleDeclineOffer = async (activity) => {
    const clientName = activity.clientName || (entityType === "client" ? entityName : null);
    const propertyName = activity.propertyName || (entityType === "property" ? entityName : null);
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;
    const previousOfferAmount = property?.offerAmount || null;

    // Update property offer status
    if (onUpdatePropertyOffer) {
      await onUpdatePropertyOffer(propertyName, {
        offerAmount: null,
        offerStatus: "None",
        setLastOfferStatus: "Rejected"
      });
    }

    // Update client status
    if (onUpdateClientStatus) {
      await onUpdateClientStatus(clientName, "Searching");
    }

    // Create a new activity log entry for the rejection (sequential timeline)
    await logActivity({
      type: "offer",
      entityType: "property",
      entityName: propertyName,
      clientName: clientName,
      propertyName: propertyName,
      details: String(amount),
      status: "Rejected",
    });

    // Store action for undo
    setLastAction({
      type: "decline",
      activityId: activity.id,
      activityCreatedAt: activity.createdAt,
      clientName,
      propertyName,
      amount,
      previousClientStatus,
      previousPropertyStatus,
      previousOfferStatus,
      previousOfferAmount
    });
  };

  const handleClientAcceptVendorCounterOffer = async (activity) => {
    const clientName = activity.clientName || (entityType === "client" ? entityName : null);
    const propertyName = activity.propertyName || (entityType === "property" ? entityName : null);
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Update property offer status to Accepted
    if (onUpdatePropertyOffer) {
      await onUpdatePropertyOffer(propertyName, {
        offerAmount: amount,
        offerStatus: "Accepted",
        setLastOfferStatus: "Accepted"
      });
    }

    // Update client status
    if (onUpdateClientStatus) {
      await onUpdateClientStatus(clientName, "Matched");
    }

    // Create sales progression
    if (onCreateSalesProgression) {
      await onCreateSalesProgression(clientName, propertyName);
    }

    // Log client accepted vendor counter offer
    await logActivity({
      type: "offer",
      entityType: "property",
      entityName: propertyName,
      clientName: clientName,
      propertyName: propertyName,
      details: String(amount),
      status: "Client Accepted",
    });

    // Store action for undo
    setLastAction({
      type: "clientAcceptVendorCounter",
      activityId: activity.id,
      activityCreatedAt: activity.createdAt,
      clientName,
      propertyName,
      amount,
      previousClientStatus,
      previousPropertyStatus,
      previousOfferStatus,
      hasSalesProgression: true
    });
  };

  const handleClientRejectVendorCounterOffer = async (activity) => {
    const clientName = activity.clientName || (entityType === "client" ? entityName : null);
    const propertyName = activity.propertyName || (entityType === "property" ? entityName : null);
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Update property offer status
    if (onUpdatePropertyOffer) {
      await onUpdatePropertyOffer(propertyName, {
        offerAmount: null,
        offerStatus: "None",
        setLastOfferStatus: "Rejected"
      });
    }

    // Update client status
    if (onUpdateClientStatus) {
      await onUpdateClientStatus(clientName, "Searching");
    }

    // Log client rejected vendor counter offer
    await logActivity({
      type: "offer",
      entityType: "property",
      entityName: propertyName,
      clientName: clientName,
      propertyName: propertyName,
      details: String(amount),
      status: "Client Rejected",
    });

    // Store action for undo
    setLastAction({
      type: "clientRejectVendorCounter",
      activityId: activity.id,
      activityCreatedAt: activity.createdAt,
      clientName,
      propertyName,
      amount,
      previousClientStatus,
      previousPropertyStatus,
      previousOfferStatus
    });
  };

  const handleVendorAcceptClientCounterOffer = async (activity) => {
    const clientName = activity.clientName || (entityType === "client" ? entityName : null);
    const propertyName = activity.propertyName || (entityType === "property" ? entityName : null);
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Update property offer status to Accepted
    if (onUpdatePropertyOffer) {
      await onUpdatePropertyOffer(propertyName, {
        offerAmount: amount,
        offerStatus: "Accepted",
        setLastOfferStatus: "Accepted"
      });
    }

    // Update client status
    if (onUpdateClientStatus) {
      await onUpdateClientStatus(clientName, "Matched");
    }

    // Create sales progression
    if (onCreateSalesProgression) {
      await onCreateSalesProgression(clientName, propertyName);
    }

    // Log vendor accepted client counter offer
    await logActivity({
      type: "offer",
      entityType: "property",
      entityName: propertyName,
      clientName: clientName,
      propertyName: propertyName,
      details: String(amount),
      status: "Vendor Accepted",
    });

    // Store action for undo
    setLastAction({
      type: "vendorAcceptClientCounter",
      activityId: activity.id,
      activityCreatedAt: activity.createdAt,
      clientName,
      propertyName,
      amount,
      previousClientStatus,
      previousPropertyStatus,
      previousOfferStatus,
      hasSalesProgression: true
    });
  };

  const handleVendorRejectClientCounterOffer = async (activity) => {
    const clientName = activity.clientName || (entityType === "client" ? entityName : null);
    const propertyName = activity.propertyName || (entityType === "property" ? entityName : null);
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Update property offer status
    if (onUpdatePropertyOffer) {
      await onUpdatePropertyOffer(propertyName, {
        offerAmount: null,
        offerStatus: "None",
        setLastOfferStatus: "Rejected"
      });
    }

    // Update client status
    if (onUpdateClientStatus) {
      await onUpdateClientStatus(clientName, "Searching");
    }

    // Log vendor rejected client counter offer
    await logActivity({
      type: "offer",
      entityType: "property",
      entityName: propertyName,
      clientName: clientName,
      propertyName: propertyName,
      details: String(amount),
      status: "Vendor Rejected",
    });

    // Store action for undo
    setLastAction({
      type: "vendorRejectClientCounter",
      activityId: activity.id,
      activityCreatedAt: activity.createdAt,
      clientName,
      propertyName,
      amount,
      previousClientStatus,
      previousPropertyStatus,
      previousOfferStatus
    });
  };

  const handleCounterOffer = async () => {
    if (!counterOfferActivity || !counterOfferAmount) return;

    const numericAmount = counterOfferAmount.replace(/[^\d]/g, "");
    if (!numericAmount) return;

    const clientName = counterOfferActivity.clientName || (entityType === "client" ? entityName : null);
    const propertyName = counterOfferActivity.propertyName || (entityType === "property" ? entityName : null);
    const amount = Number(numericAmount);

    if (!clientName || !propertyName) return;

    // Update property offer
    if (onUpdatePropertyOffer) {
      const property = properties.find(p => p.name === propertyName);
      if (property) {
        const offers = Array.isArray(property.offers) ? [...property.offers] : [];
        offers.push({
          date: new Date().toISOString(),
          amount: amount,
          status: "Pending"
        });
        await onUpdatePropertyOffer(propertyName, {
          offerAmount: amount,
          offerStatus: "Pending",
          offers: offers
        });
      }
    }

    // Update client status
    if (onUpdateClientStatus) {
      await onUpdateClientStatus(clientName, "Under Offer");
    }

    // Determine if this is a client counter offer (after vendor counter offer was rejected) or vendor counter offer
    const isClientCounterOffer = counterOfferActivity.status === "Client Rejected" &&
      activities.some(a =>
        a.type === "offer" &&
        a.status === "Vendor Counter Offer" &&
        a.clientName === clientName &&
        a.propertyName === propertyName &&
        a.createdAt < counterOfferActivity.createdAt
      );

    // Log counter offer to activity log
    await logActivity({
      type: "offer",
      entityType: "property",
      entityName: propertyName,
      clientName: clientName,
      propertyName: propertyName,
      details: String(amount),
      status: isClientCounterOffer ? "Client Counter Offer" : "Vendor Counter Offer",
    });

    setShowCounterOfferModal(false);
    setCounterOfferActivity(null);
    setCounterOfferAmount("");

    // Store action for undo
    setLastAction({
      type: "counterOffer",
      activityId: counterOfferActivity.id,
      activityCreatedAt: counterOfferActivity.createdAt,
      clientName,
      propertyName,
      amount,
      isClientCounterOffer
    });
  };

  const handleUndo = async () => {
    if (!lastAction) return;

    // Find the Accepted/Declined/Counter Offer entry that was created by this action
    const actionEntry = activities.find(a => 
      a.type === "offer" &&
      ((lastAction.type === "accept" && a.status === "Accepted") ||
       (lastAction.type === "decline" && a.status === "Rejected") ||
       (lastAction.type === "counterOffer" && (a.status === "Vendor Counter Offer" || a.status === "Client Counter Offer")) ||
       (lastAction.type === "clientAcceptVendorCounter" && a.status === "Client Accepted") ||
       (lastAction.type === "clientRejectVendorCounter" && a.status === "Client Rejected") ||
       (lastAction.type === "vendorAcceptClientCounter" && a.status === "Vendor Accepted") ||
       (lastAction.type === "vendorRejectClientCounter" && a.status === "Vendor Rejected")) &&
      a.clientName === lastAction.clientName &&
      a.propertyName === lastAction.propertyName &&
      Number(a.details) === lastAction.amount &&
      a.createdAt > lastAction.activityCreatedAt
    );

    if (lastAction.type === "accept") {
      // Delete the Accepted entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      if (onUpdatePropertyOffer) {
        await onUpdatePropertyOffer(lastAction.propertyName, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount
        });
      }

      if (onUpdateClientStatus && lastAction.previousClientStatus) {
        await onUpdateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }

      // Remove sales progression if it was created
      // Use displayClientName if available (formatted name used in sales progression), otherwise fall back to clientName
      if (onRemoveSalesProgression && lastAction.hasSalesProgression) {
        const clientNameForRemoval = lastAction.displayClientName || lastAction.clientName;
        await onRemoveSalesProgression(lastAction.propertyName, clientNameForRemoval);
      }
    } else if (lastAction.type === "decline") {
      // Delete the Declined entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      if (onUpdatePropertyOffer) {
        await onUpdatePropertyOffer(lastAction.propertyName, {
          offerStatus: "Pending",
          offerAmount: lastAction.previousOfferAmount || lastAction.amount
        });
      }

      if (onUpdateClientStatus && lastAction.previousClientStatus) {
        await onUpdateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }
    } else if (lastAction.type === "counterOffer") {
      // Delete the Counter Offer entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Remove the counter offer from property
      const property = properties.find(p => p.name === lastAction.propertyName);
      if (property && onUpdatePropertyOffer) {
        const offers = Array.isArray(property.offers) ? [...property.offers] : [];
        if (offers.length > 0 && offers[offers.length - 1].amount === lastAction.amount) {
          offers.pop();
          await onUpdatePropertyOffer(lastAction.propertyName, {
            offers: offers,
            offerAmount: offers.length > 0 ? offers[offers.length - 1].amount : null,
            offerStatus: offers.length > 0 ? "Pending" : "None"
          });
        }
      }
    } else if (lastAction.type === "clientAcceptVendorCounter") {
      // Delete the Client Accepted entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      if (onUpdatePropertyOffer) {
        await onUpdatePropertyOffer(lastAction.propertyName, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount
        });
      }

      if (onUpdateClientStatus && lastAction.previousClientStatus) {
        await onUpdateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }

      // Remove sales progression if it was created
      if (onRemoveSalesProgression && lastAction.hasSalesProgression) {
        await onRemoveSalesProgression(lastAction.propertyName, lastAction.clientName);
      }
    } else if (lastAction.type === "clientRejectVendorCounter") {
      // Delete the Client Rejected entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      if (onUpdatePropertyOffer) {
        await onUpdatePropertyOffer(lastAction.propertyName, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount
        });
      }

      if (onUpdateClientStatus && lastAction.previousClientStatus) {
        await onUpdateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }
    } else if (lastAction.type === "vendorAcceptClientCounter") {
      // Delete the Vendor Accepted entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      if (onUpdatePropertyOffer) {
        await onUpdatePropertyOffer(lastAction.propertyName, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount
        });
      }

      if (onUpdateClientStatus && lastAction.previousClientStatus) {
        await onUpdateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }

      // Remove sales progression if it was created
      if (onRemoveSalesProgression && lastAction.hasSalesProgression) {
        await onRemoveSalesProgression(lastAction.propertyName, lastAction.clientName);
      }
    } else if (lastAction.type === "vendorRejectClientCounter") {
      // Delete the Vendor Rejected entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      if (onUpdatePropertyOffer) {
        await onUpdatePropertyOffer(lastAction.propertyName, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount
        });
      }

      if (onUpdateClientStatus && lastAction.previousClientStatus) {
        await onUpdateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }
    }

    // Move the undone action to the redo stack
    setUndoneActions(prev => [...prev, lastAction]);
    setLastAction(null);
  };

  const handleRedo = async () => {
    if (undoneActions.length === 0) return;

    const actionToRedo = undoneActions[undoneActions.length - 1];
    const newUndoneActions = undoneActions.slice(0, -1);
    setUndoneActions(newUndoneActions);

    // Re-apply the action
    if (actionToRedo.type === "accept") {
      const activity = activities.find(a => a.id === actionToRedo.activityId);
      if (activity) {
        await handleAcceptOffer(activity);
      }
    } else if (actionToRedo.type === "decline") {
      const activity = activities.find(a => a.id === actionToRedo.activityId);
      if (activity) {
        await handleDeclineOffer(activity);
      }
    } else if (actionToRedo.type === "counterOffer") {
      const activity = activities.find(a => a.id === actionToRedo.activityId);
      if (activity) {
        setCounterOfferActivity(activity);
        setCounterOfferAmount(String(actionToRedo.amount));
        setShowCounterOfferModal(true);
        // The modal will handle the actual redo when saved
        return;
      }
    } else if (actionToRedo.type === "clientAcceptVendorCounter") {
      const activity = activities.find(a => a.id === actionToRedo.activityId);
      if (activity) {
        await handleClientAcceptVendorCounterOffer(activity);
      }
    } else if (actionToRedo.type === "clientRejectVendorCounter") {
      const activity = activities.find(a => a.id === actionToRedo.activityId);
      if (activity) {
        await handleClientRejectVendorCounterOffer(activity);
      }
    } else if (actionToRedo.type === "vendorAcceptClientCounter") {
      const activity = activities.find(a => a.id === actionToRedo.activityId);
      if (activity) {
        await handleVendorAcceptClientCounterOffer(activity);
      }
    } else if (actionToRedo.type === "vendorRejectClientCounter") {
      const activity = activities.find(a => a.id === actionToRedo.activityId);
      if (activity) {
        await handleVendorRejectClientCounterOffer(activity);
      }
    }
  };

  return (
    <div className="activity-log-container" style={{ marginTop: title ? "1.5rem" : "0" }}>
      <div className="activity-log-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: title ? "1.5rem" : "0", paddingTop: title ? "0.5rem" : "0", paddingBottom: title ? "0.5rem" : "0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
          {title && <h2 className="activity-log-title" style={{ margin: 0 }}>{title}</h2>}
          {(onNoteClick || onLogOfferClick || onPhoneCallNoteClick) && (
            <ActivityButton
              onNoteClick={onNoteClick}
              onLogOfferClick={onLogOfferClick}
              onPhoneCallNoteClick={onPhoneCallNoteClick}
            />
          )}
        </div>
        {(lastAction || undoneActions.length > 0) && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {lastAction && (
              <button
                type="button"
                onClick={handleUndo}
                className="undo-btn"
                style={{
                  padding: "0.5rem 1rem",
                  background: "#6c757d",
                  color: "white",
                  border: "1px solid #6c757d",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  transition: "all 0.2s ease"
                }}
              >
                Undo
              </button>
            )}
            {undoneActions.length > 0 && (
              <button
                type="button"
                onClick={handleRedo}
                className="redo-btn"
                style={{
                  padding: "0.5rem 1rem",
                  background: "#6c757d",
                  color: "white",
                  border: "1px solid #6c757d",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  transition: "all 0.2s ease"
                }}
              >
                Redo
              </button>
            )}
          </div>
        )}
      </div>
      <div className="activity-log-content">
        {isLoading ? (
          <div className="loading-state">Loading activity...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No activity logged yet.</p>
          </div>
        ) : (
          <div className="activity-timeline-wrapper">
            <div className="activity-tiles-container">
              {groupActivitiesByDate(filtered).map(([dateKey, dateActivities], dateGroupIndex) => (
                <div key={dateKey} className="activity-date-group">
                  <div className="activity-date-header">
                    {formatDate(dateActivities[0].timestamp)}
                  </div>
                  {dateActivities.map((activity, activityIndex) => {
                    // Determine if this is the last activity in the entire list
                    const allActivities = groupActivitiesByDate(filtered).flatMap(([_, acts]) => acts);
                    const isLastActivity = activity.id === allActivities[allActivities.length - 1]?.id;
                    const isLastInDateGroup = activityIndex === dateActivities.length - 1;
                    const isLastDateGroup = dateGroupIndex === groupActivitiesByDate(filtered).length - 1;
                    const showLineSegment = !isLastActivity;
                    // Calculate if we need to extend through a date header (if this is the last item in a date group and not the last date group)
                    const extendsThroughDateHeader = isLastInDateGroup && !isLastDateGroup;
                const isProperty = activity.entityType === "property";
                const isClient = activity.entityType === "client";
                const detailsText =
                  activity.type === "offer" && activity.details
                    ? `Offer: £${Number(activity.details).toLocaleString()}`
                    : activity.type === "fallenThrough" && activity.details
                    ? activity.details
                    : activity.details || "";

                const handlePropertyClick = () => {
                  if (!activity.entityName) return;
                  window.dispatchEvent(
                    new CustomEvent("openPropertyByName", {
                      detail: { name: activity.entityName },
                    })
                  );
                };

                const handleContactClick = () => {
                  if (!activity.entityName) return;
                  window.dispatchEvent(
                    new CustomEvent("openClientByName", {
                      detail: { name: activity.entityName },
                    })
                  );
                };

                // For offers, notes, and fallenThrough, show clientName, propertyName, and professionalName if available
                // When clientName, propertyName, or professionalName are set, always show them regardless of which page we're viewing
                const displayClientName = (activity.type === "offer" || activity.type === "fallenThrough" || activity.type === "note" || activity.type === "phoneCall") && activity.clientName 
                  ? activity.clientName 
                  : (isClient ? activity.entityName : null);
                const displayPropertyName = (activity.type === "offer" || activity.type === "fallenThrough" || activity.type === "note" || activity.type === "phoneCall") && activity.propertyName 
                  ? activity.propertyName 
                  : (isProperty ? activity.entityName : null);
                const displayProfessionalName = (activity.type === "note" || activity.type === "phoneCall") && activity.professionalName 
                  ? activity.professionalName 
                  : (activity.entityType === "professional" ? activity.entityName : null);

                // Check if this pending offer has been acted upon (has a subsequent Accepted/Rejected/Cancelled entry)
                const hasBeenActedUpon = activity.type === "offer" && activity.status === "Pending" && 
                  activities.some(a => 
                    a.type === "offer" &&
                    (a.status === "Accepted" || a.status === "Rejected" || a.status === "Cancelled") &&
                    a.clientName === activity.clientName &&
                    a.propertyName === activity.propertyName &&
                    Number(a.details) === Number(activity.details) &&
                    a.createdAt > activity.createdAt
                  );
                
                // Check if vendor counter offer has been acted upon
                const vendorCounterOfferActedUpon = activity.type === "offer" && activity.status === "Vendor Counter Offer" &&
                  activities.some(a =>
                    a.type === "offer" &&
                    (a.status === "Client Accepted" || a.status === "Client Rejected") &&
                    a.clientName === activity.clientName &&
                    a.propertyName === activity.propertyName &&
                    Number(a.details) === Number(activity.details) &&
                    a.createdAt > activity.createdAt
                  );
                
                // Check if client counter offer has been acted upon
                const clientCounterOfferActedUpon = activity.type === "offer" && activity.status === "Client Counter Offer" &&
                  activities.some(a =>
                    a.type === "offer" &&
                    (a.status === "Vendor Accepted" || a.status === "Vendor Rejected") &&
                    a.clientName === activity.clientName &&
                    a.propertyName === activity.propertyName &&
                    Number(a.details) === Number(activity.details) &&
                    a.createdAt > activity.createdAt
                  );

                    return (
                      <div key={activity.id} className="activity-tile-wrapper">
                        {showLineSegment && (
                          <div 
                            className="activity-timeline-segment"
                            data-extends-through-header={extendsThroughDateHeader}
                          ></div>
                        )}
                        <div className="activity-timeline-time">{formatTime(activity.timestamp)}</div>
                        <div className="activity-timeline-circle"></div>
                        <div className="activity-tile">
                          <div className="activity-tile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="activity-tile-type">{getTypeLabel(activity)}</span>
                            {(activity.type === "note" || activity.type === "phoneCall") && (
                              <div style={{ position: 'relative' }} ref={el => menuRefs.current[activity.id] = el}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === activity.id ? null : activity.id);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    fontSize: '1.5rem',
                                    color: '#666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  ⋯
                                </button>
                                {openMenuId === activity.id && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      right: 0,
                                      background: 'white',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                      zIndex: 1000,
                                      minWidth: '120px',
                                      marginTop: '0.25rem'
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditNote(activity);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem 1rem',
                                        textAlign: 'left',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#333',
                                        fontSize: '0.875rem',
                                        borderBottom: '1px solid #eee'
                                      }}
                                      onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                                      onMouseLeave={(e) => e.target.style.background = 'white'}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditNote(activity);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem 1rem',
                                        textAlign: 'left',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#333',
                                        fontSize: '0.875rem',
                                        borderBottom: '1px solid #eee'
                                      }}
                                      onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                                      onMouseLeave={(e) => e.target.style.background = 'white'}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNote(activity);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem 1rem',
                                        textAlign: 'left',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#dc3545',
                                        fontSize: '0.875rem'
                                      }}
                                      onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                                      onMouseLeave={(e) => e.target.style.background = 'white'}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="activity-tile-content">
                            <div className="activity-tile-row">
                              {displayClientName && (
                                <div className="activity-tile-field">
                                  <span className="activity-tile-label">Client:</span>
                                  <button
                                    type="button"
                                    className="activity-entity-pill"
                                    onClick={() => {
                                      window.dispatchEvent(
                                        new CustomEvent("openClientByName", {
                                          detail: { name: displayClientName },
                                        })
                                      );
                                    }}
                                  >
                                    {displayClientName}
                                  </button>
                                </div>
                              )}
                              {displayPropertyName && (
                                <div className="activity-tile-field">
                                  <span className="activity-tile-label">Property:</span>
                                  <button
                                    type="button"
                                    className="activity-entity-pill"
                                    onClick={() => {
                                      window.dispatchEvent(
                                        new CustomEvent("openPropertyByName", {
                                          detail: { name: displayPropertyName },
                                        })
                                      );
                                    }}
                                  >
                                    {displayPropertyName}
                                  </button>
                                </div>
                              )}
                              {displayProfessionalName && (
                                <div className="activity-tile-field">
                                  <span className="activity-tile-label">Professional:</span>
                                  <button
                                    type="button"
                                    className="activity-entity-pill"
                                    onClick={() => {
                                      window.dispatchEvent(
                                        new CustomEvent("openClientByName", {
                                          detail: { name: displayProfessionalName },
                                        })
                                      );
                                    }}
                                  >
                                    {displayProfessionalName}
                                  </button>
                                </div>
                              )}
                            </div>
                            {detailsText && (
                              <div className="activity-tile-details">
                                {detailsText}
                              </div>
                            )}
                            {activity.status && !(activity.type === "offer" && activity.status === "Pending" && hasBeenActedUpon) && 
                             !(activity.type === "offer" && activity.status === "Vendor Counter Offer" && vendorCounterOfferActedUpon) &&
                             !(activity.type === "offer" && activity.status === "Client Counter Offer" && clientCounterOfferActedUpon) && (
                              <div className="activity-tile-status">
                                <span style={{ color: "#333" }}>Status: </span>
                                <span style={{ 
                                  color: activity.status === "Accepted" || activity.status === "Client Accepted" || activity.status === "Vendor Accepted" ? "#28a745" : 
                                         (activity.status === "Rejected" || activity.status === "Cancelled" || activity.status === "Client Rejected" || activity.status === "Vendor Rejected") ? "#dc3545" : 
                                         "#007bff" 
                                }}>
                                  {activity.status}
                                </span>
                              </div>
                            )}
                            <div className="activity-tile-actions">
                              {/* Show Accepted/Rejected buttons for pending offers that haven't been acted upon */}
                              {activity.type === "offer" && activity.status === "Pending" && !hasBeenActedUpon && (
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    type="button"
                                    className="accept-btn"
                                    onClick={() => handleAcceptOffer(activity)}
                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                  >
                                    Accepted
                                  </button>
                                  <button
                                    type="button"
                                    className="decline-btn"
                                    onClick={() => handleDeclineOffer(activity)}
                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                  >
                                    Rejected
                                  </button>
                                </div>
                              )}
                              {/* Show Client Accepted/Rejected buttons for vendor counter offers */}
                              {activity.type === "offer" && activity.status === "Vendor Counter Offer" && !vendorCounterOfferActedUpon && (
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    type="button"
                                    className="accept-btn"
                                    onClick={() => handleClientAcceptVendorCounterOffer(activity)}
                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                  >
                                    Client Accepted
                                  </button>
                                  <button
                                    type="button"
                                    className="decline-btn"
                                    onClick={() => handleClientRejectVendorCounterOffer(activity)}
                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                  >
                                    Client Rejected
                                  </button>
                                </div>
                              )}
                              {/* Show Vendor Accepted/Rejected buttons for client counter offers */}
                              {activity.type === "offer" && activity.status === "Client Counter Offer" && !clientCounterOfferActedUpon && (
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    type="button"
                                    className="accept-btn"
                                    onClick={() => handleVendorAcceptClientCounterOffer(activity)}
                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                  >
                                    Vendor Accepted
                                  </button>
                                  <button
                                    type="button"
                                    className="decline-btn"
                                    onClick={() => handleVendorRejectClientCounterOffer(activity)}
                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                  >
                                    Vendor Rejected
                                  </button>
                                </div>
                              )}
                              {/* Show Client Counter Offer button for client rejected vendor counter offers */}
                              {activity.type === "offer" && activity.status === "Client Rejected" && 
                               (() => {
                                 // Check if this Client Rejected is for a Vendor Counter Offer
                                 const vendorCounterOffer = activities.find(a => 
                                   a.type === "offer" &&
                                   a.status === "Vendor Counter Offer" &&
                                   a.clientName === activity.clientName &&
                                   a.propertyName === activity.propertyName &&
                                   Number(a.details) === Number(activity.details) &&
                                   a.createdAt < activity.createdAt
                                 );
                                 // Also check if there's already a Client Counter Offer for this rejection
                                 const hasClientCounterOffer = activities.some(a =>
                                   a.type === "offer" &&
                                   a.status === "Client Counter Offer" &&
                                   a.clientName === activity.clientName &&
                                   a.propertyName === activity.propertyName &&
                                   a.createdAt > activity.createdAt
                                 );
                                 return vendorCounterOffer && !hasClientCounterOffer;
                               })() && (
                                <button
                                  type="button"
                                  className="offer-btn"
                                  onClick={() => {
                                    setCounterOfferActivity(activity);
                                    setShowCounterOfferModal(true);
                                  }}
                                  style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                >
                                  Client Counter Offer
                                </button>
                              )}
                              {/* Show Vendor Counter Offer button for vendor rejected client counter offers */}
                              {activity.type === "offer" && activity.status === "Vendor Rejected" && 
                               (() => {
                                 // Check if this Vendor Rejected is for a Client Counter Offer
                                 const clientCounterOffer = activities.find(a => 
                                   a.type === "offer" &&
                                   a.status === "Client Counter Offer" &&
                                   a.clientName === activity.clientName &&
                                   a.propertyName === activity.propertyName &&
                                   Number(a.details) === Number(activity.details) &&
                                   a.createdAt < activity.createdAt
                                 );
                                 // Also check if there's already a Vendor Counter Offer for this rejection
                                 const hasVendorCounterOffer = activities.some(a =>
                                   a.type === "offer" &&
                                   a.status === "Vendor Counter Offer" &&
                                   a.clientName === activity.clientName &&
                                   a.propertyName === activity.propertyName &&
                                   a.createdAt > activity.createdAt
                                 );
                                 return clientCounterOffer && !hasVendorCounterOffer;
                               })() && (
                                <button
                                  type="button"
                                  className="offer-btn"
                                  onClick={() => {
                                    setCounterOfferActivity(activity);
                                    setShowCounterOfferModal(true);
                                  }}
                                  style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                >
                                  Vendor Counter Offer
                                </button>
                              )}
                              {/* Show counter offer button for rejected offers (original client offers) */}
                              {activity.type === "offer" && activity.status === "Rejected" && 
                               !activities.some(a => 
                                 a.type === "offer" &&
                                 a.status === "Vendor Counter Offer" &&
                                 a.clientName === activity.clientName &&
                                 a.propertyName === activity.propertyName &&
                                 a.createdAt > activity.createdAt
                               ) &&
                               !activities.some(a =>
                                 a.type === "offer" &&
                                 a.status === "Client Counter Offer" &&
                                 a.clientName === activity.clientName &&
                                 a.propertyName === activity.propertyName &&
                                 a.createdAt > activity.createdAt
                               ) && (
                                <button
                                  type="button"
                                  className="offer-btn"
                                  onClick={() => {
                                    setCounterOfferActivity(activity);
                                    setShowCounterOfferModal(true);
                                  }}
                                  style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                >
                                  Vendor Counter Offer
                                </button>
                              )}
                              {/* Show "View in Sales Progression" button for accepted offers */}
                              {activity.type === "offer" && activity.status === "Accepted" && (
                                <button
                                  type="button"
                                  className="sales-progression-btn"
                                  onClick={() => {
                                    window.dispatchEvent(
                                      new CustomEvent("openSalesProgression", {
                                        detail: { 
                                          clientName: activity.clientName,
                                          propertyName: activity.propertyName 
                                        },
                                      })
                                    );
                                  }}
                                  style={{ 
                                    padding: "0.25rem 0.75rem", 
                                    fontSize: "0.875rem",
                                    background: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                  }}
                                >
                                  View in Sales Progression
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Note Modal */}
      <LogNoteModal
        isOpen={showEditNoteModal}
        onClose={() => {
          setShowEditNoteModal(false);
          setEditingNote(null);
        }}
        clients={clients}
        properties={properties}
        professionals={professionals}
        title="Edit Note"
        editingNote={editingNote}
        onSave={async ({ client, property, professional, note, timestamp, isEdit, activityId, originalTimestamp }) => {
          if (!isEdit) return;
          
          const { updateClientById } = await import("./lib/clientsApi");
          const { updatePropertyById } = await import("./lib/propertiesApi");

          // Update note in all linked clients
          if (editingNote?.clientName) {
            const clientsToUpdate = clients.filter(c => c.name === editingNote.clientName);
            for (const clientToUpdate of clientsToUpdate) {
              if (clientToUpdate.id && Array.isArray(clientToUpdate.notes)) {
                // Update note matching original timestamp and details
                const updatedNotes = clientToUpdate.notes.map(noteItem => 
                  (noteItem.date === originalTimestamp && noteItem.text === editingNote.noteText)
                    ? { date: timestamp, text: note }
                    : noteItem
                );
                await updateClientById(clientToUpdate.id, { notes: updatedNotes });
              }
            }
          }

          // Update note in all linked properties
          if (editingNote?.propertyName) {
            const propertiesToUpdate = properties.filter(p => p.name === editingNote.propertyName);
            for (const propertyToUpdate of propertiesToUpdate) {
              if (propertyToUpdate.id && Array.isArray(propertyToUpdate.notes)) {
                // Update note matching original timestamp and details
                const updatedNotes = propertyToUpdate.notes.map(noteItem => 
                  (noteItem.date === originalTimestamp && noteItem.text === editingNote.noteText)
                    ? { date: timestamp, text: note }
                    : noteItem
                );
                await updatePropertyById(propertyToUpdate.id, { notes: updatedNotes });
              }
            }
          }

          // Update the activity log entry
          if (activityId) {
            const updateData = {
              details: note,
              timestamp: timestamp
            };
            // Update professionalName if professional is selected
            if (professional) {
              updateData.professionalName = professional.name;
            } else if (editingNote?.professionalName) {
              // Preserve professionalName if it was in the original activity and not being changed
              updateData.professionalName = editingNote.professionalName;
            }
            // Update clientName and propertyName if changed
            if (client) {
              updateData.clientName = client.name;
            } else if (editingNote?.clientName) {
              updateData.clientName = editingNote.clientName;
            }
            if (property) {
              updateData.propertyName = property.name;
            } else if (editingNote?.propertyName) {
              updateData.propertyName = editingNote.propertyName;
            }
            await updateActivityLog(activityId, updateData);
          }

          setShowEditNoteModal(false);
          setEditingNote(null);
        }}
      />

      {/* Counter Offer Modal */}
      {showCancelOtherOffersModal && pendingAcceptOffer && otherPendingOffers.length > 0 && createPortal(
        <div 
          className="modal-overlay" 
          onClick={() => {
            setShowCancelOtherOffersModal(false);
            setPendingAcceptOffer(null);
            setOtherPendingOffers([]);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "10px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 5px 20px rgba(0, 0, 0, 0.3)"
            }}
          >
            <button
              type="button"
              className="close-button"
              onClick={() => {
                setShowCancelOtherOffersModal(false);
                setPendingAcceptOffer(null);
                setOtherPendingOffers([]);
              }}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                color: "#666",
                cursor: "pointer",
                padding: "0",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.target.style.background = "#f0f0f0"}
              onMouseLeave={(e) => e.target.style.background = "none"}
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, marginRight: "2rem" }}>Cancel Other Offers?</h3>
            <p>
              Would you like to cancel the other offers on Properties:{" "}
              {otherPendingOffers.map((offer, index) => (
                <span key={offer.id}>
                  {offer.propertyName}
                  {index < otherPendingOffers.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                className="save-btn"
                onClick={() => proceedWithAcceptOffer(pendingAcceptOffer, true)}
              >
                Yes, cancel other offers
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => proceedWithAcceptOffer(pendingAcceptOffer, false)}
              >
                No, keep them pending
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCounterOfferModal && counterOfferActivity && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{counterOfferActivity.status === "Client Rejected" ? "Client Counter Offer" : "Vendor Counter Offer"}</h3>
            <div className="form-group">
              <label>Counter Offer Amount (£)</label>
              <input
                type="text"
                placeholder="Enter counter offer amount"
                value={formatCurrencyInput(counterOfferAmount)}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                  setCounterOfferAmount(digitsOnly);
                }}
              />
            </div>
            <div className="modal-buttons">
              <button
                className="save-btn"
                onClick={handleCounterOffer}
                disabled={!counterOfferAmount}
              >
                Log Counter Offer
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowCounterOfferModal(false);
                  setCounterOfferActivity(null);
                  setCounterOfferAmount("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EntityActivityLog;


