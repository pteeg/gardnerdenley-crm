import React, { useState } from "react";
import "./NewPropertyModal.css";

const NewPropertyModal = ({ onClose, onSave, professionals, initialData = null, isEdit = false }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price || "",
    address: initialData?.address || "",
    vendor: initialData?.vendor || "",
    ownerDetails: initialData?.ownerDetails || "",
    floorSize: initialData?.floorSize || "",
    bedrooms: initialData?.bedrooms || "",
    bathrooms: initialData?.bathrooms || "",
    style: initialData?.style || "",
    receptions: initialData?.receptions || "",
    parking: initialData?.parking || "",
    land: initialData?.land || "",
    onMarket: initialData?.onMarket !== undefined ? initialData.onMarket : 
              initialData?.status === "On Market" ? true :
              initialData?.status === "Off Market" ? false :
              initialData?.status === "N/A" ? null : null
  });

  const [vendorType, setVendorType] = useState(() => {
    if (initialData?.vendor) {
      // Check if vendor exists in professionals list
      const isAgent = professionals.some(pro => pro.type === "Agent" && pro.name === initialData.vendor);
      return isAgent ? 'agent' : 'private';
    }
    return null;
  }); // 'private' or 'agent'
  const [vendorName, setVendorName] = useState(initialData?.vendor || "");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const formatNumberWithCommas = (numStr) => {
    if (!numStr) return "";
    // Remove leading zeros
    const normalized = String(numStr).replace(/^0+(?!$)/, "");
    return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handlePriceChange = (e) => {
    // Allow only digits
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, price: digitsOnly }));
  };



  const handleVendorTypeChange = (type) => {
    setVendorType(type);
    setVendorName("");
    setFormData((prev) => ({ ...prev, vendor: "" }));
  };

  const handleVendorNameChange = (e) => {
    const value = e.target.value;
    setVendorName(value);
    setFormData((prev) => ({ ...prev, vendor: value }));
  };

  const handleAgentSelect = (e) => {
    const value = e.target.value;
    setVendorName(value);
    setFormData((prev) => ({ ...prev, vendor: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert onMarket to status for compatibility
    const dataToSave = {
      ...formData,
      status: formData.onMarket === true ? "On Market" : 
              formData.onMarket === false ? "Off Market" : 
              formData.onMarket === null ? "N/A" :
              formData.status || "On Market" // fallback to existing status or default
    };
    
    onSave(dataToSave);
    onClose();
  };

  const agentOptions = professionals
    .filter((pro) => pro.type === "Agent")
    .map((pro) => (
      <option key={pro.name} value={pro.name}>
        {pro.name} ({pro.company})
      </option>
    ));

  return (
    <div className="modal-overlay new-property-modal">
      <div className="modal-content">
        <h2>{isEdit ? "Edit Property" : "Add Property"}</h2>
        <form onSubmit={handleSubmit} className="property-form">
          <div className="form-group"><label>Name *</label><input name="name" value={formData.name} onChange={handleChange} required /></div>
          <div className="form-group"><label>Description</label><input name="description" value={formData.description} onChange={handleChange} /></div>
          <div className="form-group"><label>Guide Price</label><input name="price" value={formData.price ? `£${formatNumberWithCommas(formData.price)}` : ""} onChange={handlePriceChange} /></div>
          <div className="form-group full-width-row"><label>Address</label><input name="address" value={formData.address} onChange={handleChange} /></div>

          <div className="form-group">
            <label>Vendor</label>
            <div className="vendor-group" role="group" aria-label="Vendor type">
              <button
                type="button"
                className={`vendor-option ${vendorType === 'private' ? 'active' : ''}`}
                onClick={() => handleVendorTypeChange('private')}
              >
                Private Seller
              </button>
              <button
                type="button"
                className={`vendor-option ${vendorType === 'agent' ? 'active' : ''}`}
                onClick={() => handleVendorTypeChange('agent')}
              >
                Agent
              </button>
            </div>
            {vendorType === 'private' && (
              <input
                type="text"
                placeholder="Enter seller name"
                value={vendorName}
                onChange={handleVendorNameChange}
                style={{ marginTop: '0.5rem' }}
              />
            )}
            {vendorType === 'agent' && (
              <select
                value={vendorName}
                onChange={handleAgentSelect}
                style={{ marginTop: '0.5rem' }}
              >
                <option value="">Select Agent</option>
                {agentOptions}
              </select>
            )}
          </div>
          <div className="form-group"><label>Owner Details</label><input name="ownerDetails" value={formData.ownerDetails} onChange={handleChange} /></div>

          <div className="form-group"><label>Floor Size (sq ft)</label><input name="floorSize" value={formData.floorSize} onChange={handleChange} /></div>
          <div className="form-group"><label>Bedrooms</label><input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleChange} min="0" step="1" /></div>
          <div className="form-group"><label>Bathrooms</label><input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} min="0" step="1" /></div>

          <div className="form-group"><label>Style</label><input name="style" value={formData.style} onChange={handleChange} /></div>
          <div className="form-group"><label>Receptions</label><input type="number" name="receptions" value={formData.receptions} onChange={handleChange} min="0" step="1" /></div>
          <div className="form-group"><label>Parking</label><input name="parking" value={formData.parking} onChange={handleChange} /></div>

          <div className="form-group"><label>Land (acres)</label><input name="land" value={formData.land} onChange={handleChange} /></div>
          <div className="form-group">
            <label>Market Status</label>
            <div className="market-group" role="group" aria-label="Market status">
              <button
                type="button"
                className={`market-option ${formData.onMarket === null ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, onMarket: null }))}
              >
                N/A
              </button>
              <button
                type="button"
                className={`market-option ${formData.onMarket === true ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, onMarket: true }))}
              >
                On Market
              </button>
              <button
                type="button"
                className={`market-option ${formData.onMarket === false ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, onMarket: false }))}
              >
                Off Market
              </button>
            </div>
          </div>
          <div className="form-group"><label>Property Photos</label><input type="file" multiple accept="image/*" disabled /></div>
          <div className="form-group"><label>Floorplan (PDF/Image)</label><input type="file" accept=".pdf,image/*" disabled /></div>
          <div className="form-group"><label>EPC (PDF/Image)</label><input type="file" accept=".pdf,image/*" disabled /></div>

          <div className="form-buttons full-width-row">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="save-btn">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPropertyModal;