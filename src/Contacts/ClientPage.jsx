import React, { useState, useEffect } from "react";
import "./ClientPage.css";
import AddClientForm from "./AddClientForm";
import PropertySelectionModal from "../Properties/PropertySelectionModal";
import NewPropertyModal from "../Properties/NewPropertyModal";
import { logActivity } from "../lib/activityLogApi";
import EntityActivityLog from "../EntityActivityLog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faAt, faPen, faHeart as faHeartSolid } from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';

function ClientPage({
  client,
  onBack,
  updateClientStatus,
  updateClientProperties,
  updateClientInfo,
  allProperties,
  salesProgressions = [],
  allClients = [],
  updatePropertyLinkage,
  updatePropertyOffer,
  removeSalesProgressionRow,
  markPropertyAsAvailable,
  handleCancelMatch: handleCancelMatchFromParent,
  handleAcceptOffer,
  onArchiveClient,
  onDeleteClient,
  professionals,
  onOpenEmailWithTemplate,
}) {
  const formatClientNameFromClient = (c) => {
    if (!c) return "";
    // If both spouses' first names are present, show both first names + primary surname when available
    if (c.spouse1FirstName && c.spouse2FirstName) {
      return c.spouse1Surname
        ? `${c.spouse1FirstName} and ${c.spouse2FirstName} ${c.spouse1Surname}`
        : `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
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

  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewPropertyModal, setShowNewPropertyModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [associateSearch, setAssociateSearch] = useState("");
  const [selectedAssociate, setSelectedAssociate] = useState(null);
  const [associateRelation, setAssociateRelation] = useState("");
  
  const [showFallThroughModal, setShowFallThroughModal] = useState(false);
  const [fallThroughReason, setFallThroughReason] = useState("");
  const [pendingUnlinkProperty, setPendingUnlinkProperty] = useState(null);
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [showProspectivePropertiesModal, setShowProspectivePropertiesModal] = useState(false);
  const [showSearchDetailsModal, setShowSearchDetailsModal] = useState(false);
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("brief");
  const [briefText, setBriefText] = useState(client?.brief || "");

  const [editedClient, setEditedClient] = useState(client);
  const [originalName, setOriginalName] = useState(client?.name || "");

  // Sync editedClient when client prop changes
  useEffect(() => {
    setEditedClient(client);
  }, [client]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showOptionsDropdown && !event.target.closest('.options-dropdown-container')) {
        setShowOptionsDropdown(false);
      }
    };

    if (showOptionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showOptionsDropdown]);

  const linkedProperties = allProperties.filter(property => 
    (property.linkedClients && property.linkedClients.includes(client.name)) ||
    property.linkedClient === client.name
  );

  const formatPrimaryDisplayName = () => {
    const namePart = [client.spouse1FirstName, client.spouse1Surname].filter(Boolean).join(" ");
    const titled = [client.spouse1Title, namePart].filter(Boolean).join(" ");
    return titled || client.name || "Primary client";
  };

  const buildPhoneTooltip = () => {
    const primaryName = formatPrimaryDisplayName();
    const primaryPhone = client.phoneNumber || "No phone";
    return `${primaryName}: ${primaryPhone}`;
  };

  const buildEmailTooltip = () => {
    const primaryName = formatPrimaryDisplayName();
    const primaryEmail = client.email || "No email";
    return `${primaryName}: ${primaryEmail}`;
  };

  const [showPhoneTooltip, setShowPhoneTooltip] = useState(false);
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);

  const handleArchiveClient = () => {
    if (window.confirm('Are you sure you want to archive this client?')) {
      onArchiveClient(client);
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

  const handleFallenThrough = async (propertyName, reason) => {
    try {
      const property = allProperties.find(p => p.name === propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import('../lib/propertiesApi');
        const originalStatus = property.originalMarketStatus || 'On Market';
        // Append a timeline entry to offers for audit trail
        const offers = Array.isArray(property.offers) ? [...property.offers] : [];
        offers.push({ date: new Date().toISOString(), amount: null, status: 'Fallen Through' });
        await updatePropertyById(property.id, {
          offerStatus: 'Fallen Through',
          status: originalStatus,
          offers
        });
        // Reflect in any progression rows (fall-through removes from Wonga)
        try {
          const { updateSalesProgressionById } = await import('../lib/salesProgressionsApi');
          const { getDocs, query, collection, where } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const spCol = collection(db, 'salesProgressions');
          const q = query(spCol, where('client', '==', client.name), where('address', '==', propertyName));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const target = snap.docs[0];
            await updateSalesProgressionById(target.id, { fallenThrough: true, fallThroughReason: reason, dealComplete: false });
          }
        } catch (e) { console.warn('Progression sync on fall-through failed (non-fatal):', e); }
        await updateClientStatus(client.name, 'Searching');
        
        // Log activity for fallen through deal (will appear in both client and property logs)
        await logActivity({
          type: "fallenThrough",
          entityType: "property",
          entityName: propertyName,
          clientName: client.name,
          propertyName: propertyName,
          details: reason || "",
          status: null
        });
      }
    } catch (e) {
      console.error('Error handling fallen through:', e);
    }
  };

  const handleRevive = async (propertyName) => {
    try {
      const property = allProperties.find(p => p.name === propertyName);
      if (property?.id) {
        const { updatePropertyById } = await import('../lib/propertiesApi');
        // Append a timeline entry to offers for audit trail
        const offers = Array.isArray(property.offers) ? [...property.offers] : [];
        offers.push({ date: new Date().toISOString(), amount: null, status: 'Revived' });
        await updatePropertyById(property.id, {
          offerStatus: 'Accepted',
          status: 'Matched',
          offers
        });
        // Sales progression: clear fallenThrough, set dealComplete based on invoicePaid
        try {
          const { updateSalesProgressionById } = await import('../lib/salesProgressionsApi');
          const { getDocs, query, collection, where } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const spCol = collection(db, 'salesProgressions');
          const q = query(spCol, where('client', '==', client.name), where('address', '==', propertyName));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const target = snap.docs[0];
            const rowData = target.data();
            const newComplete = rowData.invoicePaid === 'Done';
            await updateSalesProgressionById(target.id, { fallenThrough: false, dealComplete: newComplete });
          }
        } catch (e) { console.warn('Progression sync on revive failed (non-fatal):', e); }
        await updateClientStatus(client.name, 'Matched');
      }
    } catch (e) {
      console.error('Error handling revive:', e);
    }
  };

  const handleLinkProperty = (property) => {
    updatePropertyLinkage(property.name, client.name);
  };

  const handleCreateAndLinkProperty = async (newProperty) => {
    const { createProperty, updatePropertyById } = await import('../lib/propertiesApi');
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

  const formatListName = (c) => {
    if (!c) return "";
    if (c.spouse1FirstName && c.spouse2FirstName) {
      return c.spouse1Surname
        ? `${c.spouse1FirstName} and ${c.spouse2FirstName} ${c.spouse1Surname}`
        : `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
    }
    if (c.spouse1FirstName || c.spouse1Surname) {
      return [c.spouse1FirstName || "", c.spouse1Surname || ""].filter(Boolean).join(" ");
    }
    return c.name || "";
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
      <div className="client-header" style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <button className="back-btn" onClick={onBack} type="button">
            <i className="fa-solid fa-arrow-left" style={{ color: '#555555', fontSize: '1.4rem' }} />
          </button>
          {/* Wrapper to keep name tile and tabs tile on the same row */}
          <div className="client-tiles-container" style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flex: 1, flexWrap: "nowrap", width: "100%" }}>
            {/* Left tile - Name and info */}
            <div className="client-header-tile client-name-tile">
              <div className="client-title-section">
                <h1 className="client-title">
                  {formatClientNameFromClient(client)}
                </h1>
                <div className="client-current-address">
                  {client.currentAddress || "No current address provided"}
                </div>

                {/* Row: Phone, Email, Favourite, Options */}
                <div className="client-contact-row">
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (client.phoneNumber) {
                          window.location.href = `tel:${client.phoneNumber}`;
                        }
                      }}
                      onMouseEnter={() => setShowPhoneTooltip(true)}
                      onMouseLeave={() => setShowPhoneTooltip(false)}
                      style={{
                        background: "#f3f4f6",
                        border: "none",
                        cursor: client.phoneNumber ? "pointer" : "default",
                        padding: 0,
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#555555"
                      }}
                    >
                      <FontAwesomeIcon icon={faPhone} style={{ fontSize: "1.2rem" }} />
                    </button>
                    {showPhoneTooltip && (
                      <div
                        style={{
                          position: "absolute",
                          top: "115%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#333",
                          color: "#fff",
                          padding: "0.35rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                          zIndex: 10
                        }}
                      >
                        {buildPhoneTooltip()}
                      </div>
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                    e.stopPropagation();
                    if (client.email) {
                      if (onOpenEmailWithTemplate) {
                        onOpenEmailWithTemplate({
                          email: client.email,
                          name: formatPrimaryDisplayName(),
                        });
                      } else {
                        window.location.href = `mailto:${client.email}`;
                      }
                    }
                      }}
                      onMouseEnter={() => setShowEmailTooltip(true)}
                      onMouseLeave={() => setShowEmailTooltip(false)}
                      style={{
                        background: "#f3f4f6",
                        border: "none",
                        cursor: client.email ? "pointer" : "default",
                        padding: 0,
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#555555"
                      }}
                    >
                      <FontAwesomeIcon icon={faAt} style={{ fontSize: "1.2rem" }} />
                    </button>
                    {showEmailTooltip && (
                      <div
                        style={{
                          position: "absolute",
                          top: "115%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#333",
                          color: "#fff",
                          padding: "0.35rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                          zIndex: 10
                        }}
                      >
                        {buildEmailTooltip()}
                      </div>
                    )}
                  </div>

                  <button
                    aria-label={client.favourite ? 'Unfavourite' : 'Favourite'}
                    className="icon-button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (updateClientInfo && client.name) {
                        await updateClientInfo(client.name, { favourite: !client.favourite });
                      } else if (client.id) {
                        const { updateClientById } = await import('../lib/clientsApi');
                        await updateClientById(client.id, { favourite: !client.favourite });
                      }
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FontAwesomeIcon icon={client.favourite ? faHeartSolid : faHeartRegular} style={{ color: '#555555', width: '22px', height: '22px' }} />
                  </button>

                  <div className="options-dropdown-container">
                    <button 
                      className="edit-button client-options-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptionsDropdown(!showOptionsDropdown);
                      }}
                    >
                      Options
                    </button>
                    {showOptionsDropdown && (
                      <div className="options-dropdown">
                        <button
                          className="dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditedClient(client);
                            setOriginalName(client.name);
                            setShowEditModal(true);
                            setShowOptionsDropdown(false);
                          }}
                        >
                          Edit
                        </button>
                        {client.status === "Archived" && updateClientStatus ? (
                          <button
                            className="dropdown-item"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await updateClientStatus(client.name, "Searching");
                              setShowOptionsDropdown(false);
                            }}
                          >
                            Unarchive
                          </button>
                        ) : (
                          onArchiveClient && (
                            <button
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveClient();
                                setShowOptionsDropdown(false);
                              }}
                            >
                              Archive
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row: Status (just above Budget) */}
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="budget-label">Status:</span>
                  <span className={`status-badge ${(client.status || "active").toLowerCase().replace(/\s/g, '-') }`}>
                    {client.status || "Active"}
                  </span>
                </div>

                {/* Row: Budget */}
                <div style={{ marginTop: '1.1rem', fontSize: '1rem' }}>
                  <span style={{ color: '#555', fontWeight: 400 }}>Budget: </span>
                  <span style={{ fontWeight: 600 }}>
                    {client.maxBudget ? `£${Number(client.maxBudget).toLocaleString()}` : "Not specified"}
                  </span>
                </div>

                {/* Row: Position */}
                <div style={{ marginTop: '0.35rem', fontSize: '1rem' }}>
                  <span style={{ color: '#555', fontWeight: 400 }}>Position: </span>
                  <span style={{ fontWeight: 500 }}>
                    {client.positionFunding || "Not specified"}
                  </span>
                </div>

                {/* Row: Disposal */}
                <div style={{ marginTop: '0.35rem', fontSize: '1rem' }}>
                  <span style={{ color: '#555', fontWeight: 400 }}>Disposal: </span>
                  <span style={{ fontWeight: 500 }}>
                    {client.disposal || "Not specified"}
                  </span>
                </div>
              </div>
            </div>
            {/* Right tile - Tabs and content */}
            <div className="client-header-tile client-tabs-tile" style={{ flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", overflow: "hidden" }}>
                {/* Tab buttons */}
                <div className="client-tabs">
                  <button
                    type="button"
                    className={`client-tab-button ${activeTab === "brief" ? "active" : ""}`}
                    onClick={() => setActiveTab("brief")}
                  >
                    Brief
                  </button>
                  <button
                    type="button"
                    className={`client-tab-button ${activeTab === "prospectiveProperties" ? "active" : ""}`}
                    onClick={() => setActiveTab("prospectiveProperties")}
                  >
                    Prospective Properties
                  </button>
                  <button
                    type="button"
                    className={`client-tab-button ${activeTab === "documents" ? "active" : ""}`}
                    onClick={() => setActiveTab("documents")}
                  >
                    Documents
                  </button>
                  <button
                    type="button"
                    className={`client-tab-button ${activeTab === "searchDetails" ? "active" : ""}`}
                    onClick={() => setActiveTab("searchDetails")}
                  >
                    More Info
                  </button>
                </div>
                {/* Tab content */}
                <div className="client-tab-content">
                  {activeTab === "prospectiveProperties" && (
                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                      <div className="property-cards" style={{ flex: 1, maxHeight: '400px', overflowY: 'auto' }}>
                        {linkedProperties.length === 0 ? (
                          <p style={{ color: "#666", fontStyle: "italic" }}>No prospective properties</p>
                        ) : (
                          linkedProperties.map((property) => (
                            <div key={property.name} className="prospective-property-card">
                              <div 
                                className="property-main-info"
                                style={{ cursor: "pointer", flex: 1 }}
                                onClick={() => {
                                  window.dispatchEvent(
                                    new CustomEvent("openPropertyByName", {
                                      detail: { name: property.name },
                                    })
                                  );
                                }}
                              >
                                <h4>{property.name}</h4>
                                <p className="property-price">
                                  Guide Price: {property.price ? `£${Number(property.price).toLocaleString()}` : "No price"}
                                </p>
                              </div>
                              <div className="property-actions">
                                <button
                                  className="remove-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnlinkProperty(property.name);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <button onClick={() => setShowPropertyModal(true)} className="add-property-btn">
                          + Add Prospective Property
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === "documents" && (
                    <div>
                      <p style={{ color: "#666", fontStyle: "italic" }}>Documents feature coming soon</p>
                    </div>
                  )}
                  {activeTab === "brief" && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#333' }}>Brief</span>
                        <button
                          type="button"
                          className="brief-edit-button"
                          onClick={() => {
                            setBriefText(client.brief || "");
                            setShowBriefModal(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faPen} style={{ width: 12, height: 12 }} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#333' }}>
                        {client.brief || "No brief provided"}
                      </p>
                    </div>
                  )}
                  {activeTab === "searchDetails" && (
                    <div>
                      <div className="search-info">
                        <div className="search-item">
                          <span className="search-label">Contact Type</span>
                          <span className="search-value">
                            {Array.isArray(client.types) && client.types.length > 0 ? (
                              client.types.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="status-badge"
                                  style={{
                                    background: "#eef5ff",
                                    color: "#2b6cb0",
                                    border: "1px solid #b3d0ff",
                                    marginRight: "0.3rem",
                                  }}
                                >
                                  {t}
                                </span>
                              ))
                            ) : (
                              "Not specified"
                            )}
                          </span>
                        </div>
                        <div className="search-item">
                          <span className="search-label">Search Start Date</span>
                          <span className="search-value">{client.searchStartDate || "Not specified"}</span>
                        </div>
                        <div className="search-item">
                          <span className="search-label">Lead Source</span>
                          <span className="search-value">
                            {client.clientSource === "Referral" 
                              ? `Referral: ${client.referralContact || "(no contact added)"}`
                              : (client.clientSource || "Not provided")
                            }
                          </span>
                          {client.clientSource === "Referral" && client.referralContact && (
                            <div className="referral-detail">
                              <button
                                type="button"
                                onClick={() => {
                                  const name = client.referralContact;
                                  const event = new CustomEvent('openClientByName', { detail: { name } });
                                  window.dispatchEvent(event);
                                }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  background: '#f3f4f6', border: '1px solid #d1d5db', color: '#333',
                                  borderRadius: 16, padding: '4px 10px', cursor: 'pointer', marginTop: '0.5rem'
                                }}
                              >
                                {client.referralContact}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
          allClients={allClients}
          professionals={professionals}
        />
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingNoteIndex !== null ? "Edit Note" : "Add Note"}</h3>
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
                  if (editingNoteIndex !== null) {
                    const notes = Array.isArray(client.notes) ? [...client.notes] : [];
                    if (notes[editingNoteIndex]) {
                      notes[editingNoteIndex] = { ...notes[editingNoteIndex], text };
                    }
                    await updateClientInfo(client.name, { notes });
                  } else {
                    const newNote = { date: new Date().toISOString(), text };
                    const notes = Array.isArray(client.notes) ? [...client.notes, newNote] : [newNote];
                    await updateClientInfo(client.name, { notes });
                    // Log the activity
                    await logActivity({
                      type: "note",
                      entityType: "client",
                      entityName: client.name,
                      details: text,
                    });
                  }
                  setNoteText("");
                  setEditingNoteIndex(null);
                  setShowNoteModal(false);
                }}
              >
                Save
              </button>
              <button onClick={() => { setShowNoteModal(false); setNoteText(""); setEditingNoteIndex(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Associate Contact Modal */}
      {showAssociateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Link Associated Contact</h3>
            <div className="form-group">
              <label>Search Contact</label>
              <input
                type="text"
                placeholder="Type to search..."
                value={associateSearch}
                onChange={(e) => { setAssociateSearch(e.target.value); setSelectedAssociate(null); }}
              />
            </div>
            <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '8px' }}>
              {associateSearch.trim() ? (
                <table className="wonga-table">
                  <tbody>
                    {allClients
                      .filter(c => c.name !== client.name)
                      .filter(c => formatListName(c).toLowerCase().includes(associateSearch.trim().toLowerCase()))
                      .slice(0, 20)
                      .map((c, i) => (
                        <tr key={i} className="clickable-row" onClick={() => setSelectedAssociate(c)}>
                          <td>{formatListName(c)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : null}
            </div>

            {selectedAssociate && (
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label>Relationship</label>
                <input
                  type="text"
                  placeholder="Describe the relationship"
                  value={associateRelation}
                  onChange={(e) => setAssociateRelation(e.target.value)}
                />
              </div>
            )}

            <div className="modal-buttons">
              <button
                onClick={async () => {
                  if (!selectedAssociate) return;
                  const entry = { client: selectedAssociate, relation: associateRelation.trim() };
                  const list = Array.isArray(client.associatedContacts) ? [...client.associatedContacts, entry] : [entry];
                  await updateClientInfo(client.name, { associatedContacts: list });
                  setShowAssociateModal(false);
                  setAssociateSearch("");
                  setSelectedAssociate(null);
                  setAssociateRelation("");
                }}
                disabled={!selectedAssociate}
              >
                Add
              </button>
              <button onClick={() => { setShowAssociateModal(false); setAssociateSearch(""); setSelectedAssociate(null); setAssociateRelation(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ padding: "0.1rem 1.5rem 1.25rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem", paddingLeft: "calc(56px + 0.75rem)" }}>
          {/* Left Column - Activity Log (full width) */}
          <div style={{ overflow: "hidden", boxSizing: "border-box" }}>
            <EntityActivityLog
              entityType="client"
              entityName={client.name}
              title="Recent Activity"
              clients={allClients}
              properties={allProperties}
              onAcceptOffer={handleAcceptOffer}
              onUpdateClientStatus={updateClientStatus}
              onUpdatePropertyOffer={updatePropertyOffer}
              onCreateSalesProgression={handleAcceptOffer}
              onRemoveSalesProgression={removeSalesProgressionRow}
              onNoteClick={() => setShowNoteModal(true)}
              onLogOfferClick={() => {
                window.dispatchEvent(
                  new CustomEvent("logOfferForClient", {
                    detail: { clientName: client.name },
                  })
                );
              }}
              onPhoneCallNoteClick={() => {
                window.dispatchEvent(
                  new CustomEvent("logNoteForClient", {
                    detail: { clientName: client.name, isPhoneCall: true },
                  })
                );
              }}
            />
          </div>
        </div>
      </div>

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

      {/* Fallen Through Modal */}
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
              <button className="cancel-btn" onClick={() => { setShowFallThroughModal(false); setPendingUnlinkProperty(null); }}>Cancel</button>
              <button className="save-btn" onClick={async () => {
                if (pendingUnlinkProperty) {
                  await handleFallenThrough(pendingUnlinkProperty, fallThroughReason);
                }
                setShowFallThroughModal(false);
                setPendingUnlinkProperty(null);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Brief Edit Modal */}
      {showBriefModal && (
        <div className="modal-overlay" onClick={() => setShowBriefModal(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h3>Edit</h3>
            <div style={{ marginTop: '1rem' }}>
              <textarea
                rows={6}
                style={{ width: '100%', resize: 'vertical' }}
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
                placeholder="Type the client's brief..."
              />
            </div>
            <div className="modal-buttons">
              <button
                className="save-btn"
                onClick={async () => {
                  try {
                    const trimmed = briefText.trim();
                    if (updateClientInfo && client.name) {
                      await updateClientInfo(client.name, { brief: trimmed });
                    } else if (client.id) {
                      const { updateClientById } = await import('../lib/clientsApi');
                      await updateClientById(client.id, { brief: trimmed });
                    }
                    setShowBriefModal(false);
                  } catch (e) {
                    console.error('Error updating brief:', e);
                  }
                }}
                disabled={!briefText.trim()}
              >
                Save
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowBriefModal(false);
                  setBriefText(client.brief || "");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prospective Properties Modal */}
      {showProspectivePropertiesModal && (
        <div className="modal-overlay" onClick={() => setShowProspectivePropertiesModal(false)}>
          <div className="modal-content" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Prospective Properties</h3>
              <button onClick={() => setShowPropertyModal(true)} className="add-property-btn">
                + Add Prospective Property
              </button>
            </div>
            <div className="property-cards" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {linkedProperties.length === 0 ? (
                <p style={{ color: "#666", fontStyle: "italic" }}>No prospective properties</p>
              ) : (
                linkedProperties.map((property) => (
                  <div key={property.name} className="prospective-property-card">
                    <div 
                      className="property-main-info"
                      style={{ cursor: "pointer", flex: 1 }}
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("openPropertyByName", {
                            detail: { name: property.name },
                          })
                        );
                        setShowProspectivePropertiesModal(false);
                      }}
                    >
                      <h4>{property.name}</h4>
                      <p className="property-price">
                        Guide Price: {property.price ? `£${Number(property.price).toLocaleString()}` : "No price"}
                      </p>
                    </div>
                    <div className="property-actions">
                      <button
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkProperty(property.name);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowProspectivePropertiesModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Search Details Modal */}
      {showSearchDetailsModal && (
        <div className="modal-overlay" onClick={() => setShowSearchDetailsModal(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h3>Search Details</h3>
            <div className="search-info" style={{ marginTop: '1rem' }}>
              <div className="search-item">
                <span className="search-label">Search Start Date</span>
                <span className="search-value">{client.searchStartDate || "Not specified"}</span>
              </div>
              <div className="search-item">
                <span className="search-label">Lead Source</span>
                <span className="search-value">{client.clientSource || "Not provided"}</span>
                {client.clientSource === "Referral" && (
                  <div className="referral-detail">
                    {client.referralContact ? (
                      <button
                        type="button"
                        onClick={() => {
                          const name = client.referralContact;
                          const event = new CustomEvent('openClientByName', { detail: { name } });
                          window.dispatchEvent(event);
                          setShowSearchDetailsModal(false);
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#f3f4f6', border: '1px solid #d1d5db', color: '#333',
                          borderRadius: 16, padding: '4px 10px', cursor: 'pointer', marginTop: '0.5rem'
                        }}
                      >
                        {client.referralContact}
                      </button>
                    ) : (
                      <span className="referral-value">(not contact listed)</span>
                    )}
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
            <div className="modal-buttons">
              <button onClick={() => setShowSearchDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocumentsModal && (
        <div className="modal-overlay" onClick={() => setShowDocumentsModal(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h3>Documents</h3>
            <div style={{ marginTop: '1rem' }}>
              <p style={{ color: "#666", fontStyle: "italic" }}>Documents feature coming soon</p>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowDocumentsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientPage;