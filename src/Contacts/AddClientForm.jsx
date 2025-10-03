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
      company: initialData.company || "",
      brief: initialData.brief || "",
      maxBudget: formattedBudget,
      status: initialData.status || "Searching",
      types: (
        isEdit
          ? (Array.isArray(initialData.types) ? initialData.types : [])
          : (
              Array.isArray(initialData.types) && initialData.types.length > 0
                ? initialData.types
                : ["Client"]
            )
      ),
      currentAddress: initialData.currentAddress || "",
      spouse1Title: initialData.spouse1Title || "",
      spouse1FirstName: initialData.spouse1FirstName || "",
      spouse1Surname: initialData.spouse1Surname || "",
      spouse2Title: initialData.spouse2Title || "",
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

    if (!Array.isArray(client.types) || client.types.length === 0) {
      alert("Please select at least one Type (e.g. Client, Developer, or Vendor).");
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
        <div className="tiles">
          {/* Contact Details Tile */}
          <div className="tile tile-contact">
            <h3 className="tile-title">Contact Details</h3>
            <div className="tile-grid">
              <div className="tile-subtitle">Primary Client</div>
            <div className="tile-field">
              <select
                name="spouse1Title"
                value={client.spouse1Title}
                onChange={handleChange}
                aria-label="Primary title"
              >
                <option value="">Title</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Miss">Miss</option>
                <option value="Master">Master</option>
                <option value="Sir">Sir</option>
                <option value="Lord">Lord</option>
              </select>
            </div>
              <div className="tile-field">
                <input
                  name="spouse1FirstName"
                  value={client.spouse1FirstName}
                  onChange={handleChange}
                  placeholder="First Name *"
                  required
                />
              </div>
              <div className="tile-field">
                <input
                  name="spouse1Surname"
                  value={client.spouse1Surname}
                  onChange={handleChange}
                  placeholder="Surname"
                />
              </div>
              <div className="tile-field">
                <input
                  name="phoneNumber"
                  value={client.phoneNumber}
                  onChange={handleChange}
                  placeholder="Phone"
                />
              </div>
              <div className="tile-field">
                <input
                  name="email"
                  type="email"
                  value={client.email}
                  onChange={handleChange}
                  placeholder="Email"
                />
              </div>
            <div className="tile-field">
              <input
                name="company"
                value={client.company}
                onChange={handleChange}
                placeholder="Company"
              />
            </div>
              <div className="tile-subtitle">Spouse</div>
            <div className="tile-field">
              <select
                name="spouse2Title"
                value={client.spouse2Title}
                onChange={handleChange}
                aria-label="Spouse title"
              >
                <option value="">Title</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Miss">Miss</option>
                <option value="Master">Master</option>
                <option value="Sir">Sir</option>
                <option value="Lord">Lord</option>
              </select>
            </div>
              <div className="tile-field">
                <input
                  name="spouse2FirstName"
                  value={client.spouse2FirstName}
                  onChange={handleChange}
                  placeholder="First Name"
                />
              </div>
              <div className="tile-field">
                <input
                  name="spouse2Surname"
                  value={client.spouse2Surname}
                  onChange={handleChange}
                  placeholder="Surname"
                />
              </div>
              
            </div>
          </div>

          {/* Middle column stack: Financials + Lead Source */}
          <div className="tile-middle-col">
            <div className="tile tile-middle financials">
              <h3 className="tile-title">Buying Position</h3>
              <div className="tile-grid single">
                <div className="tile-field">
                  <input name="maxBudget" value={client.maxBudget} onChange={handleChange} placeholder="Max Budget" />
                </div>
                <div className="tile-field">
                  <select name="positionFunding" value={client.positionFunding} onChange={handleChange} aria-label="Position (funding)">
                    <option value="">Select Position</option>
                    <option value="Cash and Mortgage">Cash and Mortgage</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div className="tile-field">
                  <select name="disposal" value={client.disposal} onChange={handleChange} aria-label="Disposal">
                    <option value="">Select Disposal</option>
                    <option value="NTS">NTS</option>
                    <option value="FTB">FTB</option>
                    <option value="STS">STS</option>
                    <option value="STS OTM">STS OTM</option>
                    <option value="STS OTM OOA">STS OTM OOA</option>
                    <option value="SSTC">SSTC</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="tile tile-middle lead">
              <h3 className="tile-title">Lead Source</h3>
              <div className="tile-grid single">
                <div className="tile-field" style={{ gridColumn: '1 / -1' }}>
                  <select
                    name="clientSource"
                    value={client.clientSource}
                    onChange={handleChange}
                    aria-label="Lead Source"
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Source</option>
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Search Engine">Search Engine</option>
                    <option value="AI (Chat GPT)">AI (Chat GPT)</option>
                    <option value="Social Media">Social Media</option>
                  </select>
                </div>
                {client.clientSource === "Referral" && (
                  <div className="tile-field" style={{ gridColumn: '1 / -1' }}>
                    <input
                      name="referralContact"
                      value={client.referralContact}
                      onChange={handleChange}
                      placeholder="Referral Contact (client/professional)"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Current Address tile */}
            <div className="tile tile-middle" style={{ marginTop: '12px' }}>
              <h3 className="tile-title">Current Address</h3>
              <div className="tile-grid single">
                <div className="tile-field" style={{ gridColumn: '1 / -1' }}>
                  <input
                    name="currentAddress"
                    value={client.currentAddress}
                    onChange={handleChange}
                    placeholder="Enter current address"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right column: Search Details (Brief + Search Date) */}
          <div className="tile-right-col">
            <div className="tile tile-right search-details">
              <h3 className="tile-title">Search Details</h3>
              <div className="tile-grid single">
                <div className="tile-field" style={{ gridColumn: '1 / -1' }}>
                  <textarea className="brief-textarea" name="brief" value={client.brief} onChange={handleChange} placeholder="Brief" />
                </div>
                <div className="tile-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Search Start Date</label>
                  <input
                    type="date"
                    name="searchStartDate"
                    value={client.searchStartDate}
                    onChange={handleChange}
                    placeholder="Search Start Date"
                  />
                </div>
              </div>
            </div>

            {/* Type tile moved under Search Details */}
            <div className="tile tile-right" style={{ marginTop: '12px' }}>
              <h3 className="tile-title">Type</h3>
              <div className="tile-grid single">
                <div className="tile-field" style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Client', 'Developer', 'Vendor'].map((t) => {
                    const selected = client.types.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => {
                          setClient(prev => {
                            const has = prev.types.includes(t);
                            const nextTypes = has ? prev.types.filter(x => x !== t) : [...prev.types, t];
                            return { ...prev, types: nextTypes };
                          });
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '16px',
                          border: '1px solid ' + (selected ? '#2b6cb0' : '#cbd5e0'),
                          background: selected ? '#e6f0fb' : '#fff',
                          color: selected ? '#2b6cb0' : '#333',
                          cursor: 'pointer'
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
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