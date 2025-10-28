import React, { useState, useEffect } from "react";
import "./NewProfessionalModal.css";
import { v4 as uuidv4 } from "uuid"; // use the same UUID generator

function NewProfessionalModal({ onClose, onAddProfessional, passedType = "", type, initialName = "" }) {
  const resolvedType = passedType || type || "";
  // Initialise form state
  const [formData, setFormData] = useState({
    name: initialName || "",
    company: "",
    email: "",
    phoneMobile: "",
    phoneWork: "",
    type: resolvedType || "",
  });

  // Update the form when a passedType is given later
  useEffect(() => {
    if (resolvedType) {
      setFormData((prev) => ({ ...prev, type: resolvedType }));
    }
  }, [resolvedType]);

  // Prefill the name when provided
  useEffect(() => {
    if (initialName) {
      setFormData((prev) => ({ ...prev, name: initialName }));
    }
  }, [initialName]);

  // Handle input updates
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation: require at least a name and type
    if (!formData.name.trim()) {
      alert("Please enter the professional's name");
      return;
    }
    if (!formData.type) {
      alert("Please select the professional type");
      return;
    }

    // Build a complete new professional object
    const newProfessional = {
      id: uuidv4(), // always generate a unique ID here
      name: formData.name.trim(),
      company: formData.company.trim(),
      email: formData.email.trim(),
      phoneMobile: formData.phoneMobile.trim(),
      phoneWork: formData.phoneWork.trim(),
      // Backward compatibility: keep phoneNumber populated with mobile if provided
      phoneNumber: (formData.phoneMobile || formData.phoneWork || "").trim(),
      type: formData.type,
    };

    // Send the complete object back up
    onAddProfessional(newProfessional);

    // Reset form
    setFormData({
      name: "",
      company: "",
      email: "",
      phoneMobile: "",
      phoneWork: "",
      type: passedType || "",
    });

    // Close modal after saving
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>
          {resolvedType ? `Add ${resolvedType}` : "Add New Professional"}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label>Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              required
            />
          </div>

          {/* Company */}
          <div className="form-group">
            <label>Company</label>
            <input
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Company"
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>Mobile Number</label>
            <input
              type="tel"
              name="phoneMobile"
              value={formData.phoneMobile}
              onChange={handleChange}
              placeholder="Mobile"
            />
          </div>
          <div className="form-group">
            <label>Work Number</label>
            <input
              type="tel"
              name="phoneWork"
              value={formData.phoneWork}
              onChange={handleChange}
              placeholder="Work"
            />
          </div>

          {/* Type dropdown only if no passedType */}
          {!passedType && (
            <div className="form-group">
              <label>Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="">Select Type</option>
                <option value="Solicitor">Solicitor</option>
                <option value="Agent">Agent</option>
                <option value="Surveyor">Surveyor</option>
                <option value="Mortgage Advisor">Mortgage Advisor</option>
                <option value="SDLT Advisor">SDLT Advisor</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="form-buttons single">
            <button type="submit" className="save-button">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewProfessionalModal;