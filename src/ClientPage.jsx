import React, { useState, useEffect } from "react";
import "./ClientPage.css";
import AddClientForm from "./AddClientForm";
import PropertySelectionModal from "./PropertySelectionModal";
import NewPropertyModal from "./NewPropertyModal";

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
  salesProgressions = [],
  updatePropertyLinkage,
  updatePropertyOffer,
  removeSalesProgressionRow,
  markPropertyAsAvailable,
  handleCancelMatch: handleCancelMatchFromParent,
  handleAcceptOffer,
  onArchiveClient,
  onDeleteClient,
  professionals
}) {
  const formatClientNameFromClient = (c) => {
    if (!c) return "";
    // If both spouses' first names are present, show first names only
    if (c.spouse1FirstName && c.spouse2FirstName) {
      return `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
    }
    // Otherwise, show the single spouse's first name and surname if available
    if (c.spouse1FirstName || c.spouse1Surname) {
      const first = c.spouse1FirstName || "";
      const surname = c.spouse1Surname || "";
      return [first, surname].filter(Boolean).join(" ");
    }
    // Fallback to legacy combined name field
    return c.name || "";
  };

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedPropertyName, setSelectedPropertyName] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewPropertyModal, setShowNewPropertyModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [editedClient, setEditedClient] = useState(client);
  const [originalName, setOriginalName] = useState(client?.name || "");

  const linkedProperties = allProperties.filter(property => 
    (property.linkedClients && property.linkedClients.includes(client.name)) ||
    property.linkedClient === client.name
  );

  const handleArchiveClient = () => {
    if (window.confirm('Are you sure you want to archive this client?')) {
      onArchiveClient(client.id);
    }
  };

  const handleDeleteClient = () => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      onDeleteClient(client.id);
    }
  };

  const handleUnlinkProperty = (propertyName) => {
    if (window.confirm(`Are you sure you want to unlink ${propertyName} from this client?`)) {
      updatePropertyLinkage(propertyName, null);
      // After unlink, if no other linked properties have an accepted offer, revert client status to Searching
      const remainingAccepted = allProperties.some(p => (
        ((p.linkedClients && p.linkedClients.includes(client.name)) || p.linkedClient === client.name) &&
        p.name !== propertyName && p.offerStatus === "Accepted"
      ));
      if (!remainingAccepted && client.status !== "Searching") {
        updateClientStatus(client.name, "Searching");
      }
    }
  };

  const handleLinkProperty = (property) => {
    updatePropertyLinkage(property.name, client.name);
  };

  const handleCreateAndLinkProperty = async (newProperty) => {
    const { createProperty, updatePropertyById } = await import('./lib/propertiesApi');
    // Create the property and immediately link it using the returned ID
    const newPropertyId = await createProperty(newProperty);
    await updatePropertyById(newPropertyId, {
      linkedClient: client.name,
      linkedClients: [client.name],
      originalMarketStatus: newProperty.status || (newProperty.onMarket ? "On Market" : "Off Market")
    });
    setShowNewPropertyModal(false);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name === 'maxBudget') {
      processedValue = formatCurrencyInput(value);
    }
    
    setEditedClient(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSaveEdit = async () => {
    try {
      await updateClientInfo(client.name, editedClient);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditedClient(client);
    setOriginalName(client?.name || "");
    setShowEditModal(false);
  };

  if (!client) return null;

  return (
    <div className="client-page">
      {/* Header Section */}
      <div className="client-header">
        <div className="client-title-section">
          <button className="back-btn" onClick={onBack} type="button" style={{ marginBottom: '8px' }}>←</button>
          <h1 className="client-title">{formatClientNameFromClient(client)}</h1>
          <div className="client-status">
            <span className="status-badge">
              Status: {client.status || "Active"}
            </span>
            <div className="client-budget">
              <span className="budget-label">Budget: </span>
              <span className="budget-value">{client.maxBudget ? `£${Number(client.maxBudget).toLocaleString()}` : "Not specified"}</span>
            </div>
          </div>
        </div>
        
          <div className="header-actions">
            <div className="action-buttons">
              <button className="edit-button" onClick={() => {
                setEditedClient(client);
                setOriginalName(client.name);
                setShowEditModal(true);
              }}>
                Edit
              </button>
            </div>
          </div>
      </div>

      {/* Main Content Grid */}
      <div className="client-content">
        {/* Left Column */}
        <div className="client-main">
          {/* Contact Details Card */}
          <div className="client-card">
            <h2 className="card-title">Contact Details</h2>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-label">Primary Contact</span>
                <span className="contact-value">{[client.spouse1FirstName, client.spouse1Surname].filter(Boolean).join(" ") || "Not provided"}</span>
              </div>
              {client.spouse2FirstName || client.spouse2Surname ? (
                <div className="contact-item">
                  <span className="contact-label">Secondary Contact</span>
                  <span className="contact-value">{[client.spouse2FirstName, client.spouse2Surname].filter(Boolean).join(" ")}</span>
                </div>
              ) : null}
              <div className="contact-item">
                <span className="contact-label">Phone</span>
                <span className="contact-value">{client.phoneNumber || "Not provided"}</span>
              </div>
              <div className="contact-item">
                <span className="contact-label">Email</span>
                <span className="contact-value">{client.email || "Not provided"}</span>
              </div>
            </div>
          </div>

          {/* Search Details Card */}
          <div className="client-card">
            <h2 className="card-title">Search Details</h2>
            <div className="search-info">
              <div className="search-item">
                <span className="search-label">Search Start Date</span>
                <span className="search-value">{client.searchStartDate || "Not specified"}</span>
              </div>
              <div className="search-item">
                <span className="search-label">Lead Source</span>
                <span className="search-value">{client.clientSource || "Not provided"}</span>
                {client.clientSource === "Referral" && (
                  <div className="referral-detail">
                    <span className="referral-label">Referral Contact:</span>
                    <span className="referral-value">{client.referralContact || "(not contact listed)"}</span>
                  </div>
                )}
              </div>
              <div className="search-item">
                <span className="search-label">Position</span>
                <span className="search-value">{client.positionFunding || "Not specified"}</span>
              </div>
              <div className="search-item">
                <span className="search-label">Disposal</span>
                <span className="search-value">{client.disposal || "Not specified"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="client-sidebar">
          {/* Brief Card */}
          <div className="client-card">
            <h2 className="card-title">Brief</h2>
            <div className="brief-info">
              <div className="brief-item">
                <span className="brief-label">Brief</span>
                <span className="brief-value">{client.brief || "No brief provided"}</span>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="client-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title" style={{ margin: 0 }}>Notes</h2>
              <button
                className="offer-btn"
                style={{ background: "#555", borderColor: "#555" }}
                onClick={() => setShowNoteModal(true)}
              >
                + New Note
              </button>
            </div>
            <div className="notes-list" style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {(client.notes || []).length === 0 ? (
                <span style={{ color: "#666", fontStyle: "italic" }}>No notes yet</span>
              ) : (
                (client.notes || []).map((n, idx) => (
                  <div key={idx} style={{ border: "1px solid #e3eef8", background: "#fff", borderRadius: 6, padding: "8px 10px" }}>
                    <span style={{ color: "#333", fontSize: "0.95rem" }}>
                      {new Date(n.date).toLocaleDateString()}: {n.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prospective Properties Card */}
          <div className="client-card">
            <h2 className="card-title">Prospective Properties</h2>
            <button onClick={() => setShowPropertyModal(true)} className="add-property-btn">
              + Add Prospective Property
            </button>

            <div className="property-cards">
              {linkedProperties.map((property) => {
                return (
                  <div key={property.name} className="prospective-property-card">
                    <div className="property-main-info">
                      <h4>{property.name}</h4>
                      <p className="property-price">
                        Guide Price: {property.price ? `£${Number(property.price).toLocaleString()}` : "No price"}
                      </p>
                      {Array.isArray(property.offers) && property.offers.length > 0 ? (
                        <div className="offer-history">
                          {property.offers.map((o, idx) => (
                            <p key={idx} className="property-price">
                              Offer Logged {new Date(o.date).toLocaleDateString()}: £{Number(o.amount).toLocaleString()} {o.status && `(${o.status})`}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="property-actions">
                      {property.offerStatus && property.offerStatus !== "None" ? (
                        <div className="offer-status">
                          <span className="offer-label">Offer: {property.offerStatus}</span>
                          {property.offerStatus === "Pending" && (
                            <div className="offer-status-buttons">
                              <button
                                className="accept-btn"
                                onClick={() => {
                                  handleAcceptOffer(client.name, property.name);
                                  updatePropertyOffer(property.name, {
                                    offerAmount: property.offerAmount,
                                    offerStatus: "Accepted",
                                    setLastOfferStatus: "Accepted"
                                  });
                                }}
                              >
                                Accept
                              </button>
                              <button
                                className="decline-btn"
                                onClick={() => {
                                  // Decline last pending offer and return to Log Offer state
                                  updatePropertyOffer(property.name, {
                                    offerAmount: null,
                                    offerStatus: "None",
                                    setLastOfferStatus: "Declined"
                                  });
                                }}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          <button
                            className="remove-btn"
                            onClick={() => handleUnlinkProperty(property.name)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="offer-actions">
                          <button
                            className="offer-btn"
                            onClick={() => {
                              setSelectedPropertyName(property.name);
                              setShowOfferModal(true);
                            }}
                          >
                            Log Offer
                          </button>
                          <button
                            className="remove-btn"
                            onClick={() => handleUnlinkProperty(property.name)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <AddClientForm
          initialData={editedClient}
          onSave={async (updatedClient) => {
            try {
              await updateClientInfo(client.name, updatedClient);
              setShowEditModal(false);
            } catch (error) {
              console.error('Error updating client:', error);
            }
          }}
          onClose={handleCancelEdit}
          isEdit={true}
        />
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Log Offer</h3>
            <div className="form-group">
              <label>Offer Amount:</label>
              <input
                type="text"
                placeholder="Enter offer amount"
                value={formatCurrencyInput(offerAmount)}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                  setOfferAmount(digitsOnly);
                }}
              />
            </div>
            <div className="modal-buttons">
              <button onClick={() => {
                if (offerAmount && selectedPropertyName) {
                  updatePropertyOffer(selectedPropertyName, {
                    offerAmount: Number(offerAmount),
                    offerStatus: "Pending",
                    appendOffer: {
                      date: new Date().toISOString(),
                      amount: Number(offerAmount),
                      status: "Pending"
                    }
                  });
                  setShowOfferModal(false);
                  setOfferAmount("");
                  setSelectedPropertyName(null);
                }
              }}>
                Save Offer
              </button>
              <button onClick={() => {
                setShowOfferModal(false);
                setOfferAmount("");
                setSelectedPropertyName(null);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add Note</h3>
            <div className="form-group">
              <label>Note</label>
              <textarea
                rows={5}
                placeholder="Type your note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div className="modal-buttons">
              <button
                onClick={async () => {
                  const text = noteText.trim();
                  if (!text) return;
                  const newNote = { date: new Date().toISOString(), text };
                  const notes = Array.isArray(client.notes) ? [...client.notes, newNote] : [newNote];
                  await updateClientInfo(client.name, { notes });
                  setNoteText("");
                  setShowNoteModal(false);
                }}
              >
                Save
              </button>
              <button onClick={() => { setShowNoteModal(false); setNoteText(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Property Selection Modal */}
      {showPropertyModal && (
        <PropertySelectionModal
          isOpen={showPropertyModal}
          onClose={() => setShowPropertyModal(false)}
          onSelect={handleLinkProperty}
          onAddNewProperty={() => {
            setShowPropertyModal(false);
            setShowNewPropertyModal(true);
          }}
          properties={allProperties}
          linkedProperties={linkedProperties}
          salesProgressions={salesProgressions}
        />
      )}

      {showNewPropertyModal && (
        <NewPropertyModal
          onClose={() => setShowNewPropertyModal(false)}
          onSave={handleCreateAndLinkProperty}
          professionals={professionals}
        />
      )}
    </div>
  );
}

export default ClientPage;