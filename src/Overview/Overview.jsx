import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { subscribeToActivityLog, logActivity, updateActivityLog, deleteActivityLog } from "../lib/activityLogApi";
import LogOfferModal from "../LogOfferModal";
import LogNoteModal from "../LogNoteModal";
import ActivityButton from "../ActivityButton";
import ThisMonthRevenueChart from "./ThisMonthRevenueChart";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid, faUser, faHouse, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import "./Overview.css";

function Overview({ 
  clients = [], 
  properties = [], 
  professionals = [],
  salesProgressions = [],
  updateClientStatus,
  createNewSalesProgression,
  removeSalesProgressionRow
}) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAction, setLastAction] = useState(null);
  const [undoneActions, setUndoneActions] = useState([]); // Stack of undone actions for redo
  
  // Activity modals state
  const [showLogOfferModal, setShowLogOfferModal] = useState(false);
  const [showLogNoteModal, setShowLogNoteModal] = useState(false);
  const [showPhoneCallModal, setShowPhoneCallModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});
  
  // Collapsible tiles state
  const [clientsSearchingCollapsed, setClientsSearchingCollapsed] = useState(false);
  const [propertiesOffMarketCollapsed, setPropertiesOffMarketCollapsed] = useState(false);
  const [activityLogCollapsed, setActivityLogCollapsed] = useState(false);

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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown date";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return timestamp;
    }
  };

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
    activities.forEach(activity => {
      if (!activity.timestamp) return;
      const date = new Date(activity.timestamp);
      const dateKey = date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });
    // Sort dates descending (newest first)
    return Object.entries(grouped).sort((a, b) => {
      return new Date(b[0]) - new Date(a[0]);
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "note":
        return "📝";
      case "offer":
        return "💰";
      default:
        return "📌";
    }
  };

  const getActivityLabel = (activity) => {
    if (activity.type === "note") {
      return `Note added on ${activity.entityType === "client" ? "client" : "property"} profile`;
    } else if (activity.type === "fallenThrough") {
      return "Deal Fallen Through";
    } else if (activity.type === "offer") {
      return `Offer made on ${activity.entityType === "client" ? "client" : "property"} profile`;
    }
    return "Activity";
  };

  const filteredActivities = activities;

  const formatCurrencyInput = (value) => {
    const numericValue = value.replace(/[^\d]/g, "");
    return numericValue ? "£" + Number(numericValue).toLocaleString("en-UK") : "";
  };

  // Helper function to check if a sales progression client name matches a client
  const matchesClient = (spClientName, client) => {
    // Direct match
    if (spClientName === client.name) return true;
    
    // Check formatted names
    if (client.spouse1FirstName && client.spouse2FirstName) {
      const bothFirstNames = `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
      if (spClientName === bothFirstNames || 
          (client.spouse1Surname && spClientName === `${bothFirstNames} ${client.spouse1Surname}`)) {
        return true;
      }
    }
    if (client.spouse1FirstName) {
      const singleName = client.spouse1Surname 
        ? `${client.spouse1FirstName} ${client.spouse1Surname}` 
        : client.spouse1FirstName;
      if (spClientName === singleName) return true;
    }
    return false;
  };

  // Get clients under offer
  const clientsUnderOffer = clients.filter(c => c.status === "Under Offer");

  // Helper function to find the next step in sales progression sequence
  const getNextStep = (progression) => {
    const sequence = [
      { field: 'contractSent', label: 'Send Contract' },
      { field: 'contractSigned', label: 'Sign Contract' },
      { field: 'clientIdDocument', label: 'Send Client ID' },
      { field: 'aml', label: 'AML' },
      { field: 'solicitorRecommended', label: 'Recommend Solicitor' },
      { field: 'solicitorEngaged', label: 'Engage Solicitor' },
      { field: 'mortgageAdvisorRecommended', label: 'Recommend Mortgage Advisor' },
      { field: 'mortgageValBooked', label: 'Book Mortgage Valuation' },
      { field: 'mortgageOfferReceived', label: 'Receive Mortgage Offer' },
      { field: 'surveyorRecommended', label: 'Recommend Surveyor' },
      { field: 'surveyBooked', label: 'Book Survey' },
      { field: 'sdltAdvisorRecommended', label: 'Recommend SDLT Advisor' },
      { field: 'targetExchangeDate', label: 'Target Exchange Date' },
      { field: 'targetCompletionDate', label: 'Target Completion Date' },
      { field: 'removalsRecommended', label: 'Recommend Removals' },
      { field: 'removalsBooked', label: 'Book Removals' },
      { field: 'exchangeDateSet', label: 'Set Exchange Date' },
      { field: 'completionDateSet', label: 'Set Completion Date' },
      { field: 'invoiceSent', label: 'Send Invoice' },
      { field: 'exchanged', label: 'Exchange' },
      { field: 'completed', label: 'Complete' },
      { field: 'paymentExpected', label: 'Payment Expected' },
      { field: 'invoicePaid', label: 'Receive Invoice' }
    ];

    for (const step of sequence) {
      const value = progression[step.field];
      // Check if it's "Not Done" or empty (for dates)
      if (value === "Not Done" || value === "" || value === null || value === undefined) {
        return step.label;
      }
    }
    return null; // All steps completed
  };

  // Get active deals in sales progression (not completed, not fallen through)
  const activeDeals = salesProgressions.filter(sp => 
    !sp.dealComplete && !sp.fallenThrough
  );

  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [counterOfferActivity, setCounterOfferActivity] = useState(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState("");
  const [showCancelOtherOffersModal, setShowCancelOtherOffersModal] = useState(false);
  const [pendingAcceptOffer, setPendingAcceptOffer] = useState(null);
  const [otherPendingOffers, setOtherPendingOffers] = useState([]);

  const handleAcceptOffer = async (activity) => {
    const clientName = activity.clientName;
    const propertyName = activity.propertyName || activity.entityName;
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

  const handleDeleteNote = async (activity) => {
    if (!window.confirm("Are you sure you want to delete this note? This will remove it from all linked clients and properties.")) {
      return;
    }

    const { updateClientById } = await import("../lib/clientsApi");
    const { updatePropertyById } = await import("../lib/propertiesApi");

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
      propertyName: activity.propertyName
    });
    setShowEditNoteModal(true);
    setOpenMenuId(null);
  };

  const proceedWithAcceptOffer = async (activity, cancelOtherOffers = false) => {
    const clientName = activity.clientName;
    const propertyName = activity.propertyName || activity.entityName;
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Cancel other pending offers if requested
    if (cancelOtherOffers && otherPendingOffers.length > 0) {
      for (const otherOffer of otherPendingOffers) {
        const otherPropertyName = otherOffer.propertyName;
        const otherAmount = Number(otherOffer.details);

        // Update property offer status to rejected
        if (otherPropertyName) {
          const otherProperty = properties.find(p => p.name === otherPropertyName);
          if (otherProperty?.id) {
            const { updatePropertyById } = await import("../lib/propertiesApi");
            const offers = Array.isArray(otherProperty.offers) ? [...otherProperty.offers] : [];
            if (offers.length > 0) {
              offers[offers.length - 1] = { ...offers[offers.length - 1], status: "Cancelled" };
            }
            await updatePropertyById(otherProperty.id, {
              offerAmount: null,
              offerStatus: "None",
              offers: offers,
              setLastOfferStatus: "Cancelled"
            });
          }
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
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      const offers = Array.isArray(property.offers) ? [...property.offers] : [];
      if (offers.length > 0) {
        offers[offers.length - 1] = { ...offers[offers.length - 1], status: "Accepted" };
      }
      await updatePropertyById(property.id, {
        offerAmount: amount,
        offerStatus: "Accepted",
        offers: offers
      });
    }

    // Update client status
    if (updateClientStatus) {
      await updateClientStatus(clientName, "Matched");
    }

    // Create sales progression
    if (createNewSalesProgression) {
      await createNewSalesProgression(clientName, propertyName);
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
    const clientName = activity.clientName;
    const propertyName = activity.propertyName || activity.entityName;
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
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      const offers = Array.isArray(property.offers) ? [...property.offers] : [];
      if (offers.length > 0) {
        offers[offers.length - 1] = { ...offers[offers.length - 1], status: "Rejected" };
      }
      await updatePropertyById(property.id, {
        offerAmount: null,
        offerStatus: "None",
        offers: offers
      });
    }

    // Update client status
    if (updateClientStatus) {
      await updateClientStatus(clientName, "Searching");
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
    const clientName = activity.clientName;
    const propertyName = activity.propertyName || activity.entityName;
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Update property offer status to Accepted
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      const offers = Array.isArray(property.offers) ? [...property.offers] : [];
      if (offers.length > 0) {
        offers[offers.length - 1] = { ...offers[offers.length - 1], status: "Accepted" };
      }
      await updatePropertyById(property.id, {
        offerAmount: amount,
        offerStatus: "Accepted",
        offers: offers
      });
    }

    // Update client status
    if (updateClientStatus) {
      await updateClientStatus(clientName, "Matched");
    }

    // Create sales progression
    if (createNewSalesProgression) {
      await createNewSalesProgression(clientName, propertyName);
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
    const clientName = activity.clientName;
    const propertyName = activity.propertyName || activity.entityName;
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Update property offer status
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      const offers = Array.isArray(property.offers) ? [...property.offers] : [];
      if (offers.length > 0) {
        offers[offers.length - 1] = { ...offers[offers.length - 1], status: "Rejected" };
      }
      await updatePropertyById(property.id, {
        offerAmount: null,
        offerStatus: "None",
        offers: offers
      });
    }

    // Update client status
    if (updateClientStatus) {
      await updateClientStatus(clientName, "Searching");
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
    const clientName = activity.clientName;
    const propertyName = activity.propertyName || activity.entityName;
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Update property offer status to Accepted
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      const offers = Array.isArray(property.offers) ? [...property.offers] : [];
      if (offers.length > 0) {
        offers[offers.length - 1] = { ...offers[offers.length - 1], status: "Accepted" };
      }
      await updatePropertyById(property.id, {
        offerAmount: amount,
        offerStatus: "Accepted",
        offers: offers
      });
    }

    // Update client status
    if (updateClientStatus) {
      await updateClientStatus(clientName, "Matched");
    }

    // Create sales progression
    if (createNewSalesProgression) {
      await createNewSalesProgression(clientName, propertyName);
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
    const clientName = activity.clientName;
    const propertyName = activity.propertyName || activity.entityName;
    const amount = Number(activity.details);

    if (!clientName || !propertyName) return;

    // Store previous state for undo
    const property = properties.find(p => p.name === propertyName);
    const client = clients.find(c => c.name === clientName);
    const previousClientStatus = client?.status || null;
    const previousPropertyStatus = property?.status || null;
    const previousOfferStatus = property?.offerStatus || null;

    // Update property offer status
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      const offers = Array.isArray(property.offers) ? [...property.offers] : [];
      if (offers.length > 0) {
        offers[offers.length - 1] = { ...offers[offers.length - 1], status: "Rejected" };
      }
      await updatePropertyById(property.id, {
        offerAmount: null,
        offerStatus: "None",
        offers: offers
      });
    }

    // Update client status
    if (updateClientStatus) {
      await updateClientStatus(clientName, "Searching");
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

    const clientName = counterOfferActivity.clientName;
    const propertyName = counterOfferActivity.propertyName || counterOfferActivity.entityName;
    const amount = Number(numericAmount);

    if (!clientName || !propertyName) return;

    // Update property offer
    const property = properties.find(p => p.name === propertyName);
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      const offers = Array.isArray(property.offers) ? [...property.offers] : [];
      offers.push({
        date: new Date().toISOString(),
        amount: amount,
        status: "Pending"
      });
      await updatePropertyById(property.id, {
        offerAmount: amount,
        offerStatus: "Pending",
        offers: offers
      });
    }

    // Update client status
    if (updateClientStatus) {
      await updateClientStatus(clientName, "Under Offer");
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
      const property = properties.find(p => p.name === lastAction.propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import("../lib/propertiesApi");
        await updatePropertyById(property.id, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount,
          status: lastAction.previousPropertyStatus || property.status
        });
      }

      if (updateClientStatus && lastAction.previousClientStatus) {
        await updateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }

      // Remove sales progression if it was created
      // Use displayClientName if available (formatted name used in sales progression), otherwise fall back to clientName
      if (removeSalesProgressionRow && lastAction.hasSalesProgression) {
        const clientNameForRemoval = lastAction.displayClientName || lastAction.clientName;
        await removeSalesProgressionRow(lastAction.propertyName, clientNameForRemoval);
      }
    } else if (lastAction.type === "decline") {
      // Delete the Rejected entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      const property = properties.find(p => p.name === lastAction.propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import("../lib/propertiesApi");
        await updatePropertyById(property.id, {
          offerStatus: "Pending",
          offerAmount: lastAction.previousOfferAmount || lastAction.amount
        });
      }

      if (updateClientStatus && lastAction.previousClientStatus) {
        await updateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }
    } else if (lastAction.type === "counterOffer") {
      // Delete the Counter Offer entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Remove the counter offer from property
      const property = properties.find(p => p.name === lastAction.propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import("../lib/propertiesApi");
        const offers = Array.isArray(property.offers) ? [...property.offers] : [];
        if (offers.length > 0 && offers[offers.length - 1].amount === lastAction.amount) {
          offers.pop();
          await updatePropertyById(property.id, {
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
      const property = properties.find(p => p.name === lastAction.propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import("../lib/propertiesApi");
        await updatePropertyById(property.id, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount,
          status: lastAction.previousPropertyStatus || property.status
        });
      }

      if (updateClientStatus && lastAction.previousClientStatus) {
        await updateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }

      // Remove sales progression if it was created
      if (removeSalesProgressionRow && lastAction.hasSalesProgression) {
        await removeSalesProgressionRow(lastAction.propertyName, lastAction.clientName);
      }
    } else if (lastAction.type === "clientRejectVendorCounter") {
      // Delete the Client Rejected entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      const property = properties.find(p => p.name === lastAction.propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import("../lib/propertiesApi");
        await updatePropertyById(property.id, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount,
          status: lastAction.previousPropertyStatus || property.status
        });
      }

      if (updateClientStatus && lastAction.previousClientStatus) {
        await updateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }
    } else if (lastAction.type === "vendorAcceptClientCounter") {
      // Delete the Vendor Accepted entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      const property = properties.find(p => p.name === lastAction.propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import("../lib/propertiesApi");
        await updatePropertyById(property.id, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount,
          status: lastAction.previousPropertyStatus || property.status
        });
      }

      if (updateClientStatus && lastAction.previousClientStatus) {
        await updateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
      }

      // Remove sales progression if it was created
      if (removeSalesProgressionRow && lastAction.hasSalesProgression) {
        await removeSalesProgressionRow(lastAction.propertyName, lastAction.clientName);
      }
    } else if (lastAction.type === "vendorRejectClientCounter") {
      // Delete the Vendor Rejected entry
      if (actionEntry?.id) {
        await deleteActivityLog(actionEntry.id);
      }

      // Revert property and client status
      const property = properties.find(p => p.name === lastAction.propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import("../lib/propertiesApi");
        await updatePropertyById(property.id, {
          offerStatus: lastAction.previousOfferStatus || "Pending",
          offerAmount: lastAction.amount,
          status: lastAction.previousPropertyStatus || property.status
        });
      }

      if (updateClientStatus && lastAction.previousClientStatus) {
        await updateClientStatus(lastAction.clientName, lastAction.previousClientStatus);
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
    }
  };

  // Calculate counts for dynamic height
  const searchingClients = clients
    .filter(c => !c.archived && c.favourite);
  const hotProperties = properties
    .filter(p => !p.archived && p.favourite);
  
  const clientsCount = searchingClients.length;
  const propertiesCount = hotProperties.length;
  // Max between the two, capped at 7
  const maxItems = Math.min(7, Math.max(clientsCount, propertiesCount));
  
  // Calculate height: maxItems * (tile height + padding + gap) + header height
  // Each tile: 40px (min-height) + 0.75rem * 2 (padding) + 0.5rem (gap) = 40px + 1.5rem + 0.5rem
  // Header: 36px
  const tileHeight = maxItems > 0 
    ? `calc(${maxItems} * (40px + 0.75rem * 2 + 0.5rem) + 36px)`
    : 'auto';

  return (
    <div className="overview-page">
      <div className="overview-inner">
        {/* Top row: Clients Searching and Properties Off Market */}
        <div className="overview-top-tiles">
          {/* Clients Searching */}
          <div className="overview-tile" style={{ padding: "1.5rem 0.75rem" }}>
            <h3 className="overview-tile-title" style={{ marginBottom: clientsSearchingCollapsed ? "0" : "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                <FontAwesomeIcon icon={faUser} style={{ color: "#555", marginRight: "0.5rem" }} />
                Active Clients
              </span>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                style={{ 
                  color: "#555", 
                  cursor: "pointer",
                  transform: clientsSearchingCollapsed ? "rotate(-180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}
                onClick={() => {
                  const newState = !clientsSearchingCollapsed;
                  setClientsSearchingCollapsed(newState);
                  setPropertiesOffMarketCollapsed(newState);
                }}
              />
            </h3>
            {!clientsSearchingCollapsed && (() => {
              const sortedClients = searchingClients
                .sort((a, b) => {
                  // Favourited items first
                  if (a.favourite && !b.favourite) return -1;
                  if (!a.favourite && b.favourite) return 1;
                  return 0;
                });
              const formatClientName = (client) => {
                if (client.spouse1FirstName) {
                  if (client.spouse2FirstName) {
                    return client.spouse1Surname
                      ? `${client.spouse1FirstName} and ${client.spouse2FirstName} ${client.spouse1Surname}`
                      : `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
                  }
                  if (client.spouse1Surname) return `${client.spouse1FirstName} ${client.spouse1Surname}`;
                  return client.spouse1FirstName;
                }
                return client.name || "Unknown";
              };
              return sortedClients.length === 0 ? (
                <div className="empty-row">No favourited clients</div>
              ) : (
                <div 
                  className="clients-tiles-container overview-tiles-scrollable" 
                  style={{ 
                    "--grid-cols": "50px 2fr 1.2fr 1.2fr 50px",
                    minHeight: tileHeight,
                    maxHeight: clientsCount > 7 ? tileHeight : 'none',
                    overflowY: clientsCount > 7 ? 'auto' : 'visible'
                  }}
                >
                  <div className="clients-table-header-row">
                    <div className="client-tile-column-header"></div>
                    <div className="client-tile-column-header">Name</div>
                    <div className="client-tile-column-header">Max Budget</div>
                    <div className="client-tile-column-header">Phone</div>
                    <div className="client-tile-column-header"></div>
                  </div>
                  {sortedClients.map((client) => (
                    <div
                      key={client.id || client.name}
                      className="client-tile clickable-row"
                      style={{ "--grid-cols": "50px 2fr 1.2fr 1.2fr 50px" }}
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("openClientByName", {
                            detail: { name: client.name },
                          })
                        );
                      }}
                    >
                      <div className="client-tile-favourite" onClick={(e) => { e.stopPropagation(); }}>
                        <button
                          aria-label={client.favourite ? 'Unfavourite' : 'Favourite'}
                          className="icon-button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const { updateClientById } = await import('../lib/clientsApi');
                            await updateClientById(client.id, { favourite: !client.favourite });
                          }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          <FontAwesomeIcon icon={client.favourite ? faHeartSolid : faHeartRegular} style={{ color: '#555555', width: '18px', height: '18px' }} />
                        </button>
                      </div>
                      <div className="client-tile-name">{formatClientName(client)}</div>
                      <div className="client-tile-budget">{client.maxBudget ? `£${Number(client.maxBudget).toLocaleString()}` : "Not Specified"}</div>
                      <div className="client-tile-phone">{client.phoneNumber || "—"}</div>
                      <div className="client-tile-actions"></div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Hot Properties */}
          <div className="overview-tile" style={{ padding: "1.5rem 0.75rem" }}>
            <h3 className="overview-tile-title" style={{ marginBottom: propertiesOffMarketCollapsed ? "0" : "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                <FontAwesomeIcon icon={faHouse} style={{ color: "#555", marginRight: "0.5rem" }} />
                Hot Properties
              </span>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                style={{ 
                  color: "#555", 
                  cursor: "pointer",
                  transform: propertiesOffMarketCollapsed ? "rotate(-180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}
                onClick={() => {
                  const newState = !propertiesOffMarketCollapsed;
                  setClientsSearchingCollapsed(newState);
                  setPropertiesOffMarketCollapsed(newState);
                }}
              />
            </h3>
            {!propertiesOffMarketCollapsed && (() => {
              const sortedProperties = hotProperties
                .sort((a, b) => {
                  // Favourited items first
                  if (a.favourite && !b.favourite) return -1;
                  if (!a.favourite && b.favourite) return 1;
                  return 0;
                });
              return sortedProperties.length === 0 ? (
                <div className="empty-row">No favourited properties</div>
              ) : (
                <div 
                  className="properties-tiles-container overview-tiles-scrollable" 
                  style={{ 
                    "--grid-cols": "50px 1.5fr 1.2fr 1fr 50px",
                    minHeight: tileHeight,
                    maxHeight: propertiesCount > 7 ? tileHeight : 'none',
                    overflowY: propertiesCount > 7 ? 'auto' : 'visible'
                  }}
                >
                  <div className="properties-table-header-row">
                    <div className="property-tile-column-header"></div>
                    <div className="property-tile-column-header">Name</div>
                    <div className="property-tile-column-header">Price</div>
                    <div className="property-tile-column-header">Status</div>
                    <div className="property-tile-column-header"></div>
                  </div>
                  {sortedProperties.map((property) => (
                    <div
                      key={property.id || property.name}
                      className="property-tile clickable-row"
                      style={{ "--grid-cols": "50px 1.5fr 1.2fr 1fr 50px" }}
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("openPropertyByName", {
                            detail: { name: property.name },
                          })
                        );
                      }}
                    >
                      <div className="property-tile-favourite" onClick={(e) => { e.stopPropagation(); }}>
                        <button
                          aria-label={property.favourite ? 'Unfavourite' : 'Favourite'}
                          className="icon-button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const { updatePropertyById } = await import('../lib/propertiesApi');
                            await updatePropertyById(property.id, { favourite: !property.favourite });
                          }}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          <FontAwesomeIcon icon={property.favourite ? faHeartSolid : faHeartRegular} style={{ color: '#555555', width: '18px', height: '18px' }} />
                        </button>
                      </div>
                      <div className="property-tile-name">{property.name}</div>
                      <div className="property-tile-price">{property.price ? `£${Number(property.price).toLocaleString()}` : "—"}</div>
                      <div className="property-tile-status">{property.status || "—"}</div>
                      <div className="property-tile-actions"></div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="overview-main-content">
          <div className="activity-log-container" style={{ height: activityLogCollapsed ? "auto" : "calc(100vh - 4rem)", maxHeight: activityLogCollapsed ? "auto" : "calc(100vh - 4rem)", overflow: activityLogCollapsed ? "visible" : "hidden" }}>
          <div className="activity-log-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", position: "relative", marginBottom: activityLogCollapsed ? "0" : "1.5rem" }}>
            <h2 className="activity-log-title" style={{ margin: 0, flex: 1 }}>
              Master Activity Log
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <ActivityButton
                onNoteClick={() => setShowLogNoteModal(true)}
                onPhoneCallNoteClick={() => setShowPhoneCallModal(true)}
                onLogOfferClick={() => setShowLogOfferModal(true)}
              />
              <FontAwesomeIcon 
                icon={faChevronDown} 
                style={{ 
                  color: "#555", 
                  cursor: "pointer",
                  transform: activityLogCollapsed ? "rotate(-180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  fontSize: "1.5rem"
                }}
                onClick={() => setActivityLogCollapsed(!activityLogCollapsed)}
              />
            </div>
            {(lastAction || undoneActions.length > 0) && (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginLeft: "auto" }}>
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
          {!activityLogCollapsed && (
          <div className="activity-log-content">
        {isLoading ? (
          <div className="loading-state">Loading activity log...</div>
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <p>No activities logged yet.</p>
            <p className="empty-state-hint">
              Activities will appear here when notes are added or offers are made on client or property profiles.
            </p>
          </div>
        ) : (
          <div>
            {filteredActivities.length === 0 ? (
              <div className="activity-empty-filter" style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                        No activity of this type yet.
              </div>
            ) : (
              <div className="activity-timeline-wrapper">
                <div className="activity-tiles-container">
                  {groupActivitiesByDate(filteredActivities).map(([dateKey, dateActivities], dateGroupIndex) => (
                    <div key={dateKey} className="activity-date-group">
                      <div className="activity-date-header">
                        {formatDate(dateActivities[0].timestamp)}
                      </div>
                      {dateActivities.map((activity, activityIndex) => {
                        // Determine if this is the last activity in the entire list
                        const allActivities = groupActivitiesByDate(filteredActivities).flatMap(([_, acts]) => acts);
                        const isLastActivity = activity.id === allActivities[allActivities.length - 1]?.id;
                      const isLastInDateGroup = activityIndex === dateActivities.length - 1;
                      const isLastDateGroup = dateGroupIndex === groupActivitiesByDate(filteredActivities).length - 1;
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
                      const typeLabel =
                        activity.type === "note"
                          ? "Note"
                          : activity.type === "phoneCall"
                          ? "Phone Call"
                          : activity.type === "offer"
                          ? (activity.status === "Rejected" ? "Offer Rejected" :
                             activity.status === "Cancelled" ? "Offer Cancelled" :
                             activity.status === "Accepted" ? "Offer Accepted" :
                             activity.status === "Vendor Counter Offer" ? "Vendor Counter Offer Made" :
                             activity.status === "Client Counter Offer" ? "Client Counter Offer Made" :
                             activity.status === "Client Accepted" ? "Client Accepted Vendor Counter Offer" :
                             activity.status === "Client Rejected" ? "Client Rejected Vendor Counter Offer" :
                             activity.status === "Vendor Accepted" ? "Vendor Accepted Client Counter Offer" :
                             activity.status === "Vendor Rejected" ? "Vendor Rejected Client Counter Offer" :
                             activity.status === "Pending" ? "Client Offer Made" :
                             "Offer Made")
                          : activity.type === "fallenThrough"
                          ? "Deal Fallen Through"
                          : "Activity";

                      const handlePropertyClick = () => {
                        if (!isProperty || !activity.entityName) return;
                        window.dispatchEvent(
                          new CustomEvent("openPropertyByName", {
                            detail: { name: activity.entityName },
                          })
                        );
                      };

                      const handleContactClick = () => {
                        if (!isClient || !activity.entityName) return;
                        window.dispatchEvent(
                          new CustomEvent("openClientByName", {
                            detail: { name: activity.entityName },
                          })
                        );
                      };

                      // For offers, notes, phone calls, and fallenThrough, show clientName, propertyName, and professionalName if available
                      // When these fields are set, always show them regardless of which page we're viewing
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
                        <div key={activity.id} className="activity-tile-wrapper" id={`activity-${activity.id}`}>
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
                              <span className="activity-tile-type">{typeLabel}</span>
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
                                  <span className="activity-tile-label">Contact:</span>
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
                          </div>
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
                      );
                    })}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
        )}
          </div>
          )}
        </div>

        {/* Right side tiles */}
        <div className="overview-right-tiles">
          {/* Revenue This Month */}
          {/* <div className="overview-tile">
            <h3 className="overview-tile-title">Revenue This Month</h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ThisMonthRevenueChart salesProgressions={salesProgressions} />
            </div>
          </div> */}

          {/* Clients Under Offer Table */}
          {/* <div className="overview-tile">
            <h3 className="overview-tile-title">Clients Under Offer</h3>
            {clientsUnderOffer.length === 0 ? (
              <div className="overview-tile-empty">No clients under offer</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto", maxHeight: "calc(50vh - 8rem)" }}>
                {clientsUnderOffer.map((client) => {
                    // First, try to find property from activity log (pending offers) - this is most reliable
                    const pendingOffer = activities.find(a =>
                      a.type === "offer" &&
                      a.status === "Pending" &&
                      a.clientName === client.name &&
                      !activities.some(act =>
                        act.type === "offer" &&
                        (act.status === "Accepted" || act.status === "Rejected" || act.status === "Cancelled") &&
                        act.clientName === a.clientName &&
                        act.propertyName === a.propertyName &&
                        Number(act.details) === Number(a.details) &&
                        act.createdAt > a.createdAt
                      )
                    );
                    let clientProperty = pendingOffer ? properties.find(p => p.name === (pendingOffer.propertyName || pendingOffer.entityName)) : null;
                    
                    // Second, try to find property from sales progressions
                    if (!clientProperty) {
                      const salesProg = salesProgressions.find(sp => 
                        matchesClient(sp.client, client) && !sp.dealComplete && !sp.fallenThrough
                      );
                      clientProperty = salesProg ? properties.find(p => p.name === salesProg.address) : null;
                    }
                    
                    // Third, find any linked property with offers
                    if (!clientProperty) {
                      const clientProperties = properties.filter(p => 
                        ((p.linkedClients && p.linkedClients.includes(client.name)) || p.linkedClient === client.name) &&
                        (p.offerStatus === "Pending" || p.offerStatus === "Accepted" || p.offerStatus === "Under Offer" || p.offerAmount)
                      );
                      
                      // Prefer Pending offers, then Accepted, then Under Offer, then any with offerAmount
                      clientProperty = clientProperties.find(p => p.offerStatus === "Pending") ||
                                      clientProperties.find(p => p.offerStatus === "Accepted") ||
                                      clientProperties.find(p => p.offerStatus === "Under Offer") ||
                                      clientProperties.find(p => p.offerAmount) ||
                                      clientProperties[0]; // Fallback to first if multiple
                    }
                    
                    // Fourth, check all properties with pending offers (even if not linked)
                    if (!clientProperty) {
                      const propertiesWithPendingOffers = properties.filter(p => 
                        p.offerStatus === "Pending" && p.offerAmount
                      );
                      // Try to match by checking if any activity log entry links this client to this property
                      for (const prop of propertiesWithPendingOffers) {
                        const hasMatchingActivity = activities.some(a =>
                          a.type === "offer" &&
                          a.status === "Pending" &&
                          a.clientName === client.name &&
                          (a.propertyName === prop.name || a.entityName === prop.name)
                        );
                        if (hasMatchingActivity) {
                          clientProperty = prop;
                          break;
                        }
                      }
                    }
                    
                    // Last resort: find any linked property
                    if (!clientProperty) {
                      const anyLinkedProperty = properties.find(p => 
                        (p.linkedClients && p.linkedClients.includes(client.name)) || p.linkedClient === client.name
                      );
                      clientProperty = anyLinkedProperty;
                    }
                    
                    // Find the offer activity ID - prefer pending offer, but also check for any offer activity for this client/property
                    let offerActivityId = pendingOffer?.id;
                    if (!offerActivityId && clientProperty) {
                      // Try to find any offer activity for this client and property
                      const anyOfferActivity = activities.find(a =>
                        a.type === "offer" &&
                        a.clientName === client.name &&
                        (a.propertyName === clientProperty.name || a.entityName === clientProperty.name)
                      );
                      offerActivityId = anyOfferActivity?.id;
                    }
                    
                    return (
                      <div 
                        key={client.id || client.name} 
                        className="activity-tile" 
                        style={{ margin: 0, display: "flex", alignItems: "center", cursor: offerActivityId ? "pointer" : "default" }}
                        onClick={(e) => {
                          // Don't trigger if clicking on buttons
                          if (e.target.tagName === "BUTTON") return;
                          if (offerActivityId) {
                            const activityElement = document.getElementById(`activity-${offerActivityId}`);
                            if (activityElement) {
                              activityElement.scrollIntoView({ behavior: "smooth", block: "center" });
                              // Highlight the activity briefly with background and border
                              activityElement.style.transition = "background-color 0.3s, border-color 0.3s";
                              activityElement.style.backgroundColor = "#fff3cd";
                              activityElement.style.border = "2px solid #6c757d";
                              activityElement.style.borderRadius = "8px";
                              setTimeout(() => {
                                activityElement.style.backgroundColor = "";
                                activityElement.style.border = "";
                                activityElement.style.borderRadius = "";
                                setTimeout(() => {
                                  activityElement.style.transition = "";
                                }, 300);
                              }, 2000);
                            }
                          }
                        }}
                      >
                        <div className="activity-tile-content" style={{ width: "100%", marginBottom: 0 }}>
                          <div className="activity-tile-row" style={{ marginBottom: 0, flexDirection: "column", gap: "0.75rem" }}>
                            <div className="activity-tile-field">
                              <span className="activity-tile-label">Client:</span>
                              <button
                                type="button"
                                className="activity-entity-pill"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.dispatchEvent(
                                    new CustomEvent("openClientByName", {
                                      detail: { name: client.name },
                                    })
                                  );
                                }}
                              >
                                {client.name}
                              </button>
                            </div>
                            {clientProperty && (
                              <div className="activity-tile-field">
                                <span className="activity-tile-label">Property:</span>
                                <button
                                  type="button"
                                  className="activity-entity-pill"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(
                                      new CustomEvent("openPropertyByName", {
                                        detail: { name: clientProperty.name },
                                      })
                                    );
                                  }}
                                >
                                  {clientProperty.name}
                                </button>
                              </div>
                            )}
                            {!clientProperty && (
                              <div className="activity-tile-field">
                                <span className="activity-tile-label">Property:</span>
                                <span style={{ color: '#999' }}>—</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div> */}

          {/* Sales Progression Table */}
          {/* <div 
            className="overview-tile overview-tile-clickable"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("openSalesProgression"));
            }}
            style={{ cursor: 'pointer' }}
          >
            <h3 className="overview-tile-title">Sales Progression</h3>
            {activeDeals.length === 0 ? (
              <div className="overview-tile-empty">No active deals in sales progression</div>
            ) : (
              <>
                <table className="overview-table" style={{ marginBottom: "0.75rem" }}>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Property</th>
                      <th>Next Step</th>
                    </tr>
                  </thead>
                </table>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto", maxHeight: "calc(50vh - 8rem)" }}>
                  {activeDeals.map((deal) => {
                    const nextStep = getNextStep(deal);
                    return (
                      <div key={deal.id || `${deal.client}-${deal.address}`} className="activity-tile" style={{ margin: 0, display: "flex", alignItems: "center" }}>
                        <div className="activity-tile-content" style={{ width: "100%", marginBottom: 0 }}>
                          <div className="activity-tile-row" style={{ marginBottom: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", alignItems: "center" }}>
                            <div className="activity-tile-field">
                              <button
                                type="button"
                                className="activity-entity-pill"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.dispatchEvent(
                                    new CustomEvent("openClientByName", {
                                      detail: { name: deal.client },
                                    })
                                  );
                                }}
                              >
                                {deal.client}
                              </button>
                            </div>
                            <div className="activity-tile-field">
                              <button
                                type="button"
                                className="activity-entity-pill"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.dispatchEvent(
                                    new CustomEvent("openPropertyByName", {
                                      detail: { name: deal.address },
                                    })
                                  );
                                }}
                              >
                                {deal.address}
                              </button>
                            </div>
                            <div className="activity-tile-field" style={{ justifyContent: "flex-start" }}>
                              <span style={{ fontSize: "0.85rem" }}>{nextStep || "All steps completed"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div> */}
        </div>
        </div>

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

      {/* Log Offer Modal */}
      <LogOfferModal
        isOpen={showLogOfferModal}
        onClose={() => setShowLogOfferModal(false)}
        clients={clients}
        properties={properties}
        onSave={async ({ client, property, amount, timestamp }) => {
          // Update property offer
          const { updatePropertyById } = await import("../lib/propertiesApi");
          const propertyToUpdate = properties.find(p => p.id === property.id);
          if (propertyToUpdate?.id) {
            const offers = Array.isArray(propertyToUpdate.offers) ? [...propertyToUpdate.offers] : [];
            offers.push({
              date: timestamp || new Date().toISOString(),
              amount: amount,
              status: "Pending"
            });
            await updatePropertyById(propertyToUpdate.id, {
              offerAmount: amount,
              offerStatus: "Pending",
              offers: offers
            });
          }

          // Update client status
          if (updateClientStatus) {
            await updateClientStatus(client.name, "Under Offer");
          }

          // Log to activity log with both client and property references
          await logActivity({
            type: "offer",
            entityType: "property",
            entityName: property.name,
            clientName: client.name,
            propertyName: property.name,
            details: String(amount),
            status: "Pending",
            timestamp: timestamp || new Date().toISOString(),
          });
        }}
      />

      {/* Log Note Modal */}
      <LogNoteModal
        isOpen={showLogNoteModal}
        onClose={() => setShowLogNoteModal(false)}
        clients={clients}
        properties={properties}
        professionals={professionals}
        onSave={async ({ client, property, professional, note, timestamp }) => {
          const { updateClientById } = await import("../lib/clientsApi");
          const { updatePropertyById } = await import("../lib/propertiesApi");
          
          // Update client notes if client is selected
          if (client) {
            const clientToUpdate = clients.find(c => c.id === client.id);
            if (clientToUpdate?.id) {
              const notes = Array.isArray(clientToUpdate.notes) 
                ? [...clientToUpdate.notes, { date: timestamp, text: note }]
                : [{ date: timestamp, text: note }];
              await updateClientById(clientToUpdate.id, { notes });
            }
          }

          // Update property notes if property is selected
          if (property) {
            const propertyToUpdate = properties.find(p => p.id === property.id);
            if (propertyToUpdate?.id) {
              const notes = Array.isArray(propertyToUpdate.notes)
                ? [...propertyToUpdate.notes, { date: timestamp, text: note }]
                : [{ date: timestamp, text: note }];
              await updatePropertyById(propertyToUpdate.id, { notes });
            }
          }

          // Log to activity log - single entry with both client and property if both are selected
          const activityLogEntry = {
            type: "note",
            details: note,
            timestamp: timestamp,
          };

          // Always include professionalName if professional is selected
          if (professional) {
            activityLogEntry.professionalName = professional.name;
          }

          // Determine entityType and entityName based on what's selected
          if (client && property) {
            // Both selected - use primary entity as client, but include both in the log
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
            activityLogEntry.propertyName = property.name;
          } else if (client && professional) {
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
          } else if (property && professional) {
            activityLogEntry.entityType = "property";
            activityLogEntry.entityName = property.name;
            activityLogEntry.propertyName = property.name;
          } else if (client) {
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
          } else if (property) {
            activityLogEntry.entityType = "property";
            activityLogEntry.entityName = property.name;
            activityLogEntry.propertyName = property.name;
          } else if (professional) {
            activityLogEntry.entityType = "professional";
            activityLogEntry.entityName = professional.name;
          }

          await logActivity(activityLogEntry);
        }}
      />

      {/* Phone Call Modal */}
      <LogNoteModal
        isOpen={showPhoneCallModal}
        onClose={() => setShowPhoneCallModal(false)}
        clients={clients}
        properties={properties}
        professionals={professionals}
        title="Add Phone Call"
        onSave={async ({ client, property, professional, note, timestamp }) => {
          const { updateClientById } = await import("../lib/clientsApi");
          const { updatePropertyById } = await import("../lib/propertiesApi");
          
          // Update client notes if client is selected
          if (client) {
            const clientToUpdate = clients.find(c => c.id === client.id);
            if (clientToUpdate?.id) {
              const notes = Array.isArray(clientToUpdate.notes) 
                ? [...clientToUpdate.notes, { date: timestamp, text: note }]
                : [{ date: timestamp, text: note }];
              await updateClientById(clientToUpdate.id, { notes });
            }
          }

          // Update property notes if property is selected
          if (property) {
            const propertyToUpdate = properties.find(p => p.id === property.id);
            if (propertyToUpdate?.id) {
              const notes = Array.isArray(propertyToUpdate.notes)
                ? [...propertyToUpdate.notes, { date: timestamp, text: note }]
                : [{ date: timestamp, text: note }];
              await updatePropertyById(propertyToUpdate.id, { notes });
            }
          }

          // Log to activity log - single entry with both client and property if both are selected
          const activityLogEntry = {
            type: "phoneCall",
            details: note,
            timestamp: timestamp,
          };

          // Always include professionalName if professional is selected
          if (professional) {
            activityLogEntry.professionalName = professional.name;
          }

          // Determine entityType and entityName based on what's selected
          if (client && property) {
            // Both selected - use primary entity as client, but include both in the log
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
            activityLogEntry.propertyName = property.name;
          } else if (client && professional) {
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
          } else if (property && professional) {
            activityLogEntry.entityType = "property";
            activityLogEntry.entityName = property.name;
            activityLogEntry.propertyName = property.name;
          } else if (client) {
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
          } else if (property) {
            activityLogEntry.entityType = "property";
            activityLogEntry.entityName = property.name;
            activityLogEntry.propertyName = property.name;
          } else if (professional) {
            activityLogEntry.entityType = "professional";
            activityLogEntry.entityName = professional.name;
          }

          await logActivity(activityLogEntry);
        }}
      />

      {/* Edit Note Modal */}
      <LogNoteModal
        isOpen={showEditNoteModal}
        onClose={() => {
          setShowEditNoteModal(false);
          setEditingNote(null);
        }}
        clients={clients}
        properties={properties}
        title="Edit Note"
        editingNote={editingNote}
        onSave={async ({ client, property, note, timestamp, isEdit, activityId, originalTimestamp }) => {
          if (!isEdit) return;
          
          const { updateClientById } = await import("../lib/clientsApi");
          const { updatePropertyById } = await import("../lib/propertiesApi");

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
            await updateActivityLog(activityId, {
              details: note,
              timestamp: timestamp
            });
          }

          setShowEditNoteModal(false);
          setEditingNote(null);
        }}
      />
    </div>
  );
}

export default Overview;

