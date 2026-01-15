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

  return (
    <div className="professional-page">
      {/* Header Section */}
      <div className="professional-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack} type="button" style={{ marginBottom: '8px' }}>
            <i className="fa-solid fa-arrow-left" style={{ color: '#555555', fontSize: '1.4rem' }} />
          </button>
          <h1 className="professional-title">{displayProfessional.name}</h1>
          <div className="header-meta">
            <span className="meta-label">Type:</span>
            <span className="type-pill">{displayProfessional.type || '—'}</span>
            <span className="meta-label" style={{ marginLeft: '12px' }}>Company:</span>
            <span className="meta-value">{displayProfessional.company || 'Not provided'}</span>
          </div>
          <div className="header-meta">
            <span className="meta-label">Work Number:</span>
            <span className="meta-value">{displayProfessional.phoneWork || displayProfessional.phoneNumber || 'Not provided'}</span>
            <span className="meta-label" style={{ marginLeft: '12px' }}>Email:</span>
            <span className="meta-value">{displayProfessional.email || 'Not provided'}</span>
          </div>
          <div className="header-meta">
            <span className="meta-label">Mobile Number:</span>
            <span className="meta-value">{displayProfessional.phoneMobile || 'Not provided'}</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="action-buttons">
            <button className="edit-button" type="button" onClick={() => setShowEdit(true)}>Edit</button>
            {professional.archived ? (
              <button 
                className="restore-button" 
                type="button" 
                onClick={async () => {
                  if (onRestoreProfessional) {
                    await onRestoreProfessional(professional);
                  }
                }}
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
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="professional-content">
        {/* Left Column */}
        <div className="professional-main">
          <div className="professional-card">
            <h2 className="card-title">Referrals ({referredClients.length})</h2>
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
              <p className="empty-text">No referrals recorded.</p>
            )}
          </div>
          <div className="professional-card">
            <h2 className="card-title">Active Properties Represented</h2>
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
              <p className="empty-text">No active properties currently being represented.</p>
            )}
          </div>

          <div className="professional-card">
            <h2 className="card-title">Historical Properties</h2>
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
              <p className="empty-text">No completed properties yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity log for this professional (matches by name using client-type activities) */}
      <div style={{ padding: "0 1.5rem 1.5rem" }}>
        <EntityActivityLog
          entityType="client"
          entityName={displayProfessional.name}
          title="Activity for this professional"
        />
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