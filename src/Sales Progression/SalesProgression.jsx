import React, { useState, useEffect } from "react";
import StatusToggle from "./StatusToggle";
import "./SalesProgression.css";
import Sidebar from "../Sidebar";
import ProfessionalChooserButton from "../Contacts/ProfessionalChooserButton";
import { v4 as uuidv4 } from "uuid";

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

  const completedDeals = data.filter((row) => row.dealComplete && !row.fallenThrough);
  const fallenDeals = data.filter((row) => row.fallenThrough);
  const activeDeals = data.filter((row) => !row.dealComplete && !row.fallenThrough);
  
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
          // If invoice is already paid, keep client as Completed; otherwise set to Exchanged
          await updateClientStatus(clientName, invoicePaid === "Done" ? "Completed" : "Exchanged");
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
          await updateClientStatus(clientName, "Completed");
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
  // Add-note modal state (from mortgage/survey date rows)
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteClientName, setQuickNoteClientName] = useState("");
  const [quickNoteSource, setQuickNoteSource] = useState("");
  const [showQuickNoteComposer, setShowQuickNoteComposer] = useState(false);

  // View scope: 'active' | 'completed' | 'fallen'
  const [viewScope, setViewScope] = useState('active');

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
        />
        <div className="sales-progression-content">
          {/* Page title matching Contacts page heading style */}
          <h2 className="sp-subtitle">
            {viewScope === 'fallen' ? 'Archived' : (showCompleted ? 'Completed Deals' : 'Active Deals')}
          </h2>
          <div
            className="sales-table-container"
            style={{ overflowX: ((showCompleted ? completedDeals : activeDeals).length === 0) ? 'hidden' : undefined }}
          >
          {((viewScope === 'fallen' ? fallenDeals : (showCompleted ? completedDeals : activeDeals)).length === 0) ? (
            <div style={{ padding: '1rem', color: '#555555', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '240px', textAlign: 'center', width: '100%' }}>
              {viewScope === 'fallen' ? 'No Fallen Through Deals' : (showCompleted ? 'No Completed Deals in Progression' : 'No Active Deals in Progression. Relax 😎')}
            </div>
          ) : (
          <table className="sales-progression-table">
          <thead>
            {viewScope === 'fallen' ? (
              <tr>
                <th>Client</th>
                <th>Property</th>
                <th>Reason</th>
              </tr>
            ) : (
              <tr>
                <th>Client</th>
                <th>Property</th>
                <th>Contract Sent</th>
                <th>Contract Signed</th>
                <th>Client ID Sent</th>
                <th>AML</th>
                <th>Solicitor Recommended</th>
                <th>Solicitor Engaged</th>
                <th>Solicitor Details</th>
                <th>Mortgage Advisor Recommended</th>
                <th>Mortgage Advisor Details</th>
                <th>Mortgage Valuation Booked</th>
                <th>Mortgage Offer Received</th>
                <th>Surveyor Recommended</th>
                <th>Surveyor Details</th>
                <th>Survey Booked</th>
                <th>SDLT Advisor Recommended</th>
                <th>SDLT Advisor Details</th>
                <th>Target Exchange Date</th>
                <th>Target Completion Date</th>
                <th>Removals Recommended</th>
                <th>Removals Booked</th>
                <th>Exchange Date Set</th>
                <th>Completion Date Set</th>
                <th>Invoice Sent</th>
                <th>Exchanged</th>
                <th>Completed</th>
                <th>Payment Expected</th>
                <th>Fee %</th>
                <th>Invoice Amount</th>
                <th>Invoice Paid</th>
              </tr>
            )}
          </thead>
          <tbody>
            {(viewScope === 'fallen' ? fallenDeals : (showCompleted ? completedDeals : activeDeals)).map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                    <span>{formatClientName(row.client, clients)}</span>
                  </div>
                </td>
                <td>{row.address}</td>

                {viewScope === 'fallen' ? (
                  <td>{row.fallThroughReason || '—'}</td>
                ) : null}

                {viewScope === 'fallen' ? null : (
                <>
                {/* Contract & ID */}
                <td>
                  <StatusToggle
                    value={row.contractSent}
                    onChange={(newValue) =>{
                      handleStatusChange(rowIndex, "contractSent", newValue);
                      console.log("SalesProgression: Updated contractSent in row", rowIndex, "to", newValue);
                    }}
                  />
                </td>
                <td>
                  <StatusToggle
                    value={row.contractSigned}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "contractSigned", newValue)
                    }
                  />
                </td>
                <td>
                  <StatusToggle
                    value={row.clientIdDocument || row.id || "Not Done"}
                    onChange={(newValue) => {
                      console.log("SalesProgression: Updating clientIdDocument from", row.clientIdDocument || row.id, "to", newValue, "for row", rowIndex);
                      console.log("Row data:", row);
                      handleStatusChange(rowIndex, "clientIdDocument", newValue);
                    }}
                  />
                </td>
                <td>
                  <StatusToggle
                    value={row.aml}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "aml", newValue)
                    }
                  />
                </td>

                {/* Solicitor */}
                <td>
                  <StatusToggle
                    value={row.solicitorRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "solicitorRecommended", newValue)
                    }
                  />
                </td>
                <td>
                  <StatusToggle
                    value={row.solicitorEngaged}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "solicitorEngaged", newValue)
                    }
                  />
                </td>
                <td>
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
                </td>

                {/* Mortgage */}
                <td>
                  <StatusToggle
                    value={row.mortgageAdvisorRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "mortgageAdvisorRecommended", newValue)
                    }
                  />
                </td>
                <td>
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
                </td>
                <td>
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
                </td>
                <td>
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
                </td>

                {/* Survey */}
                <td>
                  <StatusToggle
                    value={row.surveyorRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "surveyorRecommended", newValue)
                    }
                  />
                </td>
                <td>
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
                </td>
                <td>
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
                </td>

                {/* SDLT */}
                <td>
                  <StatusToggle
                    value={row.sdltAdvisorRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "sdltAdvisorRecommended", newValue)
                    }
                  />
                </td>
                <td>
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
                </td>

                {/* Target dates */}
                <td>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "targetExchangeDate", row.targetExchangeDate)}
                    onChange={(e) => handleDateTyping(rowIndex, "targetExchangeDate", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "targetExchangeDate", row.targetExchangeDate)}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "targetCompletionDate", row.targetCompletionDate)}
                    onChange={(e) => handleDateTyping(rowIndex, "targetCompletionDate", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "targetCompletionDate", row.targetCompletionDate)}
                  />
                </td>

                {/* Removals */}
                <td>
                  <StatusToggle
                    value={row.removalsRecommended}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "removalsRecommended", newValue)
                    }
                  />
                </td>
                <td>
                  <StatusToggle
                    value={row.removalsBooked}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "removalsBooked", newValue)
                    }
                  />
                </td>

                {/* Exchange / completion dates */}
                <td>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "exchangeDateSet", row.exchangeDateSet)}
                    onChange={(e) => handleDateTyping(rowIndex, "exchangeDateSet", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "exchangeDateSet", row.exchangeDateSet)}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "completionDateSet", row.completionDateSet)}
                    onChange={(e) => handleDateTyping(rowIndex, "completionDateSet", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "completionDateSet", row.completionDateSet)}
                  />
                </td>

                {/* Invoice sent followed by exchanged/completed */}
                <td>
                  <StatusToggle
                    value={row.invoiceSent}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "invoiceSent", newValue)
                    }
                  />
                </td>
                <td>
                  <StatusToggle
                    value={row.exchanged}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "exchanged", newValue)
                    }
                  />
                </td>
                <td>
                  <StatusToggle
                    value={row.completed || "Not Done"}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "completed", newValue)
                    }
                  />
                </td>
                
                <td>
                  <input
                    type="date"
                    value={getDateInputValue(rowIndex, "paymentExpected", row.paymentExpected)}
                    onChange={(e) => handleDateTyping(rowIndex, "paymentExpected", e.target.value)}
                    onBlur={() => handleDateBlur(rowIndex, "paymentExpected", row.paymentExpected)}
                  />
                </td>
                <td>
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
                </td>
                <td className="currency-input">
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
                </td>
                <td>
                  <StatusToggle
                    value={row.invoicePaid}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "invoicePaid", newValue)
                    }
                  />
                </td>
                </>
                )}
              </tr>
            ))}
          </tbody>
          </table>
          )}
          </div>
        </div>
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
                  const clientName = row.client;
                  if (updateClientStatus) {
                    await updateClientStatus(clientName, 'Searching');
                  }
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
      {showQuickNoteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h3>Notes — {quickNoteSource || 'General'}</h3>
            <div className="notes-list" style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                const clientObj = (Array.isArray(clients) ? clients : []).find(c => c.name === quickNoteClientName) || {};
                const allNotes = Array.isArray(clientObj.notes) ? clientObj.notes : [];
                const prefix = quickNoteSource ? `${quickNoteSource} — ` : '';
                const filtered = allNotes.filter(n => (n?.text || '').startsWith(prefix));
                if (filtered.length === 0) {
                  return <span style={{ color: '#666', fontStyle: 'italic' }}>No notes yet</span>;
                }
                return filtered.map((n, idx) => {
                  const content = (n.text || '').replace(prefix, '');
                  return (
                    <div key={idx} className="note-row">
                      <span className="note-text">
                        {new Date(n.date).toLocaleDateString()}: {content}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>

            {!showQuickNoteComposer ? (
              <div className="modal-buttons">
                <button className="save-btn" onClick={() => setShowQuickNoteComposer(true)}>+ New Note</button>
                <button className="cancel-btn" onClick={() => { setShowQuickNoteModal(false); setQuickNoteText(""); setShowQuickNoteComposer(false); }}>Close</button>
              </div>
            ) : (
              <>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Note</label>
                  <textarea
                    rows={5}
                    placeholder="Type your note..."
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="modal-buttons">
                  <button
                    className="save-btn"
                    onClick={async () => {
                      const text = quickNoteText.trim();
                      if (!text) { setShowQuickNoteComposer(false); setQuickNoteText(""); return; }
                      try {
                        if (quickNoteClientName) {
                          const { getDocs, query, collection, where } = await import('firebase/firestore');
                          const { db } = await import('../lib/firebase');
                          const { updateClientById } = await import('../lib/clientsApi');
                          const clientsCol = collection(db, 'clients');
                          const q = query(clientsCol, where('name', '==', quickNoteClientName));
                          const snap = await getDocs(q);
                          if (!snap.empty) {
                            const doc = snap.docs[0];
                            const data = doc.data() || {};
                            const prefix = quickNoteSource ? `${quickNoteSource} — ` : "";
                            const notes = Array.isArray(data.notes)
                              ? [...data.notes, { date: new Date().toISOString(), text: `${prefix}${text}` }]
                              : [{ date: new Date().toISOString(), text: `${prefix}${text}` }];
                            await updateClientById(doc.id, { notes });
                          }
                        }
                      } catch (e) { console.error('Failed to add note from Sales Progression:', e); }
                      setShowQuickNoteComposer(false);
                      setQuickNoteText("");
                    }}
                  >
                    Save
                  </button>
                  <button className="cancel-btn" onClick={() => { setShowQuickNoteComposer(false); setQuickNoteText(""); }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesProgression;