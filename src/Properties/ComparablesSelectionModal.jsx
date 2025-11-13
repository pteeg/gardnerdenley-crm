import React, { useState, useMemo } from "react";
import "./ComparablesSelectionModal.css";

function ComparablesSelectionModal({ 
  properties, 
  onClose, 
  onDone, 
  excludePropertyId,
  existingComparableIds = []
}) {
  const [searchTerm, setSearchTerm] = useState("");
  // Pre-select existing comparables when opening for editing
  const [selectedProperties, setSelectedProperties] = useState(() => {
    return existingComparableIds.filter(id => id !== null);
  });

  // Filter out the current property and archived properties (but include existing comparables for editing)
  const availableProperties = useMemo(() => {
    return properties.filter(p => 
      p.id !== excludePropertyId && 
      !p.archived
    );
  }, [properties, excludePropertyId]);

  // Filter properties based on search term, then sort to show existing comparables first
  const filteredProperties = useMemo(() => {
    let filtered = availableProperties;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = availableProperties.filter(p => {
        const name = (p.name || "").toLowerCase();
        const address = (p.address || "").toLowerCase();
        const price = String(p.price || "").toLowerCase();
        return name.includes(term) || address.includes(term) || price.includes(term);
      });
    }
    
    // Sort to show existing comparables at the top
    return filtered.sort((a, b) => {
      const aIsExisting = existingComparableIds.includes(a.id);
      const bIsExisting = existingComparableIds.includes(b.id);
      if (aIsExisting && !bIsExisting) return -1;
      if (!aIsExisting && bIsExisting) return 1;
      return 0; // Keep original order for others
    });
  }, [availableProperties, searchTerm, existingComparableIds]);

  const togglePropertySelection = (propertyId) => {
    setSelectedProperties(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId);
      } else {
        return [...prev, propertyId];
      }
    });
  };

  const handleDone = () => {
    // Get all selected properties (from both filtered and existing)
    const allSelected = availableProperties.filter(p => selectedProperties.includes(p.id));
    onDone(allSelected);
    onClose();
  };

  const formatPrice = (price) => {
    if (!price || price === "") return "—";
    const numericPrice = typeof price === 'string' ? price.replace(/[^0-9]/g, '') : price;
    if (!numericPrice || numericPrice === '0') return "—";
    return `£${Number(numericPrice).toLocaleString()}`;
  };

  const calculatePricePerSqFt = (price, floorSize) => {
    if (!price || !floorSize) return "—";
    const numericPrice = typeof price === 'string' ? price.replace(/[^0-9]/g, '') : price;
    // Remove commas and other non-numeric characters from floorSize before parsing
    const numericFloorSize = typeof floorSize === 'string' 
      ? parseFloat(floorSize.replace(/[^0-9.]/g, '')) 
      : parseFloat(floorSize);
    if (!numericPrice || !numericFloorSize || numericFloorSize === 0) return "—";
    const pricePerSqFt = Number(numericPrice) / numericFloorSize;
    return `£${Math.round(pricePerSqFt).toLocaleString()}`;
  };

  return (
    <div className="modal-overlay comparables-selection-modal">
      <div className="modal-content comparables-modal-content">
        <button className="close-button" type="button" onClick={onClose}>×</button>
        <h2>{existingComparableIds.length > 0 ? "Edit Comparable" : "Select Comparables"}</h2>
        
        <div className="comparables-search-container">
          <input
            type="text"
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="comparables-search-input"
          />
        </div>

        <div className="comparables-table-container">
          <table className="comparables-selection-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Guide Price</th>
                <th>Floor Size</th>
                <th>Bedrooms</th>
                <th>Bathrooms</th>
                <th>£/sqF</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">
                    No properties found
                  </td>
                </tr>
              ) : (
                filteredProperties.map((property) => {
                  const isSelected = selectedProperties.includes(property.id);
                  const isExisting = existingComparableIds.includes(property.id);
                  return (
                    <tr key={property.id} className={isSelected ? 'selected' : ''}>
                      <td>{property.name || "—"}</td>
                      <td>{formatPrice(property.price)}</td>
                      <td>{property.floorSize ? `${property.floorSize} sq ft` : "—"}</td>
                      <td>{property.bedrooms || "—"}</td>
                      <td>{property.bathrooms || "—"}</td>
                      <td>{calculatePricePerSqFt(property.price, property.floorSize)}</td>
                      <td>
                        <button
                          className={`add-comparable-btn ${isSelected ? 'added' : ''}`}
                          onClick={() => togglePropertySelection(property.id)}
                          type="button"
                        >
                          {isSelected ? (isExisting ? 'Remove' : 'Added') : 'Add'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="comparables-modal-actions">
          <button 
            className="cancel-button" 
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="done-button" 
            type="button"
            onClick={handleDone}
            disabled={selectedProperties.length === 0}
          >
            Done ({selectedProperties.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default ComparablesSelectionModal;

