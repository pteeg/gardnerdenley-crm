import React, { useState, useEffect } from "react";
import "./ClientPage.css";
import AddClientForm from "./AddClientForm";

// Helper function to format currency nicely (e.g. £1,000)
function formatCurrencyInput(value) {
  const numericValue = value.replace(/[^\d]/g, ""); // remove non-digits
  return numericValue ? "£" + Number(numericValue).toLocaleString("en-UK") : "";
}

function ClientPage({
  client,
  onBack,
  updateClientStatus,
  updateClientProperties,
  updateClientInfo,
  allProperties,
  updatePropertyLinkage,
  updatePropertyOffer,
  removeSalesProgressionRow,
  markPropertyAsAvailable,
  handleCancelMatch: handleCancelMatchFromParent
}) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedPropertyName, setSelectedPropertyName] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editedClient, setEditedClient] = useState(client);
  const [originalName, setOriginalName] = useState(client.name);

  const linkedProperties = allProperties.filter(p => p.linkedClient === client.name);
  const availableProperties = allProperties.filter(p => !p.linkedClient);

  useEffect(() => {
    setEditedClient(client);
    setOriginalName(client.name);
    determineAndUpdateStatus();
  }, [allProperties, client]);

  const handleLinkProperty = (property) => {
    updatePropertyLinkage(property.name, client.name);
    setShowPropertyModal(false);
  };

  const handleLogOffer = () => {
    const numericAmount = parseInt(offerAmount.replace(/[£,]/g, "") || "0");

    updatePropertyOffer(selectedPropertyName, {
      offerAmount: numericAmount,
      offerStatus: "Awaiting Vendor Response"
    });

    setShowOfferModal(false);
    setOfferAmount("");
    setSelectedPropertyName(null);
  };

  const handleOfferAccepted = (propertyName) => {
    updatePropertyOffer(propertyName, {
      offerStatus: "Accepted"
    });
    updateClientStatus(client.name, "Matched");
  };

  const handleOfferDeclined = (propertyName) => {
    updatePropertyOffer(propertyName, {
      offerStatus: "Declined",
      offerAmount: ""
    });
  };

  const handleAbandon = (propertyName) => {
    updatePropertyOffer(propertyName, {
      offerStatus: "Abandoned"
    });
  };

  const handleUnAbandon = (propertyName) => {
    updatePropertyOffer(propertyName, {
      offerStatus: null
    });
  };

  const determineAndUpdateStatus = () => {
    const offerStatuses = linkedProperties.map(p => p.offerStatus);
    if (offerStatuses.includes("Accepted")) {
      updateClientStatus(client.name, "Matched");
    } else if (offerStatuses.includes("Awaiting Vendor Response")) {
      updateClientStatus(client.name, "Awaiting Vendor Response");
    } else {
      updateClientStatus(client.name, "Searching");
    }
  };

  const handleCancelMatch = (propertyName) => {
    const confirm = window.confirm(
      "Are you sure you want to cancel this match? This will remove the sales progression and make the property available again."
    );
    if (!confirm) return;
    if (typeof handleCancelMatchFromParent === "function") {
      handleCancelMatchFromParent(client.name, propertyName);
    }
  };

  const handleUnlinkProperty = (propertyName) => {
    const updatedClientProperties = (client.properties || []).filter(
      (p) => p.name !== propertyName
    );
    updateClientProperties(client.name, updatedClientProperties);
    updatePropertyLinkage(propertyName, null);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditedClient(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEditedClient = () => {
    console.log("🚀 Save clicked");

    const cleaned = {
      ...editedClient,
      name: editedClient.name,
      maxBudget: parseInt(String(editedClient.maxBudget).replace(/[£,]/g, "") || "0"),
      email: editedClient.email || ""
    };

    updateClientInfo(originalName, cleaned);
    setShowEditModal(false);
  };

  return (
    <div className="client-page">
      <div className="client-page-header">
        <button onClick={onBack} className="back-btn">← Back to Clients</button>
        <h1>{client.name}</h1>
        <button className="edit-btn" onClick={() => {
          setEditedClient(client);
          setOriginalName(client.name);
          setShowEditModal(true);
        }}>
          ✏️ Edit
        </button>
      </div>

      <div className="client-details">
        <div className="detail-section">
          <h3>Contact Information</h3>
          <p><strong>Phone:</strong> {client.phoneNumber || "Not provided"}</p>
          <p><strong>Email:</strong> {client.email || "Not provided"}</p>
        </div>

        <div className="detail-section">
          <h3>Project Details</h3>
          <p><strong>Brief:</strong> {client.brief || "No brief provided"}</p>
          <p><strong>Max Budget:</strong> 
            {client.maxBudget 
              ? `£${Number(client.maxBudget).toLocaleString()}` 
              : "Not specified"}
          </p>
          <p><strong>Status:</strong> {client.status}</p>

          <h3>Prospective Properties</h3>
          <button onClick={() => setShowPropertyModal(true)} className="log-offer-btn">
            + Add Prospective Property
          </button>

          {linkedProperties.length === 0 && <p>No properties linked yet.</p>}

          {linkedProperties.map((property) => (
            <div key={property.name} className="property-offer-card">
              <h4>{property.name}</h4>
              {property.offerStatus === "Awaiting Vendor Response" && (
                <>
                  <p>
                    Awaiting response to offer of <strong>
                      £{Number(property.offerAmount).toLocaleString()}
                    </strong>
                  </p>
                  <button onClick={() => handleOfferAccepted(property.name)}>Offer Accepted</button>
                  <button onClick={() => handleOfferDeclined(property.name)}>Offer Declined</button>
                </>
              )}
              {property.offerStatus === "Declined" && (
                <>
                  <p>Offer declined. Property still attached.</p>
                  <button onClick={() => {
                    setSelectedPropertyName(property.name);
                    setShowOfferModal(true);
                  }}>Log Another Offer</button>
                  <button onClick={() => handleAbandon(property.name)}>Abandon</button>
                </>
              )}
              {property.offerStatus === "Abandoned" && (
                <>
                  <p>This property has been marked as abandoned.</p>
                  <button onClick={() => handleUnAbandon(property.name)}>Un-abandon</button>
                </>
              )}
              {!property.offerStatus && (
                <button onClick={() => {
                  setSelectedPropertyName(property.name);
                  setShowOfferModal(true);
                }}>Log Offer</button>
              )}
              {property.offerStatus === "Accepted" ? (
                <button className="cancel-btn" onClick={() => handleCancelMatch(property.name)}>
                  ❌ Cancel Match
                </button>
              ) : (
                <button
                  className="remove-btn"
                  onClick={() => handleUnlinkProperty(property.name)}
                >
                  ❌ Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Log Offer</h3>
            <input
              type="text"
              placeholder="£ Offer Amount"
              value={offerAmount}
              onChange={(e) => setOfferAmount(formatCurrencyInput(e.target.value))}
            />
            <div className="modal-buttons">
              <button onClick={handleLogOffer}>Submit</button>
              <button
                onClick={() => {
                  setOfferAmount("");
                  setSelectedPropertyName(null);
                  setShowOfferModal(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showPropertyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Select Property to Link</h3>
            {availableProperties.length === 0 ? (
              <p>No unlinked properties available.</p>
            ) : (
              availableProperties.map((p) => (
                <div key={p.name} className="property-option">
                  <p>{p.name}</p>
                  <button onClick={() => handleLinkProperty(p)}>Add</button>
                </div>
              ))
            )}
            <button onClick={() => setShowPropertyModal(false)} className="cancel-btn">Close</button>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Client Info</h3>

            <label>Name</label>
            <input
              name="name"
              type="text"
              value={editedClient.name}
              onChange={handleEditInputChange}
            />

            <label>Phone Number</label>
            <input
              name="phoneNumber"
              type="text"
              value={editedClient.phoneNumber}
              onChange={handleEditInputChange}
            />

            <label>Email</label>
            <input
              name="email"
              type="email"
              value={editedClient.email || ""}
              onChange={handleEditInputChange}
            />

            <label>Brief</label>
            <input
              name="brief"
              type="text"
              value={editedClient.brief}
              onChange={handleEditInputChange}
            />

            <label>Max Budget</label>
            <input
              name="maxBudget"
              type="text"
              value={editedClient.maxBudget}
              onChange={handleEditInputChange}
            />

            <div className="modal-buttons">
              <button onClick={handleSaveEditedClient}>Save</button>
              <button onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientPage;