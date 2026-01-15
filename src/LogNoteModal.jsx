import React, { useState, useEffect } from "react";
import "./LogNoteModal.css";

function LogNoteModal({ 
  isOpen, 
  onClose, 
  clients = [], 
  properties = [], 
  preSelectedClient = null,
  preSelectedProperty = null,
  onSave,
  title = "Add Note",
  editingNote = null // { noteText, timestamp, activityId }
}) {
  const [clientChecked, setClientChecked] = useState(!!preSelectedClient);
  const [propertyChecked, setPropertyChecked] = useState(!!preSelectedProperty);
  const [selectedClient, setSelectedClient] = useState(preSelectedClient || null);
  const [selectedProperty, setSelectedProperty] = useState(preSelectedProperty || null);
  const [noteText, setNoteText] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  
  // Initialize date and time - use editing note timestamp if available, otherwise current date/time
  const getInitialDate = () => {
    if (editingNote?.timestamp) {
      const date = new Date(editingNote.timestamp);
      return date.toISOString().split('T')[0];
    }
    const now = new Date();
    return now.toISOString().split('T')[0];
  };
  
  const getInitialTime = () => {
    if (editingNote?.timestamp) {
      const date = new Date(editingNote.timestamp);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  
  const [dateValue, setDateValue] = useState(getInitialDate());
  const [timeValue, setTimeValue] = useState(getInitialTime());

  // Update selected client/property when preSelected changes or when editing
  useEffect(() => {
    if (editingNote) {
      // When editing, find and set the client and property based on the activity
      if (editingNote.clientName) {
        const client = clients.find(c => c.name === editingNote.clientName);
        if (client) {
          setSelectedClient(client);
          setClientChecked(true);
        }
      }
      if (editingNote.propertyName) {
        const property = properties.find(p => p.name === editingNote.propertyName);
        if (property) {
          setSelectedProperty(property);
          setPropertyChecked(true);
        }
      }
      setNoteText(editingNote.noteText || "");
      if (editingNote.timestamp) {
        const date = new Date(editingNote.timestamp);
        setDateValue(date.toISOString().split('T')[0]);
        setTimeValue(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
      }
    } else if (preSelectedClient) {
      setSelectedClient(preSelectedClient);
      setClientChecked(true);
    } else if (preSelectedProperty) {
      setSelectedProperty(preSelectedProperty);
      setPropertyChecked(true);
    }
  }, [preSelectedClient, preSelectedProperty, editingNote, clients, properties]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setClientChecked(!!preSelectedClient);
      setPropertyChecked(!!preSelectedProperty);
      setSelectedClient(preSelectedClient || null);
      setSelectedProperty(preSelectedProperty || null);
      setNoteText("");
      setClientSearch("");
      setPropertySearch("");
      const now = new Date();
      setDateValue(now.toISOString().split('T')[0]);
      setTimeValue(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
  }, [isOpen, preSelectedClient, preSelectedProperty]);
  
  // Update note text when editingNote changes
  useEffect(() => {
    if (editingNote?.noteText) {
      setNoteText(editingNote.noteText);
    }
  }, [editingNote]);

  // Clear selections when checkboxes are unchecked
  useEffect(() => {
    if (!clientChecked) {
      setSelectedClient(null);
      setClientSearch("");
    }
  }, [clientChecked]);

  useEffect(() => {
    if (!propertyChecked) {
      setSelectedProperty(null);
      setPropertySearch("");
    }
  }, [propertyChecked]);

  if (!isOpen) return null;

  const filteredClients = clients.filter(client => {
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
    if (!propertySearch.trim()) return true;
    const searchLower = propertySearch.toLowerCase();
    return property.name.toLowerCase().includes(searchLower) ||
           (property.address && property.address.toLowerCase().includes(searchLower));
  });

  const handleSave = () => {
    if (!noteText.trim()) return;
    if (!clientChecked && !propertyChecked) return;
    if (clientChecked && !selectedClient) return;
    if (propertyChecked && !selectedProperty) return;
    
    // Combine date and time into ISO string
    const [hours, minutes] = timeValue.split(':');
    const selectedDate = new Date(dateValue);
    selectedDate.setHours(parseInt(hours, 10));
    selectedDate.setMinutes(parseInt(minutes, 10));
    const timestamp = selectedDate.toISOString();

    onSave({
      client: clientChecked ? selectedClient : null,
      property: propertyChecked ? selectedProperty : null,
      note: noteText.trim(),
      timestamp,
      isEdit: !!editingNote,
      activityId: editingNote?.activityId || null,
      originalTimestamp: editingNote?.timestamp || null
    });
    onClose();
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
      <div className="modal-content log-note-modal">
        <div className="modal-header">
          <h2>{editingNote ? "Edit Note" : title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Client Selection */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={clientChecked}
                onChange={(e) => setClientChecked(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0, flexShrink: 0 }}
              />
              <span>Client</span>
            </label>
            {clientChecked && (
              <>
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
                  <>
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="search-input"
                    />
                    {clientSearch.trim() && (
                      <div className="selection-list">
                        {filteredClients.slice(0, 10).map((client) => (
                          <div
                            key={client.id || client.name}
                            className="selection-item"
                            onClick={() => {
                              setSelectedClient(client);
                              setClientSearch("");
                            }}
                          >
                            {formatClientName(client)}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Property Selection */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={propertyChecked}
                onChange={(e) => setPropertyChecked(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0, flexShrink: 0 }}
              />
              <span>Property</span>
            </label>
            {propertyChecked && (
              <>
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
                  <>
                    <input
                      type="text"
                      placeholder="Search properties..."
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      className="search-input"
                    />
                    {propertySearch.trim() && (
                      <div className="selection-list">
                        {filteredProperties.slice(0, 10).map((property) => (
                          <div
                            key={property.id || property.name}
                            className="selection-item"
                            onClick={() => {
                              setSelectedProperty(property);
                              setPropertySearch("");
                            }}
                          >
                            <div>
                              <strong>{property.name}</strong>
                              {property.price && (
                                <span style={{ marginLeft: '8px', color: '#666' }}>
                                  - £{Number(property.price).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Date and Time */}
          <div className="form-group">
            <label>Date & Time</label>
            <div className="datetime-group">
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="date-input"
              />
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="time-input"
              />
            </div>
          </div>

          {/* Note Text */}
          <div className="form-group">
            <label>Note</label>
            <textarea
              rows={3}
              placeholder="Type your note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="note-textarea"
            />
          </div>
        </div>

        <div className="modal-buttons">
          <button 
            className="save-btn"
            onClick={handleSave}
            disabled={
              !noteText.trim() || 
              !clientChecked && !propertyChecked ||
              (clientChecked && !selectedClient) ||
              (propertyChecked && !selectedProperty)
            }
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogNoteModal;

