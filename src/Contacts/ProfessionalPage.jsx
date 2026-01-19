import React, { useEffect, useState } from "react";
import "./ProfessionalPage.css";
import EntityActivityLog from "../EntityActivityLog";

function ProfessionalPage({ professional, onBack, properties = [], salesProgressions = [], clients = [], onArchiveProfessional, onRestoreProfessional }) {
  const [showEdit, setShowEdit] = useState(false);
  const [displayProfessional, setDisplayProfessional] = useState(professional);
  const [formData, setFormData] = useState({
    name: professional.name || "",
    company: professional.company || "",
    phoneWork: professional.phoneWork || "",
    phoneMobile: professional.phoneMobile || "",
    email: professional.email || "",
    type: professional.type || "",
  });

  useEffect(() => {
    setDisplayProfessional(professional);
    setFormData({
      name: professional.name || "",
      company: professional.company || "",
      phoneWork: professional.phoneWork || "",
      phoneMobile: professional.phoneMobile || "",
      email: professional.email || "",
      type: professional.type || "",
    });
  }, [professional]);

  // Get properties represented by this professional
  const representedProperties = properties.filter(prop => prop.vendor === (displayProfessional?.name || professional.name));
  
  // Separate active and completed properties
  const activeProperties = representedProperties.filter(prop => {
    const progression = salesProgressions.find(sp => sp.address === prop.name);
    return !progression?.dealComplete;
  });
  
  const completedProperties = representedProperties.filter(prop => {
    const progression = salesProgressions.find(sp => sp.address === prop.name);
    return progression?.dealComplete;
  });

  // Referrals: clients whose referralContact matches this professional's name
  const referredClients = (clients || []).filter(c => (c.referralContact || "") === (displayProfessional?.name || professional.name));

  const [activeTab, setActiveTab] = useState("referrals");

  return (
    <div className="professional-page">
      {/* Header Section */}
      <div className="professional-header" style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <button className="back-btn" onClick={onBack} type="button">
            <i className="fa-solid fa-arrow-left" style={{ color: '#555555', fontSize: '1.4rem' }} />
          </button>
          {/* Wrapper to keep name tile and tabs tile on the same row */}
          <div className="professional-tiles-container" style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flex: 1, flexWrap: "nowrap", width: "100%" }}>
            {/* Left tile - Name and info */}
            <div className="professional-header-tile professional-name-tile">
              <div className="professional-title-section">
                <h1 className="professional-title">
                  {displayProfessional.name}
                </h1>
                <div className="professional-meta-info">
                  <div style={{ marginTop: '0.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#555', fontWeight: 400 }}>Type: </span>
                    <span className="type-pill">{displayProfessional.type || '—'}</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
                    <span style={{ color: '#555', fontWeight: 400 }}>Company: </span>
                    <span style={{ fontWeight: 500 }}>
                      {displayProfessional.company || "Not provided"}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
                    <span style={{ color: '#555', fontWeight: 400 }}>Work Number: </span>
                    <span style={{ fontWeight: 500 }}>
                      {displayProfessional.phoneWork || displayProfessional.phoneNumber || "Not provided"}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
                    <span style={{ color: '#555', fontWeight: 400 }}>Mobile Number: </span>
                    <span style={{ fontWeight: 500 }}>
                      {displayProfessional.phoneMobile || "Not provided"}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
                    <span style={{ color: '#555', fontWeight: 400 }}>Email: </span>
                    <span style={{ fontWeight: 500 }}>
                      {displayProfessional.email || "Not provided"}
                    </span>
                  </div>
                </div>
                {/* Options button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    className="edit-button" 
                    onClick={() => setShowEdit(true)}
                    style={{ padding: '0 0.75rem', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}
                  >
                    Edit
                  </button>
                  {professional.archived ? (
                    <button 
                      className="restore-button" 
                      type="button" 
                      onClick={async () => {
                        if (onRestoreProfessional) {
                          await onRestoreProfessional(professional);
                        }
                      }}
                      style={{ padding: '0 0.75rem', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}
                    >
                      Unarchive
                    </button>
                  ) : (
                    <button 
                      className="archive-button" 
                      type="button" 
                      onClick={async () => {
                        if (onArchiveProfessional) {
                          await onArchiveProfessional(professional);
                        }
                      }}
                      style={{ padding: '0 0.75rem', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Right tile - Tabs and content */}
            <div className="professional-header-tile professional-tabs-tile" style={{ flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", overflow: "hidden" }}>
                {/* Tab buttons */}
                <div className="professional-tabs">
                  <button
                    type="button"
                    className={`professional-tab-button ${activeTab === "referrals" ? "active" : ""}`}
                    onClick={() => setActiveTab("referrals")}
                  >
                    Referrals
                  </button>
                  <button
                    type="button"
                    className={`professional-tab-button ${activeTab === "activeProperties" ? "active" : ""}`}
                    onClick={() => setActiveTab("activeProperties")}
                  >
                    Active Properties Represented
                  </button>
                  <button
                    type="button"
                    className={`professional-tab-button ${activeTab === "historicalProperties" ? "active" : ""}`}
                    onClick={() => setActiveTab("historicalProperties")}
                  >
                    Historical Properties
                  </button>
                </div>
                {/* Tab content */}
                <div className="professional-tab-content">
                  {activeTab === "referrals" && (
                    <div>
                      {referredClients.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {referredClients.map((c, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const event = new CustomEvent('openClientByName', { detail: { name: c.name } });
                                window.dispatchEvent(event);
                              }}
                              style={{
                                background: '#f3f4f6', border: '1px solid #d1d5db', color: '#333',
                                borderRadius: 16, padding: '6px 10px', cursor: 'pointer'
                              }}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "#666", fontStyle: "italic" }}>No referrals recorded.</p>
                      )}
                    </div>
                  )}
                  {activeTab === "activeProperties" && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {activeProperties.length > 0 ? (
                        <div className="properties-list">
                          {activeProperties.map((property, index) => (
                            <div key={index} className="property-item">
                              <strong>{property.name}</strong> - {property.address}
                              <br />
                              <span className="property-details">
                                Guide Price: {property.price ? `£${Number(property.price).toLocaleString()}` : 'Not set'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "#666", fontStyle: "italic" }}>No active properties currently being represented.</p>
                      )}
                    </div>
                  )}
                  {activeTab === "historicalProperties" && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {completedProperties.length > 0 ? (
                        <div className="properties-list">
                          {completedProperties.map((property, index) => (
                            <div key={index} className="property-item historical">
                              <strong>{property.name}</strong> - {property.address}
                              <br />
                              <span className="property-details">
                                Guide Price: {property.price ? `£${Number(property.price).toLocaleString()}` : 'Not set'} •
                                <span className="completed-badge"> Deal Completed</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "#666", fontStyle: "italic" }}>No completed properties yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: "0.1rem 1.5rem 1.25rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem", paddingLeft: "calc(56px + 0.75rem)" }}>
          {/* Activity Log (full width) */}
          <div style={{ overflow: "hidden", boxSizing: "border-box" }}>
            <EntityActivityLog
              entityType="professional"
              entityName={displayProfessional.name}
              title="Recent Activity"
              clients={clients}
              properties={properties}
              professionals={[displayProfessional]}
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Professional</h3>
            <div className="form-group">
              <label>Name</label>
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Work Number</label>
              <input value={formData.phoneWork} onChange={(e) => setFormData({ ...formData, phoneWork: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input value={formData.phoneMobile} onChange={(e) => setFormData({ ...formData, phoneMobile: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="">Select Type</option>
                <option value="Solicitor">Solicitor</option>
                <option value="Agent">Agent</option>
                <option value="Surveyor">Surveyor</option>
                <option value="Mortgage Advisor">Mortgage Advisor</option>
                <option value="SDLT Advisor">SDLT Advisor</option>
                <option value="Developer">Developer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="modal-buttons">
              <button className="save-btn" onClick={async () => {
                const { updateProfessionalById } = await import('../lib/professionalsApi');
                await updateProfessionalById(professional.id, { 
                  ...formData,
                  // keep legacy phoneNumber in sync for any older views
                  phoneNumber: formData.phoneWork || formData.phoneMobile || displayProfessional.phoneNumber || ""
                });
                // Optimistically reflect changes immediately
                setDisplayProfessional(prev => ({ ...prev, ...formData }));
                setShowEdit(false);
              }}>Save</button>
              <button className="cancel-btn" onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfessionalPage;