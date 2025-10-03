import React, { useState } from "react";
import "./PropertyPage.css";
import NewPropertyModal from "./NewPropertyModal";

function PropertyPage({ property, onBack, professionals = [], onUpdateProperty, onDeleteProperty }) {
  const [isEditing, setIsEditing] = useState(false);

  if (!property) return null;

  const formatOfferClientDisplay = () => {
    if (Array.isArray(property.linkedClients) && property.linkedClients.length > 0) {
      const c = property.linkedClients[0];
      if (typeof c === 'string') return c;
      const first1 = c?.spouse1FirstName || "";
      const first2 = c?.spouse2FirstName || "";
      const surname = c?.spouse1Surname || "";
      if (first1 && first2) {
        return [first1, "and", first2, surname].filter(Boolean).join(" ");
      }
      return [first1, surname].filter(Boolean).join(" ");
    }
    return "Client";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Matched": return "#28a745";
      case "Sold": return "#6c757d";
      case "On Market": return "#007bff";
      case "Off Market": return "#ffc107";
      case "N/A": return "#6c757d";
      default: return "#6c757d";
    }
  };

  const formatPrice = (price) => {
    if (!price || price === "") return "—";
    // Handle both string and number prices
    const numericPrice = typeof price === 'string' ? price.replace(/[^0-9]/g, '') : price;
    if (!numericPrice || numericPrice === '0') return "—";
    return `£${Number(numericPrice).toLocaleString()}`;
  };

  const formatClientName = (clientData) => {
    if (!clientData) return "—";
    // If string, it's already formatted elsewhere
    if (typeof clientData === 'string') return clientData;
    // Always prefer first names only
    if (clientData.spouse1FirstName) {
      if (clientData.spouse2FirstName) {
        return `${clientData.spouse1FirstName} and ${clientData.spouse2FirstName}`;
      }
      return clientData.spouse1FirstName;
    }
    return clientData.name || clientData.firstName || "Unknown Client";
  };


  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async (updatedData) => {
    if (onUpdateProperty) {
      await onUpdateProperty(property.id, updatedData);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      if (onDeleteProperty) {
        await onDeleteProperty(property.id);
        onBack(); // Navigate back to properties list after deletion
      }
    }
  };

  return (
    <div className="property-page">
      {/* Header Section */}
      <div className="property-header">
        <div className="property-title-section">
          <button className="back-btn" onClick={onBack} type="button" style={{ marginBottom: '8px' }}>
            <i className="fa-solid fa-arrow-left" style={{ color: '#555555', fontSize: '1.4rem' }} />
          </button>
          <h1 className="property-title">{property.name}</h1>
          <div className="property-status">
            <span className="status-badge">
              Market Status: {property.status}
            </span>
            {property.linkedClients && property.linkedClients.length > 0 && (
              <div className="linked-clients">
                {property.status === "Matched" ? "Matched to" : 
                 property.status === "Sold" ? "Acquired by" : 
                 "Linked to"} {property.linkedClients.map((client, index) => (
                  <button
                    key={index}
                    type="button"
                    className="linked-client clickable"
                    onClick={() => {
                      const name = typeof client === 'string' ? client : (client && client.name) ? client.name : null;
                      if (name) {
                        window.dispatchEvent(new CustomEvent('openClientByName', { detail: { name } }));
                      }
                    }}
                  >
                    {formatClientName(client)}
                    {index < property.linkedClients.length - 1 && ", "}
                  </button>
                ))}
              </div>
            )}
            {/* Fallback for old single linkedClient field */}
            {(!property.linkedClients || property.linkedClients.length === 0) && property.linkedClient && (
              <button
                type="button"
                className="linked-client clickable"
                onClick={() => {
                  const name = typeof property.linkedClient === 'string' ? property.linkedClient : (property.linkedClient && property.linkedClient.name) ? property.linkedClient.name : null;
                  if (name) {
                    window.dispatchEvent(new CustomEvent('openClientByName', { detail: { name } }));
                  }
                }}
              >
                {property.status === "Matched" ? "Matched to" : 
                 property.status === "Sold" ? "Acquired by" : 
                 "Linked to"} {formatClientName(property.linkedClient)}
              </button>
            )}
          </div>
          <div className="property-price">
            <span className="price-label">Guide Price</span>
            <span className="price-value">{formatPrice(property.price)}</span>
          </div>
        </div>
        
        <div className="header-actions">
          <div className="action-buttons">
            <button className="edit-button" onClick={handleEdit}>
              Edit
            </button>
            <button className="delete-button" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="property-content">
        {/* Left Column */}
        <div className="property-main">
          {/* Property Details Card */}
          <div className="property-card">
            <h2 className="card-title">Property Details</h2>
            <div className="property-address">
              <span className="address-icon">📍</span>
              <span>{property.address || "Address not provided"}</span>
            </div>
            
            <div className="specs-grid">
              <div className="spec-item">
                <span className="spec-label">Bedrooms</span>
                <span className="spec-value">{property.bedrooms || "—"}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Bathrooms</span>
                <span className="spec-value">{property.bathrooms || "—"}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Receptions</span>
                <span className="spec-value">{property.receptions || "—"}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Floor Size</span>
                <span className="spec-value">{property.floorSize ? `${property.floorSize} sq ft` : "—"}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Style</span>
                <span className="spec-value">{property.style || "—"}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Parking</span>
                <span className="spec-value">{property.parking || "—"}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Land</span>
                <span className="spec-value">{property.land ? `${property.land} acres` : "—"}</span>
              </div>
            </div>
            
            {/* Description - Full Width */}
            {property.description && (
              <div className="property-description">
                <h3 className="description-title">Description</h3>
                <p className="description-text">{property.description}</p>
              </div>
            )}
          </div>

          {/* Offers Logged Card */}
          <div className="property-card">
            <h2 className="card-title">Offers Logged</h2>
            {Array.isArray(property.offers) && property.offers.length > 0 ? (
              <div className="offers-logged-list">
                {property.offers.map((o, idx) => (
                  <div key={idx} className="offer-entry">
                    <span>
                      {formatOfferClientDisplay()} {`${new Date(o.date).toLocaleDateString()}: £${Number(o.amount).toLocaleString()}${o.status ? ` (${o.status})` : ''}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-offers">No offers logged</p>
            )}
          </div>


        </div>

        {/* Right Column */}
        <div className="property-sidebar">
          {/* Vendor Card */}
          <div className="property-card">
            <h3 className="card-title">Vendor (Agent)</h3>
            <p className="vendor-info">{property.vendor || "Not specified"}</p>
          </div>

          {/* Owner Details Card */}
          <div className="property-card">
            <h3 className="card-title">Owner Details</h3>
            <p className="owner-info">{property.ownerDetails || "Not specified"}</p>
          </div>

          {/* Documents Card */}
          <div className="property-card">
            <h3 className="card-title">Documents</h3>
            <div className="documents-list">
              {property.floorplan && (
                <a
                  href={typeof property.floorplan === 'string' ? property.floorplan : URL.createObjectURL(property.floorplan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="document-link"
                >
                  <span className="document-icon">📐</span>
                  View Floorplan
                </a>
              )}
              {property.epc && (
                <a
                  href={typeof property.epc === 'string' ? property.epc : URL.createObjectURL(property.epc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="document-link"
                >
                  <span className="document-icon">📊</span>
                  View EPC
                </a>
              )}
              {!property.floorplan && !property.epc && (
                <p className="no-documents">No documents available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <NewPropertyModal
          onClose={handleCancelEdit}
          onSave={handleSaveEdit}
          professionals={professionals}
          initialData={property}
          isEdit={true}
        />
      )}
    </div>
  );
}

export default PropertyPage;