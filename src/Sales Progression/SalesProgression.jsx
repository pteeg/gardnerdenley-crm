import React, { useState, useEffect } from "react";
import StatusToggle from "./StatusToggle";
import "./SalesProgression.css";
import Sidebar from "../Sidebar";
import ProfessionalChooserButton from "../ProfessionalChooserButton";
import { v4 as uuidv4 } from "uuid";

// Helper function to format client names
function formatClientName(clientName, clients = []) {
  // Find the client data to get spouse information
  const client = clients.find(c => c.name === clientName || 
    (c.spouse1FirstName && c.spouse1Surname && 
     `${c.spouse1FirstName} and ${c.spouse2FirstName || c.spouse1FirstName} ${c.spouse1Surname}` === clientName));
  
  if (client && client.spouse1FirstName) {
    if (client.spouse2FirstName) {
      return `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
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

  const completedDeals = data.filter((row) => row.dealComplete);
  const activeDeals = data.filter((row) => !row.dealComplete);
  
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
    if (row?.id && row.id !== "Not Done") {
      console.log("Updating Firestore document with ID:", row.id);
      try {
        const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
        await updateSalesProgressionById(row.id, { [field]: newValue });
        console.log("SalesProgression: Successfully updated", field, "in row", rowIndex, "to", newValue);
      } catch (error) {
        console.error("Error updating sales progression:", error);
      }
    } else {
      console.warn("Cannot update sales progression - no valid document ID. Row ID:", row?.id);
    }

    // Mark property as sold when exchanged = Done
    if (field === "exchanged" && newValue === "Done") {
      const propertyName = currentData[rowIndex].address;
      await markPropertyAsSold(propertyName);
    }

    // Update client status to Complete when deal is completed
    if (field === "dealComplete" && newValue === true) {
      const clientName = currentData[rowIndex].client;
      if (updateClientStatus) {
        await updateClientStatus(clientName, "Complete");
      }
    }
  };

  const handleInputChange = async (rowIndex, field, value) => {
    // Use the correct data array based on what's being displayed
    const currentData = showCompleted ? completedDeals : activeDeals;
    const row = currentData[rowIndex];
    if (row?.id && row.id !== "Not Done") {
      const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
      await updateSalesProgressionById(row.id, { [field]: value });
    } else {
      console.warn("Cannot update sales progression - no valid document ID");
    }
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

  return (
    <div className="sales-progression">
      <div className="sales-progression-body">
        <Sidebar
          title="Sales Prog."
          items={[
            { key: "active", label: "Active Deals", active: !showCompleted, onClick: () => setShowCompleted(false) },
            { key: "completed", label: "Completed Deals", active: showCompleted, onClick: () => setShowCompleted(true) },
          ]}
        />
        <div className="sales-progression-content">
          <div className="sales-table-container">
          <table className="sales-progression-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Property</th>
              <th>Contract Sent</th>
              <th>Contract Signed</th>
              <th>Client ID Sent</th>
              <th>AML</th>
              <th>Solicitor Recommended</th>
              <th>Solicitor Engaged?</th>
              <th>Solicitor Details</th>
              <th>Mortgage Advisor Recommended?</th>
              <th>Mortgage Advisor Details</th>
              <th>Mortgage Valuation Booked?</th>
              <th>Surveyor Recommended?</th>
              <th>Surveyor Details</th>
              <th>Survey Booked?</th>
              <th>SDLT Advisor Recommended?</th>
              <th>Target Exchange Date</th>
              <th>Target Completion Date</th>
              <th>Removals Recommended?</th>
              <th>Removals Booked?</th>
              <th>Exchange Date Set?</th>
              <th>Completion Date Set?</th>
              <th>Exchanged</th>
              <th>Invoice Sent?</th>
              <th>Invoice Paid?</th>
              <th>Payment Expected</th>
              <th>Fee %</th>
              <th>Invoice Amount</th>
              <th>Deal Complete</th>
            </tr>
          </thead>
          <tbody>
            {(showCompleted ? completedDeals : activeDeals).map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>{formatClientName(row.client, clients)}</td>
                <td>{row.address}</td>

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
                  <StatusToggle
                    value={row.mortgageValBooked}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "mortgageValBooked", newValue)
                    }
                  />
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
                  <StatusToggle
                    value={row.surveyBooked}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "surveyBooked", newValue)
                    }
                  />
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

                {/* Target dates */}
                <td>
                  <input
                    type="date"
                    value={
                      /^\d{4}-\d{2}-\d{2}$/.test(row.targetExchangeDate)
                        ? row.targetExchangeDate
                        : ""
                    }
                    onChange={(e) =>
                      handleInputChange(rowIndex, "targetExchangeDate", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={
                      /^\d{4}-\d{2}-\d{2}$/.test(row.targetCompletionDate)
                        ? row.targetCompletionDate
                        : ""
                    }
                    onChange={(e) =>
                      handleInputChange(rowIndex, "targetCompletionDate", e.target.value)
                    }
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
                    value={
                      /^\d{4}-\d{2}-\d{2}$/.test(row.exchangeDateSet)
                        ? row.exchangeDateSet
                        : ""
                    }
                    onChange={(e) =>
                      handleInputChange(rowIndex, "exchangeDateSet", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={
                      /^\d{4}-\d{2}-\d{2}$/.test(row.completionDateSet)
                        ? row.completionDateSet
                        : ""
                    }
                    onChange={(e) =>
                      handleInputChange(rowIndex, "completionDateSet", e.target.value)
                    }
                  />
                </td>

                {/* Final statuses */}
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
                    value={row.invoiceSent}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "invoiceSent", newValue)
                    }
                  />
                </td>
                <td>
                  <StatusToggle
                    value={row.invoicePaid}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "invoicePaid", newValue)
                    }
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={
                      /^\d{4}-\d{2}-\d{2}$/.test(row.paymentExpected)
                        ? row.paymentExpected
                        : ""
                    }
                    onChange={(e) =>
                      handleInputChange(rowIndex, "paymentExpected", e.target.value)
                    }
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
                  <button
                    onClick={() =>
                      handleStatusChange(rowIndex, "dealComplete", true)
                    }
                    disabled={row.dealComplete}
                    className="deal-complete-btn"
                  >
                    {row.dealComplete ? "Completed" : "Mark Complete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesProgression;