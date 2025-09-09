import React, { useState } from "react";
import StatusToggle from "./StatusToggle";
import "./SalesProgression.css";
import ProfessionalChooserButton from "../ProfessionalChooserButton";
import { v4 as uuidv4 } from "uuid";

const SalesProgression = ({
  data,
  setData,
  markPropertyAsSold,
  professionals: initialProfessionals = [],
  setProfessionals: parentSetProfessionals
}) => {
  // Local fallback if no professionals passed from parent
  const [localProfessionals, setLocalProfessionals] = useState(initialProfessionals);

  const [showCompleted, setShowCompleted] = useState(false);

  const completedDeals = data.filter((row) => row.dealComplete);
  const activeDeals = data.filter((row) => !row.dealComplete);

  const professionals = initialProfessionals.length
    ? initialProfessionals
    : localProfessionals;
  const setProfessionals = parentSetProfessionals || setLocalProfessionals;

  const handleStatusChange = (rowIndex, field, newValue) => {
    console.log(`Updating ${field} in row ${rowIndex} to ${newValue}`);

    setData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, [field]: newValue } : row
      )
    );

    // Mark property as sold when exchanged = Done
    if (field === "exchanged" && newValue === "Done") {
      const propertyName = data[rowIndex].address;
      markPropertyAsSold(propertyName);
    }
  };

  const handleInputChange = (rowIndex, field, value) => {
    setData((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, [field]: value } : row
      )
    );
  };

  const handleAddProfessional = (rowIndex, newProfessional, field) => {
    // Ensure the new professional has an ID and default archived state
    const proWithId = {
      ...newProfessional,
      id: newProfessional.id || uuidv4(),
      archived: false, // ✅ always show in Contacts table
    };

    // Add to professionals list
    setProfessionals((prev) => [...prev, proWithId]);

    // Immediately select the new professional for this row
    handleInputChange(rowIndex, field, {
      id: proWithId.id,
      name: proWithId.name,
    });

    console.log("New professional added:", proWithId);
  };

  return (
    <div className="sales-progression">
      <div className="sales-progression-header">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="view-completed-btn"
        >
          {showCompleted ? "Hide Completed Deals" : "View Completed Deals"}
        </button>
      </div>
      <div className="sales-table-container">
        <table className="sales-progression-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Property Address</th>
              <th>Contract Sent</th>
              <th>Contract Signed</th>
              <th>ID</th>
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
              <th>Invoice Amount</th>
              <th>Deal Complete</th>
            </tr>
          </thead>
          <tbody>
            {(showCompleted ? completedDeals : activeDeals).map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>{row.client}</td>
                <td>{row.address}</td>

                {/* Contract & ID */}
                <td>
                  <StatusToggle
                    value={row.contractSent}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "contractSent", newValue)
                    }
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
                    value={row.id}
                    onChange={(newValue) =>
                      handleStatusChange(rowIndex, "id", newValue)
                    }
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
                    onSelect={(id, name) => handleInputChange(rowIndex, "urveyorDetails", { id, name })}
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
  );
};

export default SalesProgression;