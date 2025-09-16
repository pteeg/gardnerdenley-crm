import React, { useState } from "react";
import "./AddClientForm.css";

function AddClientForm({ onClose, onSave, initialData = {}, isEdit = false }) {
  const [client, setClient] = useState(() => {
    const formattedBudget = initialData.maxBudget
      ? "£" + Number(initialData.maxBudget).toLocaleString()
      : "£";
    // Do not auto-populate search date

    return {
      phoneNumber: initialData.phoneNumber || "",
      email: initialData.email || "",
      brief: initialData.brief || "",
      maxBudget: formattedBudget,
      status: initialData.status || "Searching",
      spouse1FirstName: initialData.spouse1FirstName || "",
      spouse1Surname: initialData.spouse1Surname || "",
      spouse2FirstName: initialData.spouse2FirstName || "",
      spouse2Surname: initialData.spouse2Surname || "",
      clientSource: initialData.clientSource || "",
      referralContact: initialData.referralContact || "",
      positionFunding: initialData.positionFunding || "",
      disposal: initialData.disposal || "",
      searchStartDate: initialData.searchStartDate || ""
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
    if (!client.spouse1FirstName) {
      alert("Spouse 1 first name is required.");
      return;
    }

    const cleanedClient = {
      ...client,
      // Generate legacy-compatible name from spouse fields
      name: client.spouse1FirstName
        ? (client.spouse2FirstName
            ? `${client.spouse1FirstName} and ${client.spouse2FirstName} ${client.spouse1Surname}`
            : `${client.spouse1FirstName} ${client.spouse1Surname}`)
        : "",
      maxBudget: parseInt(client.maxBudget.replace(/[£,]/g, "")) || 0
    };

    onSave(cleanedClient);
    onClose();
  };

  return (
    <div className="modal-overlay add-client-modal">
      <div className="modal-content add-client-modal-content">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>{isEdit ? "Edit Client" : "New Client"}</h2>
        <div className="form-grid">
          {/* Left column: client details */}
          <div className="form-col">
            <label>Spouse 1 First Name *</label>
            <input 
              name="spouse1FirstName" 
              value={client.spouse1FirstName} 
              onChange={handleChange} 
            />

            <label>Spouse 1 Surname</label>
            <input 
              name="spouse1Surname" 
              value={client.spouse1Surname} 
              onChange={handleChange} 
            />

            <label>Phone</label>
            <input name="phoneNumber" value={client.phoneNumber} onChange={handleChange} />

            <label>Email</label>
            <input name="email" type="email" value={client.email} onChange={handleChange} />

            <label>Lead Source</label>
            <select 
              name="clientSource" 
              value={client.clientSource} 
              onChange={handleChange}
            >
              <option value="">Select source...</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="Search Engine">Search Engine</option>
              <option value="AI (Chat GPT)">AI (Chat GPT)</option>
              <option value="Social Media">Social Media</option>
            </select>

            {client.clientSource === "Referral" && (
              <>
                <label>Referral Contact (client/professional)</label>
                <input
                  name="referralContact"
                  value={client.referralContact}
                  onChange={handleChange}
                  placeholder="Start typing a name..."
                />
              </>
            )}
          </div>

          {/* Middle column: spouse 2 + brief + budget */}
          <div className="form-col">
            <label>Spouse 2 First Name</label>
            <input 
              name="spouse2FirstName" 
              value={client.spouse2FirstName} 
              onChange={handleChange} 
            />

            <label>Spouse 2 Surname</label>
            <input 
              name="spouse2Surname" 
              value={client.spouse2Surname} 
              onChange={handleChange} 
            />

            <label>Brief</label>
            <textarea className="brief-textarea" name="brief" value={client.brief} onChange={handleChange} />
          </div>

          {/* Right column: position/disposal/search date */}
          <div className="form-col">
            <label>Position (funding)</label>
            <select
              name="positionFunding"
              value={client.positionFunding}
              onChange={handleChange}
            >
              <option value="">Select position...</option>
              <option value="Cash and Mortgage">Cash and Mortgage</option>
              <option value="Cash">Cash</option>
            </select>

            <label>Disposal</label>
            <select 
              name="disposal" 
              value={client.disposal} 
              onChange={handleChange}
            >
              <option value="">Select disposal...</option>
              <option value="NTS">NTS</option>
              <option value="FTB">FTB</option>
              <option value="STS">STS</option>
              <option value="STS OTM">STS OTM</option>
              <option value="STS OTM OOA">STS OTM OOA</option>
              <option value="SSTC">SSTC</option>
            </select>

            <label>Search Start Date</label>
            <input
              type="date"
              name="searchStartDate"
              value={client.searchStartDate}
              onChange={handleChange}
            />

            <label>Max Budget</label>
            <input
              name="maxBudget"
              value={client.maxBudget}
              onChange={handleChange}
            />
          </div>

          <div className="full-width-row">
            <button className="save-button" onClick={handleSubmit}>
              {isEdit ? "Save Changes" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddClientForm;