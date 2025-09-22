import React, { useState } from "react";
import "./PropertySelectionModal.css";

function PropertySelectionModal({ isOpen, onClose, onSelect, onAddNewProperty, properties, linkedProperties, salesProgressions = [] }) {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  // Build a set of property names that appear in any sales progression (active or completed)
  const progressionAddresses = new Set(
    (Array.isArray(salesProgressions) ? salesProgressions : [])
      .map(row => row?.address)
      .filter(Boolean)
  );

  // Filter out properties already linked to this/any client, or present in sales progressions
  const availableProperties = properties.filter(property => {
    const linkedToCurrentClient = linkedProperties.some(linked => linked.id === property.id);
    const linkedToAnyClient = Boolean(property.linkedClient) || (Array.isArray(property.linkedClients) && property.linkedClients.length > 0);
    const inAnyProgression = progressionAddresses.has(property.name);
    return !linkedToCurrentClient && !linkedToAnyClient && !inAnyProgression;
  });

  // Filter by search term
  const filteredProperties = availableProperties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (property.address && property.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (property) => {
    onSelect(property);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content property-selection-modal">
        <div className="modal-header">
          <h2>Link Property to Client</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="properties-list">
            {filteredProperties.length === 0 ? (
              <p className="no-properties">No available properties to link.</p>
            ) : (
              filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="property-item"
                  onClick={() => handleSelect(property)}
                >
                  <div className="property-info">
                    <h3>{property.name}</h3>
                    <p className="property-price">
                      Guide Price: {property.price ? `£${Number(property.price).toLocaleString()}` : "No price"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="save-btn"
              onClick={() => onAddNewProperty && onAddNewProperty()}
            >
              + New Property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertySelectionModal;
