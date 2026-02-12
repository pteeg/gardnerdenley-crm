import React, { useState, useEffect } from "react";
import StatusToggle from "./StatusToggle";
import "./SalesProgression.css";
import Sidebar from "../Sidebar";
import ProfessionalChooserButton from "../Contacts/ProfessionalChooserButton";
import { v4 as uuidv4 } from "uuid";
import { logActivity, subscribeToActivityLog } from "../lib/activityLogApi";

// Helper function to format client names
function formatClientName(clientName, clients = []) {
  // Find the client data to get spouse information
  const client = clients.find(c => c.name === clientName || 
    (c.spouse1FirstName && c.spouse1Surname && 
     `${c.spouse1FirstName} and ${c.spouse2FirstName || c.spouse1FirstName} ${c.spouse1Surname}` === clientName));
  
  if (client && client.spouse1FirstName) {
    if (client.spouse2FirstName) {
      return client.spouse1Surname
        ? `${client.spouse1FirstName} and ${client.spouse2FirstName} ${client.spouse1Surname}`
        : `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
    }
    return client.spouse1Surname ? `${client.spouse1FirstName} ${client.spouse1Surname}` : client.spouse1FirstName;
  }
  // Fallback to original client name
  return clientName || "Unknown";
}

const SalesProgression = ({
  data,
  setData,
  markPropertyAsSold,
  updateClientStatus,
  professionals: initialProfessionals = [],
  setProfessionals: parentSetProfessionals,
  clients = [],
  onRemoveRow,
  properties = []
}) => {
  const progressionSteps = [
    { key: "contractSent", label: "Send Contract" },
    { key: "contractSigned", label: "Sign Contract" },
    { key: "clientIdDocument", label: "Client ID" },
    { key: "aml", label: "AML" },
    { key: "solicitorRecommended", label: "Recommend Solicitor" },
    { key: "solicitorEngaged", label: "Engage Solicitor" },
    { key: "mortgageAdvisorRecommended", label: "Recommend Mortgage Advisor" },
    { key: "mortgageValBooked", label: "Book Mortgage Valuation" },
    { key: "mortgageOfferReceived", label: "Receive Mortgage Offer" },
    { key: "surveyorRecommended", label: "Recommend Surveyor" },
    { key: "surveyBooked", label: "Book Survey" },
    { key: "sdltAdvisorRecommended", label: "Recommend SDLT Advisor" },
    { key: "targetExchangeDate", label: "Set Target Exchange Date" },
    { key: "targetCompletionDate", label: "Set Target Completion Date" },
    { key: "removalsRecommended", label: "Recommend Removals" },
    { key: "removalsBooked", label: "Book Removals" },
    { key: "exchangeDateSet", label: "Set Exchange Date" },
    { key: "completionDateSet", label: "Set Completion Date" },
    { key: "paymentExpected", label: "Set Payment Expected Date" },
    { key: "invoiceSent", label: "Send Invoice" },
    { key: "invoicePaid", label: "Invoice Paid" },
  ];

  const getNextStepLabel = (row) => {
    if (!row) return "";
    for (const step of progressionSteps) {
      const value = row[step.key];
      if (!value || value === "Not Done" || value === "Pending") {
        return step.label;
      }
    }
    return "All steps complete";
  };

  const formatNiceDate = (value) => {
    if (!value) return "";
    const date = typeof value === "number" ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "";
    const numeric = Number(amount);
    if (Number.isNaN(numeric)) return "";
    return `£${numeric.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  const getProgressPercent = (row) => {
    if (!row || progressionSteps.length === 0) return 0;
    let done = 0;
    progressionSteps.forEach((step) => {
      const value = row[step.key];
      if (value && value !== "Not Done" && value !== "Pending") {
        done += 1;
      }
    });
    return Math.round((done / progressionSteps.length) * 100);
  };

  // Local fallback if no professionals passed from parent
  const [localProfessionals, setLocalProfessionals] = useState(initialProfessionals);

  const [showCompleted, setShowCompleted] = useState(false);

  // Keep draft date text while user is typing so partial entries don't get cleared
  const [draftDates, setDraftDates] = useState({}); // key: `${rowIndex}:${field}` -> string
  const fullIsoDate = /^\d{4}-\d{2}-\d{2}$/;
  // Track which client's context menu is open (by row index)
  const [openClientMenuRow, setOpenClientMenuRow] = useState(null);
  const [clientMenuPosition, setClientMenuPosition] = useState({ top: 0, left: 0 });
  const [hoveredClientButtonRow, setHoveredClientButtonRow] = useState(null);
  const [activities, setActivities] = useState([]);

  // Subscribe to activity log to get offer acceptance dates
  useEffect(() => {
    const unsubscribe = subscribeToActivityLog((list) => {
      setActivities(list);
    });
    return () => unsubscribe();
  }, []);

  const findClientByDisplayName = (clientName) => {
    if (!clientName) return null;
    return (
      clients.find((c) => {
        const storedName = c.name || "";
        // Primary: exact or "short form" vs "full form" match on stored name
        if (storedName === clientName) return true;
        if (storedName.startsWith(`${clientName} `)) return true;

        // Derive display name the same way Contacts/ClientsTable does
        let formatted = "";
        if (c.spouse1FirstName && c.spouse2FirstName) {
          formatted = c.spouse1Surname
            ? `${c.spouse1FirstName} and ${c.spouse2FirstName} ${c.spouse1Surname}`
            : `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
        } else if (c.spouse1FirstName || c.spouse1Surname) {
          const first = c.spouse1FirstName || "";
          const surname = c.spouse1Surname || "";
          formatted = [first, surname].filter(Boolean).join(" ");
        } else {
          formatted = storedName;
        }

        if (!formatted) return false;
        if (formatted === clientName) return true;
        // If the formatted name includes the surname and the progression only stored first names,
        // e.g. "Simon and Sarah Gardner" vs "Simon and Sarah"
        if (formatted.startsWith(`${clientName} `)) return true;

        return false;
      }) || null
    );
  };

  const formatClientDisplayNameFromObject = (c) => {
    if (!c) return "";
    if (c.spouse1FirstName && c.spouse2FirstName) {
      return c.spouse1Surname
        ? `${c.spouse1FirstName} and ${c.spouse2FirstName} ${c.spouse1Surname}`
        : `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
    }
    if (c.spouse1FirstName || c.spouse1Surname) {
      const first = c.spouse1FirstName || "";
      const surname = c.spouse1Surname || "";
      return [first, surname].filter(Boolean).join(" ");
    }
    return c.name || "";
  };

  const getClientForProgressionRow = (row) => {
    if (!row) return null;

    // 1) Try to resolve via linked property, which stores client.name
    const property = properties.find((p) => p.name === row.address);
    if (property) {
      if (Array.isArray(property.linkedClients) && property.linkedClients.length > 0) {
        const linkedName = property.linkedClients[0];
        const byLinked = clients.find((c) => c.name === linkedName);
        if (byLinked) return byLinked;
      } else if (property.linkedClient) {
        const lc = property.linkedClient;
        let linkedName = null;
        if (typeof lc === "string") {
          linkedName = lc;
        } else if (lc && typeof lc === "object" && lc.name) {
          linkedName = lc.name;
        }
        if (linkedName) {
          const byLinked = clients.find((c) => c.name === linkedName);
          if (byLinked) return byLinked;
        }
      }
    }

    // 2) Try match by Contacts-style display name vs row.client
    const rowName = row.client || "";
    const byDisplay = clients.find(
      (c) => formatClientDisplayNameFromObject(c) === rowName
    );
    if (byDisplay) return byDisplay;

    // 3) Fallback to flexible name matcher
    return findClientByDisplayName(rowName);
  };

  const formatClientFullNameForProgression = (row) => {
    const client = getClientForProgressionRow(row);
    if (client) return formatClientDisplayNameFromObject(client);
    // Fallback to existing behaviour if we truly can't resolve
    return formatClientName(row?.client, clients);
  };

  // Helper function to find accepted offer date for a deal
  const getAcceptedOfferDate = (deal) => {
    // Find the client name (might be formatted)
    const clientName = deal.client;
    
    // Try to find matching client to get actual name
    const client = findClientByDisplayName(clientName);
    const actualClientName = client ? client.name : clientName;

    // Find the accepted offer activity for this client and property
    // Check for "Accepted", "Client Accepted", or "Vendor Accepted" statuses
    const acceptedOffer = activities.find(a =>
      a.type === "offer" &&
      (a.status === "Accepted" || a.status === "Client Accepted" || a.status === "Vendor Accepted") &&
      (a.clientName === actualClientName || a.clientName === clientName) &&
      (a.propertyName === deal.address || a.entityName === deal.address)
    );

    if (acceptedOffer) {
      // Convert timestamp to number for comparison
      const timestamp = acceptedOffer.timestamp || acceptedOffer.createdAt;
      if (timestamp) {
        // If it's an ISO string, convert to date, otherwise use as number
        return typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
      }
    }
    
    // Fallback: use createdAt from the deal itself if no activity found
    const fallback = deal.createdAt;
    return fallback ? (typeof fallback === 'string' ? new Date(fallback).getTime() : fallback) : 0;
  };

  // Sort deals by accepted offer date (most recent first)
  const sortDealsByAcceptedDate = (deals) => {
    return [...deals].sort((a, b) => {
      const dateA = getAcceptedOfferDate(a);
      const dateB = getAcceptedOfferDate(b);
      // Sort descending (most recent first)
      return dateB - dateA;
    });
  };

  const completedDeals = sortDealsByAcceptedDate(data.filter((row) => row.dealComplete && !row.fallenThrough));
  const fallenDeals = data.filter((row) => row.fallenThrough);
  const activeDeals = sortDealsByAcceptedDate(data.filter((row) => !row.dealComplete && !row.fallenThrough));
  
  // Debug: Log the data structure
  console.log("SalesProgression data:", data);
  console.log("Active deals:", activeDeals);

  const professionals = initialProfessionals.length
    ? initialProfessionals
    : localProfessionals;
  const setProfessionals = parentSetProfessionals || setLocalProfessionals;

  const handleFeePercentChange = async (rowIndex, inputValue) => {
    const numericString = String(inputValue).replace(/[^0-9.]/g, "");

    const currentData = showCompleted ? completedDeals : activeDeals;
    const row = currentData[rowIndex];
    if (!row) return;

    // Allow empty string while typing
    if (numericString === "") {
      if (row?.id && row.id !== "Not Done") {
        const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
        await updateSalesProgressionById(row.id, { feePercent: "" });
      }
      return;
    }

    // Allow trailing decimal like "1."
    if (/^\d+\.$/.test(numericString)) {
      if (row?.id && row.id !== "Not Done") {
        const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
        await updateSalesProgressionById(row.id, { feePercent: numericString });
      }
      return;
    }

    const parsedNumber = Math.min(100, Math.max(0, parseFloat(numericString)));

    if (row?.id && row.id !== "Not Done") {
      try {
        const property = properties.find(p => p.name === row.address);
        let computedInvoice = row.invoiceAmount || "";
        if (property && property.offerStatus === "Accepted" && property.offerAmount && !Number.isNaN(parsedNumber)) {
          computedInvoice = Math.round(Number(property.offerAmount) * (parsedNumber / 100));
        }
        const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
        await updateSalesProgressionById(row.id, { feePercent: parsedNumber, invoiceAmount: computedInvoice });
      } catch (e) {
        console.error("Error updating fee percent:", e);
      }
    } else {
      console.warn("Cannot update fee percent - no valid document ID");
    }
  };

  // Initialize default fee percent and invoice amount from accepted offer
  useEffect(() => {
    const init = async () => {
      const currentData = showCompleted ? completedDeals : activeDeals;
      const updates = [];
      for (const row of currentData) {
        if (!row?.id || row.id === "Not Done") continue;
        // Only treat fee as missing if it's truly undefined or null (not empty string while the user edits)
        const hasFee = row.feePercent !== undefined && row.feePercent !== null;
        const property = properties.find(p => p.name === row.address);
        const canCompute = property && property.offerStatus === "Accepted" && property.offerAmount;
        if (!hasFee || (canCompute && (row.invoiceAmount === undefined || row.invoiceAmount === null))) {
          const fee = hasFee ? Number(row.feePercent) : 1.5;
          const computedInvoice = canCompute ? Math.round(Number(property.offerAmount) * (fee / 100)) : row.invoiceAmount;
          const payload = { };
          if (!hasFee) payload.feePercent = fee;
          if (canCompute && computedInvoice !== undefined && computedInvoice !== null) payload.invoiceAmount = computedInvoice;
          if (Object.keys(payload).length > 0) {
            updates.push({ id: row.id, payload });
          }
        }
      }
      if (updates.length > 0) {
        const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
        await Promise.all(updates.map(u => updateSalesProgressionById(u.id, u.payload)));
      }
    };
    init();
    // We intentionally depend on data/properties/showCompleted to re-check when these change
  }, [data, properties, showCompleted]);

  const handleStatusChange = async (rowIndex, field, newValue) => {
    console.log(`handleStatusChange called: field=${field}, rowIndex=${rowIndex}, newValue=${newValue}`);
    console.log("Current data array:", data);
    
    // Use the correct data array based on what's being displayed
    const currentData = showCompleted ? completedDeals : activeDeals;
    console.log("Current displayed data:", currentData);
    console.log("Row at index", rowIndex, ":", currentData[rowIndex]);

    const row = currentData[rowIndex];

    // Early validation: prevent setting Invoice Paid to Done without Payment Expected date
    if (field === "invoicePaid" && newValue === "Done") {
      const paymentExpectedDate = (row && row.paymentExpected) || currentData[rowIndex].paymentExpected;
      if (!paymentExpectedDate) {
        setShowPaymentExpectedAlert(true);
        return; // Block update entirely
      }
    }

    if (row?.id && row.id !== "Not Done") {
      console.log("Updating Firestore document with ID:", row.id);
      try {
        const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
        const payload = { [field]: newValue };
        await updateSalesProgressionById(row.id, payload);
        console.log("SalesProgression: Successfully updated", field, "in row", rowIndex, "to", newValue);
      } catch (error) {
        console.error("Error updating sales progression:", error);
      }
    } else {
      console.warn("Cannot update sales progression - no valid document ID. Row ID:", row?.id);
    }

    // Exchanged column drives client status to Exchanged when Done
    // If Exchanged is changed to Not Done/Pending and invoice is not paid, revert to Matched
    if (field === "exchanged") {
      const propertyName = currentData[rowIndex].address;
      const clientName = currentData[rowIndex].client;
      const invoicePaid = (row && row.invoicePaid) || currentData[rowIndex].invoicePaid;
      if (newValue === "Done") {
        await markPropertyAsSold(propertyName);
        if (updateClientStatus) {
          // If invoice is already paid, keep client as Archived; otherwise set to Exchanged
          await updateClientStatus(clientName, invoicePaid === "Done" ? "Archived" : "Exchanged");
        }
      } else {
        // Only revert if the deal hasn't been completed by invoice payment
        if (invoicePaid !== "Done" && updateClientStatus) {
          await updateClientStatus(clientName, "Matched");
        }
      }
    }

    // Sync dealComplete with invoicePaid: Done => true, otherwise => false
    if (field === "invoicePaid") {
      const clientName = currentData[rowIndex].client;
      const markComplete = newValue === "Done";
      // Require a Payment Expected date if marking invoice as Done (duplicate safety)
      if (markComplete) {
        const paymentExpectedDate = (row && row.paymentExpected) || currentData[rowIndex].paymentExpected;
        if (!paymentExpectedDate) {
          setShowPaymentExpectedAlert(true);
          return;
        }
      }
      try {
        if (row?.id && row.id !== "Not Done") {
          const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
          await updateSalesProgressionById(row.id, { dealComplete: markComplete });
        }
      } catch (e) {
        console.error("Failed to sync dealComplete with invoicePaid:", e);
      }
      if (updateClientStatus) {
        if (markComplete) {
          await updateClientStatus(clientName, "Archived");
        } else {
          // If invoice is not paid, set status based on current exchanged state
          const exchangedState = (row && row.exchanged) || currentData[rowIndex].exchanged;
          const isExchangedDone = exchangedState === "Done";
          await updateClientStatus(clientName, isExchangedDone ? "Exchanged" : "Matched");
        }
      }
    }

    // Do not derive client status or dealComplete from the "Completed" column anymore.
    // Only "Invoice Paid" controls deal completion visibility and may set client status elsewhere.
  };

  const handleInputChange = async (rowIndex, field, value) => {
    // Use the correct data array based on what's being displayed
    const currentData = showCompleted ? completedDeals : activeDeals;
    const row = currentData[rowIndex];
    if (row?.id && row.id !== "Not Done") {
      const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
      // If user sets completion date and paymentExpected is empty, auto-fill paymentExpected with same date
      if (field === "completionDateSet") {
        const shouldAutofillPayment = !row.paymentExpected || row.paymentExpected === "";
        const payload = shouldAutofillPayment
          ? { completionDateSet: value, paymentExpected: value }
          : { completionDateSet: value };
        await updateSalesProgressionById(row.id, payload);
        return;
      }
      await updateSalesProgressionById(row.id, { [field]: value });
    } else {
      console.warn("Cannot update sales progression - no valid document ID");
    }
  };

  // Date input helpers to preserve partial typing and commit on blur/valid
  const getDraftKey = (rowIndex, field) => `${rowIndex}:${field}`;
  const getDateInputValue = (rowIndex, field, storedValue) => {
    const key = getDraftKey(rowIndex, field);
    const draft = draftDates[key];
    if (draft !== undefined) return draft; // show what the user is typing
    return fullIsoDate.test(storedValue) ? storedValue : "";
  };
  const handleDateTyping = (rowIndex, field, value) => {
    const key = getDraftKey(rowIndex, field);
    setDraftDates(prev => ({ ...prev, [key]: value }));
    // If user has completed a full ISO date, persist immediately
    if (value === '' || fullIsoDate.test(value)) {
      handleInputChange(rowIndex, field, value);
    }
  };
  const handleDateBlur = (rowIndex, field, storedValue) => {
    const key = getDraftKey(rowIndex, field);
    const draft = draftDates[key];
    if (draft === undefined) return; // nothing to reconcile
    // If draft is a full date or cleared, it was already saved in typing handler
    // Otherwise, revert display back to stored value
    setDraftDates(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleAddProfessional = async (rowIndex, newProfessional, field) => {
    // Ensure the new professional has an ID and default archived state
    const proWithId = {
      ...newProfessional,
      id: newProfessional.id || uuidv4(),
      archived: false, // ✅ always show in Contacts table
    };

    // Add to professionals list
    const { createProfessional } = await import("../lib/professionalsApi");
    await createProfessional(proWithId);

    // Immediately select the new professional for this row
    await handleInputChange(rowIndex, field, {
      id: proWithId.id,
      name: proWithId.name,
    });

    console.log("New professional added:", proWithId);
  };

  // Modal state for Fallen Through reason
  const [showFallThroughModal, setShowFallThroughModal] = useState(false);
  const [fallThroughReason, setFallThroughReason] = useState("");
  const [pendingFallRowIndex, setPendingFallRowIndex] = useState(null);
  const [showPaymentExpectedAlert, setShowPaymentExpectedAlert] = useState(false);
  // Edit modal state for fallen deals
  const [showEditFallenModal, setShowEditFallenModal] = useState(false);
  const [editFallenReason, setEditFallenReason] = useState("");
  const [editFallenRowIndex, setEditFallenRowIndex] = useState(null);
  // Add-note modal state (from mortgage/survey date rows)
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteClientName, setQuickNoteClientName] = useState("");
  const [quickNoteSource, setQuickNoteSource] = useState("");
  const [showQuickNoteComposer, setShowQuickNoteComposer] = useState(false);

  // View scope: 'active' | 'completed' | 'fallen'
  const [viewScope, setViewScope] = useState('active');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState("overview"); // 'full' | 'overview'
  const [detailRowIndex, setDetailRowIndex] = useState(null);
  const [detailTab, setDetailTab] = useState("overview"); // 'overview' | 'aml'

  const currentRows = viewScope === "fallen"
    ? fallenDeals
    : (showCompleted ? completedDeals : activeDeals);

  const detailRow =
    detailRowIndex !== null && currentRows[detailRowIndex]
      ? currentRows[detailRowIndex]
      : null;
  const detailProgressPercent = getProgressPercent(detailRow);

  return (
    <div className="sales-progression">
      {openClientMenuRow !== null && (
        <div
          onClick={() => setOpenClientMenuRow(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0)', zIndex: 999 }}
        />
      )}
      <div className="sales-progression-body">
        <Sidebar
          title="Sales Prog."
          items={[
            { key: "active", label: "Active Deals", active: viewScope === 'active' && !showCompleted, onClick: () => { setViewScope('active'); setShowCompleted(false); } },
            { key: "completed", label: "Completed Deals", active: viewScope === 'active' && showCompleted, onClick: () => { setViewScope('active'); setShowCompleted(true); } },
            { key: "fallen", label: "Archived", active: viewScope === 'fallen', onClick: () => { setViewScope('fallen'); setShowCompleted(false); } },
          ]}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="sales-progression-content">
          {/* Page title matching Contacts page heading style */}
          <h2 className="sp-subtitle">
            {viewScope === 'fallen' ? 'Archived' : (showCompleted ? 'Completed Deals' : 'Active Deals')}
          </h2>
          {viewScope !== 'fallen' && (
            <div className="sp-view-toggle">
              <button
                type="button"
                className={viewMode === "overview" ? "sp-view-toggle-btn active" : "sp-view-toggle-btn"}
                onClick={() => setViewMode("overview")}
              >
                Simplified View (test)
              </button>
              <button
                type="button"
                className={viewMode === "full" ? "sp-view-toggle-btn active" : "sp-view-toggle-btn"}
                onClick={() => setViewMode("full")}
              >
                Full table
              </button>
            </div>
          )}
          {(currentRows.length === 0) ? (
            <div style={{ padding: '1rem', color: '#555555', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '240px', textAlign: 'center', width: '100%' }}>
              {viewScope === 'fallen' ? 'No Fallen Through Deals' : (showCompleted ? 'No Completed Deals in Progression' : 'No Active Deals in Progression. Relax 😎')}
            </div>
          ) : (
          <>
          {viewScope !== "fallen" && viewMode === "overview" && detailRow ? (
            <div className="sp-detail-page">
              <button
                type="button"
                className="sp-detail-back-btn"
                onClick={() => setDetailRowIndex(null)}
              >
                ← Back to Simplified View
              </button>

              <div className="sp-detail-summary">
                <div className="sp-detail-summary-main">
                  <div className="sp-detail-summary-client">
                    {formatClientFullNameForProgression(detailRow)}
                  </div>
                  <button
                    type="button"
                    className="sp-overview-ellipsis-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClientMenuPosition({ top: rect.bottom + 6, left: rect.left });
                      setOpenClientMenuRow(
                        openClientMenuRow === detailRowIndex ? null : detailRowIndex
                      );
                    }}
                    aria-label="Client actions"
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                </div>
                <div className="sp-detail-summary-meta">
                  <div className="sp-detail-summary-item">
                    <span className="sp-detail-summary-label">Progress</span>
                    <div className="sp-progress">
                      <div className="sp-progress-bar">
                        <div
                          className="sp-progress-bar-fill"
                          style={{ width: `${detailProgressPercent}%` }}
                        />
                      </div>
                      <span className="sp-progress-text">
                        {detailProgressPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="sp-detail-summary-item">
                    <span className="sp-detail-summary-label">Acquiring</span>
                    <span className="sp-detail-summary-value">
                      {detailRow.address || "No property set"}
                    </span>
                  </div>
                  <div className="sp-detail-summary-item">
                    <span className="sp-detail-summary-label">Price</span>
                    <span className="sp-detail-summary-value">
                      {(() => {
                        const property = properties.find(
                          (p) => p.name === detailRow.address
                        );
                        return property && property.offerAmount
                          ? formatCurrency(property.offerAmount)
                          : "Not set";
                      })()}
                    </span>
                  </div>
                  <div className="sp-detail-summary-item">
                    <span className="sp-detail-summary-label">Offer accepted</span>
                    <span className="sp-detail-summary-value">
                      {(() => {
                        const ts = getAcceptedOfferDate(detailRow);
                        const label = ts ? formatNiceDate(ts) : "";
                        return label || "Not found";
                      })()}
                    </span>
                  </div>
                  <div className="sp-detail-summary-item">
                    <span className="sp-detail-summary-label">Est. exchange</span>
                    <span className="sp-detail-summary-value">
                      {detailRow.targetExchangeDate
                        ? formatNiceDate(detailRow.targetExchangeDate)
                        : "Not set"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sp-detail-tabs">
                <button
                  type="button"
                  className={
                    detailTab === "overview"
                      ? "sp-detail-tab active"
                      : "sp-detail-tab"
                  }
                  onClick={() => setDetailTab("overview")}
                >
                  Deal Overview
                </button>
                <button
                  type="button"
                  className={
                    detailTab === "aml"
                      ? "sp-detail-tab active"
                      : "sp-detail-tab"
                  }
                  onClick={() => setDetailTab("aml")}
                >
                  AML
                </button>
              </div>

              <div className="sp-detail-body">
                {detailTab === "overview" && (
                  <div className="sp-detail-steps">
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Send Contract</span>
                      <StatusToggle
                        value={detailRow.contractSent}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "contractSent", newValue)
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Sign Contract</span>
                      <StatusToggle
                        value={detailRow.contractSigned}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "contractSigned", newValue)
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Client ID</span>
                      <StatusToggle
                        value={detailRow.clientIdDocument || detailRow.id || "Not Done"}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "clientIdDocument", newValue)
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">AML</span>
                      <StatusToggle
                        value={detailRow.aml}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "aml", newValue)
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Recommend Solicitor</span>
                      <StatusToggle
                        value={detailRow.solicitorRecommended}
                        onChange={(newValue) =>
                          handleStatusChange(
                            detailRowIndex,
                            "solicitorRecommended",
                            newValue
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Engage Solicitor</span>
                      <StatusToggle
                        value={detailRow.solicitorEngaged}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "solicitorEngaged", newValue)
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">
                        Mortgage Advisor Recommended
                      </span>
                      <StatusToggle
                        value={detailRow.mortgageAdvisorRecommended}
                        onChange={(newValue) =>
                          handleStatusChange(
                            detailRowIndex,
                            "mortgageAdvisorRecommended",
                            newValue
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Mortgage Valuation Booked</span>
                      <input
                        type="date"
                        value={getDateInputValue(
                          detailRowIndex,
                          "mortgageValBooked",
                          detailRow.mortgageValBooked
                        )}
                        onChange={(e) =>
                          handleDateTyping(
                            detailRowIndex,
                            "mortgageValBooked",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleDateBlur(
                            detailRowIndex,
                            "mortgageValBooked",
                            detailRow.mortgageValBooked
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Mortgage Offer Received</span>
                      <input
                        type="date"
                        value={getDateInputValue(
                          detailRowIndex,
                          "mortgageOfferReceived",
                          detailRow.mortgageOfferReceived
                        )}
                        onChange={(e) =>
                          handleDateTyping(
                            detailRowIndex,
                            "mortgageOfferReceived",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleDateBlur(
                            detailRowIndex,
                            "mortgageOfferReceived",
                            detailRow.mortgageOfferReceived
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Survey Booked</span>
                      <input
                        type="date"
                        value={getDateInputValue(
                          detailRowIndex,
                          "surveyBooked",
                          detailRow.surveyBooked
                        )}
                        onChange={(e) =>
                          handleDateTyping(
                            detailRowIndex,
                            "surveyBooked",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleDateBlur(
                            detailRowIndex,
                            "surveyBooked",
                            detailRow.surveyBooked
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Target Exchange Date</span>
                      <input
                        type="date"
                        value={getDateInputValue(
                          detailRowIndex,
                          "targetExchangeDate",
                          detailRow.targetExchangeDate
                        )}
                        onChange={(e) =>
                          handleDateTyping(
                            detailRowIndex,
                            "targetExchangeDate",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleDateBlur(
                            detailRowIndex,
                            "targetExchangeDate",
                            detailRow.targetExchangeDate
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Target Completion Date</span>
                      <input
                        type="date"
                        value={getDateInputValue(
                          detailRowIndex,
                          "targetCompletionDate",
                          detailRow.targetCompletionDate
                        )}
                        onChange={(e) =>
                          handleDateTyping(
                            detailRowIndex,
                            "targetCompletionDate",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleDateBlur(
                            detailRowIndex,
                            "targetCompletionDate",
                            detailRow.targetCompletionDate
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Exchange Date Set</span>
                      <input
                        type="date"
                        value={getDateInputValue(
                          detailRowIndex,
                          "exchangeDateSet",
                          detailRow.exchangeDateSet
                        )}
                        onChange={(e) =>
                          handleDateTyping(
                            detailRowIndex,
                            "exchangeDateSet",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleDateBlur(
                            detailRowIndex,
                            "exchangeDateSet",
                            detailRow.exchangeDateSet
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Completion Date Set</span>
                      <input
                        type="date"
                        value={getDateInputValue(
                          detailRowIndex,
                          "completionDateSet",
                          detailRow.completionDateSet
                        )}
                        onChange={(e) =>
                          handleDateTyping(
                            detailRowIndex,
                            "completionDateSet",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleDateBlur(
                            detailRowIndex,
                            "completionDateSet",
                            detailRow.completionDateSet
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Invoice Sent</span>
                      <StatusToggle
                        value={detailRow.invoiceSent}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "invoiceSent", newValue)
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Exchange</span>
                      <StatusToggle
                        value={detailRow.exchanged}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "exchanged", newValue)
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Completed</span>
                      <StatusToggle
                        value={detailRow.completed || "Not Done"}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "completed", newValue)
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Payment Expected</span>
                      <input
                        type="date"
                        value={getDateInputValue(
                          detailRowIndex,
                          "paymentExpected",
                          detailRow.paymentExpected
                        )}
                        onChange={(e) =>
                          handleDateTyping(
                            detailRowIndex,
                            "paymentExpected",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          handleDateBlur(
                            detailRowIndex,
                            "paymentExpected",
                            detailRow.paymentExpected
                          )
                        }
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Fee %</span>
                      <input
                        type="text"
                        value={
                          detailRow.feePercent === "" ||
                          detailRow.feePercent === undefined ||
                          detailRow.feePercent === null
                            ? ""
                            : `${detailRow.feePercent}`
                        }
                        onChange={(e) =>
                          handleFeePercentChange(detailRowIndex, e.target.value)
                        }
                        placeholder="1.5%"
                      />
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Invoice Amount</span>
                      <div className="currency-wrapper">
                        <span className="currency-symbol">£</span>
                        <input
                          type="text"
                          value={
                            detailRow.invoiceAmount
                              ? detailRow.invoiceAmount
                                  .toString()
                                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                              : ""
                          }
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/,/g, "");
                            if (!/^\d*$/.test(rawValue)) return;
                            handleStatusChange(
                              detailRowIndex,
                              "invoiceAmount",
                              rawValue === "" ? "" : Number(rawValue)
                            );
                          }}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">Invoice Paid</span>
                      <StatusToggle
                        value={detailRow.invoicePaid}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "invoicePaid", newValue)
                        }
                      />
                    </div>
                  </div>
                )}
                {detailTab === "aml" && (
                  <div className="sp-detail-steps">
                    <div className="sp-detail-row">
                      <span className="sp-detail-label">AML Status</span>
                      <StatusToggle
                        value={detailRow.aml}
                        onChange={(newValue) =>
                          handleStatusChange(detailRowIndex, "aml", newValue)
                        }
                      />
                    </div>
                    <div
                      style={{
                        marginTop: "0.75rem",
                        fontSize: "0.85rem",
                        color: "#6b7280",
                      }}
                    >
                      More AML details can be added here later.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : viewScope !== "fallen" && viewMode === "overview" ? (
            <div className="sp-overview-list">
              {currentRows.map((row, rowIndex) => {
                const primaryName = formatClientFullNameForProgression(row);
                const property = properties.find(p => p.name === row.address);
                const agreedPrice = property && property.offerAmount
                  ? formatCurrency(property.offerAmount)
                  : "";
                const acceptedTs = getAcceptedOfferDate(row);
                const acceptedLabel = acceptedTs
                  ? formatNiceDate(acceptedTs)
                  : "";
                const estimatedExchangeLabel = row.targetExchangeDate
                  ? formatNiceDate(row.targetExchangeDate)
                  : "";
                const progressPercent = getProgressPercent(row);

                return (
                  <div
                    key={rowIndex}
                    className="sp-overview-row"
                    onClick={() => {
                      setDetailRowIndex(rowIndex);
                      setDetailTab("overview");
                    }}
                  >
                    <div className="sp-overview-main">
                      <div className="sp-overview-client">
                        {primaryName}
                      </div>
                    </div>
                    <div className="sp-overview-meta">
                      <div className="sp-overview-meta-item">
                        <span className="sp-overview-meta-label">Progress</span>
                        <div className="sp-progress">
                          <div className="sp-progress-bar">
                            <div
                              className="sp-progress-bar-fill"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="sp-progress-text">
                            {progressPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="sp-overview-meta-item">
                        <span className="sp-overview-meta-label">Acquiring</span>
                        <span className="sp-overview-meta-value sp-overview-property">
                          {row.address || "No property set"}
                        </span>
                      </div>
                      <div className="sp-overview-meta-item">
                        <span className="sp-overview-meta-label">Price</span>
                        <span className="sp-overview-meta-value">
                          {agreedPrice || "Not set"}
                        </span>
                      </div>
                      <div className="sp-overview-meta-item">
                        <span className="sp-overview-meta-label">Offer accepted</span>
                        <span className="sp-overview-meta-value">
                          {acceptedLabel || "Not found"}
                        </span>
                      </div>
                      <div className="sp-overview-meta-item">
                        <span className="sp-overview-meta-label">Est. exchange</span>
                        <span className="sp-overview-meta-value">
                          {estimatedExchangeLabel || "Not set"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
          <div style={{ overflowX: "auto" }}>
            <div className="sales-progression-unified-grid" style={{ display: "grid", gridTemplateColumns: viewScope === 'fallen' ? "1fr" : "1fr", alignItems: "center", justifyItems: "start", minWidth: "max-content", padding: "1rem", fontFamily: "sans-serif", boxSizing: "border-box", gap: "1rem", rowGap: "1rem" }}>
              {/* Header Row */}
              <div style={{ display: "grid", gridTemplateColumns: viewScope === 'fallen' ? "50px 200px 200px 1fr" : "50px 200px 200px 150px 150px 150px 150px 150px 180px 180px 200px 180px 230px 200px 150px 150px 200px 230px 150px 180px 200px 200px 180px 200px 150px 150px 150px 150px 200px 120px 150px 120px", alignItems: "stretch", justifyItems: "start", minWidth: "max-content", padding: "1rem 1rem 0.5rem 1rem" }}>
                {viewScope === 'fallen' ? (
                  <>
                    <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333" }}></div>
                    <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333" }}>Client</div>
                    <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333" }}>Property</div>
                    <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333" }}>Reason</div>
                  </>
                ) : (
                    <>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333" }}></div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "1rem" }}>Client</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Property</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Send Contract</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Sign Contract</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Send Client ID</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>AML</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Recommend Solicitor</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Engage Solicitor</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Solicitor Details</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Recommend Mortgage Advisor</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Mortgage Advisor Details</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Book Mortgage Valuation</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Receive Mortgage Offer</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Recommend Surveyor</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Surveyor Details</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Book Survey</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Recommend SDLT Advisor</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>SDLT Advisor Details</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Target Exchange Date</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Target Completion Date</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Recommend Removals</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Book Removals</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Set Exchange Date</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Set Completion Date</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "0.75rem" }}>Send Invoice</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "0.75rem" }}>Exchange</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Complete</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Payment Expected</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Fee %</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "2.5rem" }}>Invoice Amount</div>
                      <div className="sales-progression-header-column" style={{ fontWeight: 600, fontSize: "1rem", color: "#333", marginRight: "0" }}>Receive Invoice</div>
                    </>
                )}
              </div>
              {/* Tile Rows */}
          {currentRows.map((row, rowIndex) => (
            <div key={rowIndex} className="activity-tile" style={{ display: "grid", gridTemplateColumns: viewScope === 'fallen' ? "50px 200px 200px 1fr" : "50px 200px 200px 150px 150px 150px 150px 150px 180px 180px 200px 180px 230px 200px 150px 150px 200px 230px 150px 180px 200px 200px 180px 200px 150px 150px 150px 150px 200px 120px 150px 120px", alignItems: "center", justifyItems: "start", minWidth: "max-content", padding: "1rem", margin: 0 }}>
                <div className="sales-progression-tile-column" style={{ marginRight: "0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {(viewScope === 'fallen' || !showCompleted) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setClientMenuPosition({ top: rect.bottom + 6, left: rect.left });
                        setOpenClientMenuRow(openClientMenuRow === rowIndex ? null : rowIndex);
                      }}
                      onMouseEnter={() => setHoveredClientButtonRow(rowIndex)}
                      onMouseLeave={() => setHoveredClientButtonRow(null)}
                      style={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                        border: 'none',
                        background: hoveredClientButtonRow === rowIndex ? '#f3f4f6' : 'transparent',
                        cursor: 'pointer'
                      }}
                      aria-label="Client actions"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#555555', display: 'inline-block' }} />
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#555555', display: 'inline-block' }} />
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#555555', display: 'inline-block' }} />
                      </div>
                    </button>
                  )}
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "1rem" }}>
                  <span>{formatClientName(row.client, clients)}</span>
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>{row.address}</div>

                {viewScope === 'fallen' ? (
                  <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>{row.fallThroughReason || '—'}</div>
                ) : null}

                {viewScope === 'fallen' ? null : (
                <>
                {/* Contract & ID */}
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.contractSent}
                    onChange={(newValue) =>{
                      handleStatusChange(rowIndex, "contractSent", newValue);
                      console.log("SalesProgression: Updated contractSent in row", rowIndex, "to", newValue);
                    }}
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.contractSigned}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "contractSigned", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.clientIdDocument || row.id || "Not Done"}
                    onChange={(newValue) => {
                      console.log("SalesProgression: Updating clientIdDocument from", row.clientIdDocument || row.id, "to", newValue, "for row", rowIndex);
                      console.log("Row data:", row);
                      handleStatusChange(rowIndex, "clientIdDocument", newValue);
                    }}
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.aml}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "aml", newValue)
                    }
                  />
                </div>

                {/* Solicitor */}
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.solicitorRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "solicitorRecommended", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.solicitorEngaged}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "solicitorEngaged", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <ProfessionalChooserButton
                    type="Solicitor"
                    value={row.solicitorDetails?.id || ""}
                    label={row.solicitorDetails?.name || ""}
                    professionals={professionals}
                    onSelect={(id, name) => handleInputChange(rowIndex, "solicitorDetails", { id, name })}
                    onAddProfessional={(newProfessional) =>
                      handleAddProfessional(rowIndex, newProfessional, "solicitorDetails")
                    }
                  />
                </div>

                {/* Mortgage */}
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.mortgageAdvisorRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "mortgageAdvisorRecommended", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <ProfessionalChooserButton
                    type="Mortgage Advisor"
                    value={row.mortgageAdvisorDetails?.id || ""}
                    label={row.mortgageAdvisorDetails?.name || ""}
                    professionals={professionals}
                    onSelect={(id, name) => handleInputChange(rowIndex, "mortgageAdvisorDetails", { id, name })}
                    onAddProfessional={(newProfessional) =>
                      handleAddProfessional(rowIndex, newProfessional, "mortgageAdvisorDetails")
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="date"
                      value={getDateInputValue(rowIndex, "mortgageValBooked", row.mortgageValBooked)}
                      onChange={(e) => handleDateTyping(rowIndex, "mortgageValBooked", e.target.value)}
                      onBlur={() => handleDateBlur(rowIndex, "mortgageValBooked", row.mortgageValBooked)}
                    />
                    <button
                      type="button"
                      title="Add note to client"
                      onClick={() => { setQuickNoteClientName(row.client); setQuickNoteSource('Mortgage Val'); setQuickNoteText(""); setShowQuickNoteModal(true); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <i className="fa-solid fa-pen-to-square" style={{ color: '#555555' }} />
                    </button>
                  </div>
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="date"
                      value={getDateInputValue(rowIndex, "mortgageOfferReceived", row.mortgageOfferReceived)}
                      onChange={(e) => handleDateTyping(rowIndex, "mortgageOfferReceived", e.target.value)}
                      onBlur={() => handleDateBlur(rowIndex, "mortgageOfferReceived", row.mortgageOfferReceived)}
                    />
                    <button
                      type="button"
                      title="Add note to client"
                      onClick={() => { setQuickNoteClientName(row.client); setQuickNoteSource('Mortgage Offer'); setQuickNoteText(""); setShowQuickNoteModal(true); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <i className="fa-solid fa-pen-to-square" style={{ color: '#555555' }} />
                    </button>
                  </div>
                </div>

                {/* Survey */}
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.surveyorRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "surveyorRecommended", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <ProfessionalChooserButton
                    type="Surveyor"
                    value={row.surveyorDetails?.id || ""}
                    label={row.surveyorDetails?.name || ""}
                    professionals={professionals}
                    onSelect={(id, name) => handleInputChange(rowIndex, "surveyorDetails", { id, name })}
                    onAddProfessional={(newProfessional) =>
                      handleAddProfessional(rowIndex, newProfessional, "surveyorDetails")
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="date"
                      value={getDateInputValue(rowIndex, "surveyBooked", row.surveyBooked)}
                      onChange={(e) => handleDateTyping(rowIndex, "surveyBooked", e.target.value)}
                      onBlur={() => handleDateBlur(rowIndex, "surveyBooked", row.surveyBooked)}
                    />
                    <button
                      type="button"
                      title="Add note to client"
                      onClick={() => { setQuickNoteClientName(row.client); setQuickNoteSource('Survey'); setQuickNoteText(""); setShowQuickNoteModal(true); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <i className="fa-solid fa-pen-to-square" style={{ color: '#555555' }} />
                    </button>
                  </div>
                </div>

                {/* SDLT */}
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.sdltAdvisorRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "sdltAdvisorRecommended", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <ProfessionalChooserButton
                    type="SDLT Advisor"
                    value={row.sdltAdvisorDetails?.id || ""}
                    label={row.sdltAdvisorDetails?.name || ""}
                    professionals={professionals}
                    onSelect={(id, name) => handleInputChange(rowIndex, "sdltAdvisorDetails", { id, name })}
                    onAddProfessional={(newProfessional) =>
                      handleAddProfessional(rowIndex, newProfessional, "sdltAdvisorDetails")
                    }
                  />
                </div>

                {/* Target dates */}
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "targetExchangeDate", row.targetExchangeDate)}
                    onChange={(e) => handleDateTyping(rowIndex, "targetExchangeDate", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "targetExchangeDate", row.targetExchangeDate)}
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "targetCompletionDate", row.targetCompletionDate)}
                    onChange={(e) => handleDateTyping(rowIndex, "targetCompletionDate", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "targetCompletionDate", row.targetCompletionDate)}
                  />
                </div>

                {/* Removals */}
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.removalsRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "removalsRecommended", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.removalsBooked}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "removalsBooked", newValue)
                    }
                  />
                </div>

                {/* Exchange / completion dates */}
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "exchangeDateSet", row.exchangeDateSet)}
                    onChange={(e) => handleDateTyping(rowIndex, "exchangeDateSet", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "exchangeDateSet", row.exchangeDateSet)}
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "completionDateSet", row.completionDateSet)}
                    onChange={(e) => handleDateTyping(rowIndex, "completionDateSet", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "completionDateSet", row.completionDateSet)}
                  />
                </div>

                {/* Invoice sent followed by exchanged/completed */}
                <div className="sales-progression-tile-column" style={{ marginRight: "0.75rem" }}>
                  <StatusToggle
                    value={row.invoiceSent}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "invoiceSent", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "0.75rem" }}>
                  <StatusToggle
                    value={row.exchanged}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "exchanged", newValue)
                    }
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <StatusToggle
                    value={row.completed || "Not Done"}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "completed", newValue)
                    }
                  />
                </div>
                
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "paymentExpected", row.paymentExpected)}
                    onChange={(e) => handleDateTyping(rowIndex, "paymentExpected", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "paymentExpected", row.paymentExpected)}
                  />
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "2.5rem" }}>
                  <input
                    type="text"
                    value={
                      row.feePercent === "" || row.feePercent === undefined || row.feePercent === null
                        ? ""
                        : `${row.feePercent}`
                    }
                    onChange={(e) => handleFeePercentChange(rowIndex, e.target.value)}
                    placeholder="1.5%"
                    style={{ width: "80px" }}
                  />
                </div>
                <div className="sales-progression-tile-column currency-input" style={{ marginRight: "2.5rem" }}>
                  <div className="currency-wrapper">
                    <span className="currency-symbol">£</span>
                    <input
                      type="text"
                      value={
                        row.invoiceAmount
                          ? row.invoiceAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          : ""
                      }
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/,/g, "");
                        if (!/^\d*$/.test(rawValue)) return;
                        handleStatusChange(
                          rowIndex,
                          "invoiceAmount",
                          rawValue === "" ? "" : Number(rawValue)
                        );
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="sales-progression-tile-column" style={{ marginRight: "0" }}>
                  <StatusToggle
                    value={row.invoicePaid}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "invoicePaid", newValue)
                    }
                  />
                </div>
              </>
              )}
            </div>
          ))}
            </div>
          </div>
          )}
          </>
          )}
          </div>
      {openClientMenuRow !== null && (
        <div
          style={{
            position: 'fixed',
            top: clientMenuPosition.top,
            left: clientMenuPosition.left,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000,
            minWidth: 200
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {viewScope === 'fallen' ? (
            <>
              <button type="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => {
                const currentData = fallenDeals;
                const row = currentData[openClientMenuRow];
                if (row) {
                  setEditFallenRowIndex(openClientMenuRow);
                  setEditFallenReason(row.fallThroughReason || '');
                  setShowEditFallenModal(true);
                }
                setOpenClientMenuRow(null);
              }}>Edit</button>
              <button type="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={async () => {
                // Revive: remove fallenThrough; set dealComplete based on invoicePaid
                const currentData = fallenDeals;
                const row = currentData[openClientMenuRow];
                if (row?.id) {
                  const { updateSalesProgressionById } = await import('../lib/salesProgressionsApi');
                  const newComplete = row.invoicePaid === 'Done';
                  await updateSalesProgressionById(row.id, { fallenThrough: false, fallThroughReason: '', dealComplete: newComplete });
                  // Update the property to set it back to Accepted and Matched
                  const property = properties.find(p => p.name === row.address);
                  if (property?.id) {
                    const { updatePropertyById } = await import('../lib/propertiesApi');
                        const offers = Array.isArray(property.offers) ? [...property.offers] : [];
                        offers.push({ date: new Date().toISOString(), amount: null, status: 'Revived' });
                        await updatePropertyById(property.id, {
                      offerStatus: 'Accepted',
                          status: 'Matched',
                          offers
                    });
                  }
                  // Update client status to Matched
                  const clientName = row.client;
                  if (updateClientStatus) {
                    await updateClientStatus(clientName, 'Matched');
                  }
                }
                setOpenClientMenuRow(null);
              }}>Revive</button>
            </>
          ) : (
            <>
              <button type="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => { /* no-op for now */ setOpenClientMenuRow(null); }}>Delayed Completion</button>
              {(() => {
                const currentData = (showCompleted ? completedDeals : activeDeals);
                const row = currentData[openClientMenuRow] || {};
                return row.invoicePaid === 'Done' ? null : (
                  <button type="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => {
                    setPendingFallRowIndex(openClientMenuRow);
                    setFallThroughReason('');
                    setShowFallThroughModal(true);
                    setOpenClientMenuRow(null);
                  }}>Fallen Through</button>
                );
              })()}
            </>
          )}
        </div>
      )}
      {showFallThroughModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h3>Reason for Fall-Through</h3>
            <p style={{ marginTop: 0, color: '#555' }}>This deal will be moved to "Archived".</p>
            <div className="form-group">
              <textarea
                value={fallThroughReason}
                onChange={(e) => setFallThroughReason(e.target.value)}
                placeholder="Enter reason"
                style={{ width: '100%', minHeight: 120 }}
              />
            </div>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => { setShowFallThroughModal(false); setPendingFallRowIndex(null); }}>Cancel</button>
              <button className="save-btn" onClick={async () => {
                const currentData = showCompleted ? completedDeals : activeDeals;
                const row = currentData[pendingFallRowIndex];
                if (row?.id) {
                  const { updateSalesProgressionById } = await import('../lib/salesProgressionsApi');
                  await updateSalesProgressionById(row.id, { fallenThrough: true, fallThroughReason: fallThroughReason, dealComplete: false });
                  // Also update the linked property and client status to mirror Client page behaviour
                  const property = properties.find(p => p.name === row.address);
                  if (property?.id) {
                    const { updatePropertyById } = await import('../lib/propertiesApi');
                    const originalStatus = property.originalMarketStatus || 'On Market';
                    const offers = Array.isArray(property.offers) ? [...property.offers] : [];
                    offers.push({ date: new Date().toISOString(), amount: null, status: 'Fallen Through' });
                    await updatePropertyById(property.id, {
                      offerStatus: 'Fallen Through',
                      status: originalStatus,
                      offers
                    });
                  }
                  const displayClientName = row.client;
                  
                  // Find the actual client name (not the display name) for activity logging
                  let actualClientName = displayClientName;
                  const client = clients.find(c => {
                    // Check if display name matches
                    if (c.name === displayClientName) return true;
                    // Check formatted names
                    if (c.spouse1FirstName && c.spouse2FirstName) {
                      const bothFirstNames = `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
                      if (displayClientName === bothFirstNames || 
                          (c.spouse1Surname && displayClientName === `${bothFirstNames} ${c.spouse1Surname}`)) {
                        return true;
                      }
                    }
                    if (c.spouse1FirstName) {
                      const singleName = c.spouse1Surname 
                        ? `${c.spouse1FirstName} ${c.spouse1Surname}` 
                        : c.spouse1FirstName;
                      if (displayClientName === singleName) return true;
                    }
                    return false;
                  });
                  if (client) {
                    actualClientName = client.name;
                  }
                  
                  if (updateClientStatus) {
                    await updateClientStatus(actualClientName, 'Searching');
                  }
                  
                  // Log activity for fallen through deal (will appear in both client and property logs)
                  await logActivity({
                    type: "fallenThrough",
                    entityType: "property",
                    entityName: row.address,
                    clientName: actualClientName,
                    propertyName: row.address,
                    details: fallThroughReason || "",
                    status: null
                  });
                }
                setShowFallThroughModal(false);
                setPendingFallRowIndex(null);
                setViewScope('fallen');
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {showPaymentExpectedAlert && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <h3>Please enter a Payment Expected Date</h3>
            <p style={{ marginTop: 0, color: '#555' }}>Set a Payment Expected date before marking Invoice Paid as Done.</p>
            <div className="modal-buttons">
              <button className="save-btn" onClick={() => setShowPaymentExpectedAlert(false)}>Okay</button>
            </div>
          </div>
        </div>
      )}
      {showEditFallenModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h3>Edit Fall-Through Reason</h3>
            <p style={{ marginTop: 0, color: '#555' }}>Update the reason for this fallen through deal.</p>
            <div className="form-group">
              <textarea
                value={editFallenReason}
                onChange={(e) => setEditFallenReason(e.target.value)}
                placeholder="Enter reason"
                style={{ width: '100%', minHeight: 120 }}
              />
            </div>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => { setShowEditFallenModal(false); setEditFallenRowIndex(null); setEditFallenReason(''); }}>Cancel</button>
              <button className="save-btn" onClick={async () => {
                const currentData = fallenDeals;
                const row = currentData[editFallenRowIndex];
                if (row?.id) {
                  const { updateSalesProgressionById } = await import('../lib/salesProgressionsApi');
                  await updateSalesProgressionById(row.id, { fallThroughReason: editFallenReason });
                  
                  // Find the actual client name (not the display name) for activity log update
                  const displayClientName = row.client;
                  let actualClientName = displayClientName;
                  const client = clients.find(c => {
                    // Check if display name matches
                    if (c.name === displayClientName) return true;
                    // Check formatted names
                    if (c.spouse1FirstName && c.spouse2FirstName) {
                      const bothFirstNames = `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
                      if (displayClientName === bothFirstNames || 
                          (c.spouse1Surname && displayClientName === `${bothFirstNames} ${c.spouse1Surname}`)) {
                        return true;
                      }
                    }
                    if (c.spouse1FirstName) {
                      const singleName = c.spouse1Surname 
                        ? `${c.spouse1FirstName} ${c.spouse1Surname}` 
                        : c.spouse1FirstName;
                      if (displayClientName === singleName) return true;
                    }
                    return false;
                  });
                  if (client) {
                    actualClientName = client.name;
                  }
                  
                  // Update the activity log entry for this fallen through deal
                  try {
                    const { getDocs, query, collection, where } = await import('firebase/firestore');
                    const { db } = await import('../lib/firebase');
                    const { updateActivityLog } = await import('../lib/activityLogApi');
                    const activityLogCol = collection(db, 'activityLog');
                    const q = query(
                      activityLogCol,
                      where('type', '==', 'fallenThrough'),
                      where('propertyName', '==', row.address),
                      where('clientName', '==', actualClientName)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                      // Update the most recent fallen through entry (in case there are multiple)
                      const entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                      // Sort by createdAt descending to get the most recent
                      entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                      const mostRecentEntry = entries[0];
                      await updateActivityLog(mostRecentEntry.id, { details: editFallenReason });
                    }
                  } catch (e) {
                    console.error('Error updating activity log for fallen through deal:', e);
                  }
                }
                setShowEditFallenModal(false);
                setEditFallenRowIndex(null);
                setEditFallenReason('');
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {/* Quick note modal temporarily disabled while layout is refactored */}
      </div>
    </div>
  );
};

export default SalesProgression;