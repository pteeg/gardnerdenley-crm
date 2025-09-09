import React, { useState } from "react";
import "./NewPropertyModal.css";

const NewPropertyModal = ({ onClose, onSave, professionals }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    address: "",
    vendor: "",
    bio: "",
    ownerDetails: "",
    floorSize: "",
    bedrooms: "",
    bathrooms: "",
    style: "",
    receptions: "",
    parking: "",
    land: "",
    onMarket: true,
    propertyPhotos: [],
    floorplan: null,
    epc: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      propertyPhotos: files
    }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    setFormData((prev) => ({
      ...prev,
      [field]: file
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
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
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Property</h2>
        <form onSubmit={handleSubmit} className="property-form">
          <label>Name</label>
          <input name="name" value={formData.name} onChange={handleChange} required />

          <label>Description</label>
          <input name="description" value={formData.description} onChange={handleChange} required />

          <label>Price</label>
          <input name="price" value={formData.price} onChange={handleChange} required />

          <label>Address</label>
          <input name="address" value={formData.address} onChange={handleChange} required />

          <label>Vendor</label>
          <select name="vendor" value={formData.vendor} onChange={handleChange}>
            <option value="">Select Vendor</option>
            {agentOptions}
          </select>
          <label>Bio</label>
          <input name="bio" value={formData.bio} onChange={handleChange} />

          <label>Owner Details</label>
          <input name="ownerDetails" value={formData.ownerDetails} onChange={handleChange} />

          <h3>Property Specs</h3>

          <label>Floor Size (sq ft)</label>
          <input name="floorSize" value={formData.floorSize} onChange={handleChange} />

          <label>Bedrooms</label>
          <input name="bedrooms" value={formData.bedrooms} onChange={handleChange} />

          <label>Bathrooms</label>
          <input name="bathrooms" value={formData.bathrooms} onChange={handleChange} />

          <label>Style</label>
          <input name="style" value={formData.style} onChange={handleChange} />

          <label>Receptions</label>
          <input name="receptions" value={formData.receptions} onChange={handleChange} />

          <label>Parking</label>
          <input name="parking" value={formData.parking} onChange={handleChange} />

          <label>Land (acres)</label>
          <input name="land" value={formData.land} onChange={handleChange} />

          <label>
            <input
              type="checkbox"
              name="onMarket"
              checked={formData.onMarket}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, onMarket: e.target.checked }))
              }
            />
            On Market
          </label>

          <label>Property Photos</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoChange}
          />

          <label>Floorplan (PDF/Image)</label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => handleFileChange(e, "floorplan")}
          />

          <label>EPC (PDF/Image)</label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => handleFileChange(e, "epc")}
          />

          <div className="form-buttons">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPropertyModal;