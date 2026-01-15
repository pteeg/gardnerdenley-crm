import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';
import "./LogOfferModal.css";

// Helper function to format currency nicely (e.g. £1,000)
function formatCurrencyInput(value) {
  const numericValue = value.replace(/[^\d]/g, ""); // remove non-digits
  return numericValue ? "£" + Number(numericValue).toLocaleString("en-UK") : "";
}

function LogOfferModal({ 
  isOpen, 
  onClose, 
  clients = [], 
  properties = [], 
  preSelectedClient = null,
  onSave 
}) {
  const [selectedClient, setSelectedClient] = useState(preSelectedClient || null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [clientFavoriteFilter, setClientFavoriteFilter] = useState(false);
  const [propertyFavoriteFilter, setPropertyFavoriteFilter] = useState(false);
  const clientDropdownRef = useRef(null);
  const propertyDropdownRef = useRef(null);
  
  // Get current date and time in format for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [offerDateTime, setOfferDateTime] = useState(getCurrentDateTime());

  // Update selected client when preSelectedClient changes
  useEffect(() => {
    if (preSelectedClient) {
      setSelectedClient(preSelectedClient);
    }
  }, [preSelectedClient]);

  // Reset form when modal closes and set default date/time when opening
  useEffect(() => {
    if (!isOpen) {
      setSelectedClient(preSelectedClient || null);
      setSelectedProperty(null);
      setOfferAmount("");
      setClientSearch("");
      setPropertySearch("");
      setShowClientDropdown(false);
      setShowPropertyDropdown(false);
      setClientFavoriteFilter(false);
      setPropertyFavoriteFilter(false);
    } else {
      // Set to current date/time when modal opens
      setOfferDateTime(getCurrentDateTime());
    }
  }, [isOpen, preSelectedClient]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(event.target)) {
        setShowPropertyDropdown(false);
      }
    };

    if (showClientDropdown || showPropertyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showClientDropdown, showPropertyDropdown]);

  if (!isOpen) return null;

  const filteredClients = clients.filter(client => {
    // Filter by favorite if filter is active
    if (clientFavoriteFilter && !client.favourite) return false;
    
    if (!clientSearch.trim()) return true;
    const searchLower = clientSearch.toLowerCase();
    const name = client.name || "";
    const spouse1 = client.spouse1FirstName || "";
    const spouse2 = client.spouse2FirstName || "";
    return name.toLowerCase().includes(searchLower) ||
           spouse1.toLowerCase().includes(searchLower) ||
           spouse2.toLowerCase().includes(searchLower);
  });

  const filteredProperties = properties.filter(property => {
    // Filter by favorite if filter is active
    if (propertyFavoriteFilter && !property.favourite) return false;
    
    if (!propertySearch.trim()) return true;
    const searchLower = propertySearch.toLowerCase();
    return property.name.toLowerCase().includes(searchLower) ||
           (property.address && property.address.toLowerCase().includes(searchLower));
  });

  const handleSave = () => {
    if (selectedClient && selectedProperty && offerAmount) {
      const numericAmount = offerAmount.replace(/[^\d]/g, "");
      if (numericAmount) {
        // Convert datetime-local string to ISO timestamp
        const timestamp = offerDateTime ? new Date(offerDateTime).toISOString() : new Date().toISOString();
        onSave({
          client: selectedClient,
          property: selectedProperty,
          amount: Number(numericAmount),
          timestamp: timestamp
        });
        onClose();
      }
    }
  };

  const formatClientName = (client) => {
    if (!client) return "";
    if (client.spouse1FirstName && client.spouse2FirstName) {
      return client.spouse1Surname
        ? `${client.spouse1FirstName} and ${client.spouse2FirstName} ${client.spouse1Surname}`
        : `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
    }
    if (client.spouse1FirstName || client.spouse1Surname) {
      return [client.spouse1FirstName || "", client.spouse1Surname || ""].filter(Boolean).join(" ");
    }
    return client.name || "";
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content log-offer-modal">
        <div className="modal-header">
          <h2>Log Offer</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Client and Property Selection - Side by Side */}
          <div className="form-group-row">
            {/* Client Selection */}
            <div className="form-group" ref={clientDropdownRef}>
              <label>Client</label>
              {selectedClient ? (
                <div className="selected-item">
                  <span>{formatClientName(selectedClient)}</span>
                  <button 
                    type="button"
                    className="clear-selection-btn"
                    onClick={() => setSelectedClient(null)}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    onFocus={() => setShowClientDropdown(true)}
                    onClick={() => setShowClientDropdown(true)}
                    className="search-input"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  {(showClientDropdown || clientSearch) && (
                    <button
                      type="button"
                      className="favorite-filter-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientFavoriteFilter(!clientFavoriteFilter);
                      }}
                      title={clientFavoriteFilter ? "Show all clients" : "Show favorites only"}
                    >
                      <FontAwesomeIcon 
                        icon={clientFavoriteFilter ? faHeartSolid : faHeartRegular} 
                        style={{ color: '#555555' }} 
                      />
                    </button>
                  )}
                  {showClientDropdown && (
                    <div className="selection-list">
                      {filteredClients.slice(0, 10).map((client) => (
                        <div
                          key={client.id || client.name}
                          className="selection-item"
                          onClick={() => {
                            setSelectedClient(client);
                            setClientSearch("");
                            setShowClientDropdown(false);
                          }}
                        >
                          <span style={{ flex: 1 }}>{formatClientName(client)}</span>
                          {client.favourite && (
                            <FontAwesomeIcon 
                              icon={faHeartSolid} 
                              style={{ color: '#555555', marginLeft: '0.5rem', width: '14px', height: '14px' }} 
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Property Selection */}
            <div className="form-group" ref={propertyDropdownRef}>
              <label>Property</label>
              {selectedProperty ? (
                <div className="selected-item">
                  <span>{selectedProperty.name}</span>
                  <button 
                    type="button"
                    className="clear-selection-btn"
                    onClick={() => setSelectedProperty(null)}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Search properties..."
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    onFocus={() => setShowPropertyDropdown(true)}
                    onClick={() => setShowPropertyDropdown(true)}
                    className="search-input"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  {(showPropertyDropdown || propertySearch) && (
                    <button
                      type="button"
                      className="favorite-filter-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPropertyFavoriteFilter(!propertyFavoriteFilter);
                      }}
                      title={propertyFavoriteFilter ? "Show all properties" : "Show favorites only"}
                    >
                      <FontAwesomeIcon 
                        icon={propertyFavoriteFilter ? faHeartSolid : faHeartRegular} 
                        style={{ color: '#555555' }} 
                      />
                    </button>
                  )}
                  {showPropertyDropdown && (
                    <div className="selection-list">
                      {filteredProperties.slice(0, 10).map((property) => (
                        <div
                          key={property.id || property.name}
                          className="selection-item"
                          onClick={() => {
                            setSelectedProperty(property);
                            setPropertySearch("");
                            setShowPropertyDropdown(false);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <span>{property.name}</span>
                            {property.price && (
                              <span style={{ marginLeft: '8px', color: '#666' }}>
                                - £{Number(property.price).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {property.favourite && (
                            <FontAwesomeIcon 
                              icon={faHeartSolid} 
                              style={{ color: '#555555', marginLeft: '0.5rem', width: '14px', height: '14px' }} 
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Offer Amount */}
          <div className="form-group">
            <label>Offer Amount (£)</label>
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

          {/* Date and Time */}
          <div className="form-group">
            <label>Date & Time</label>
            <input
              type="datetime-local"
              value={offerDateTime}
              onChange={(e) => setOfferDateTime(e.target.value)}
              className="datetime-input"
            />
          </div>
        </div>

        <div className="modal-buttons">
          <button 
            className="save-btn"
            onClick={handleSave}
            disabled={!selectedClient || !selectedProperty || !offerAmount}
          >
            Log Offer
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogOfferModal;

