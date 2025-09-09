import React, { useState } from "react";
import "./AddClientForm.css";

function AddClientForm({ onClose, onSave, initialData = {}, isEdit = false }) {
  const [client, setClient] = useState(() => {
    const formattedBudget = initialData.maxBudget
      ? "£" + Number(initialData.maxBudget).toLocaleString()
      : "£";

    return {
      name: initialData.name || "",
      phoneNumber: initialData.phoneNumber || "",
      brief: initialData.brief || "",
      maxBudget: formattedBudget,
      status: initialData.status || "Searching"
    };
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "maxBudget") {
      const numeric = value.replace(/[^\d]/g, ""); // Remove non-digits
      const formatted = numeric ? "£" + Number(numeric).toLocaleString() : "£";
      setClient(prev => ({
        ...prev,
        [name]: formatted
      }));
    } else {
      setClient(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = () => {
    if (!client.name || !client.phoneNumber) {
      alert("Name and phone are required.");
      return;
    }

    const cleanedClient = {
      ...client,
      maxBudget: parseInt(client.maxBudget.replace(/[£,]/g, "")) || 0
    };

    onSave(cleanedClient);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>{isEdit ? "Edit Client" : "New Client"}</h2>

        <label>Name</label>
        <input name="name" value={client.name} onChange={handleChange} />

        <label>Phone</label>
        <input name="phoneNumber" value={client.phoneNumber} onChange={handleChange} />

        <label>Brief</label>
        <textarea name="brief" value={client.brief} onChange={handleChange} />

        <label>Max Budget</label>
        <input
          name="maxBudget"
          value={client.maxBudget}
          onChange={handleChange}
        />

        <button className="save-button" onClick={handleSubmit}>
          {isEdit ? "Save Changes" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default AddClientForm;