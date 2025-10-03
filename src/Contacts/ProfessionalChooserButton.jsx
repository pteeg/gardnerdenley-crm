import React, { useState } from "react";
import "./ProfessionalChooserButton.css";
import NewProfessionalModal from "./NewProfessionalModal";

function ProfessionalChooserButton({
  type,                // e.g. "Solicitor" | "Surveyor" | "MortgageAdvisor"
  value,               // currently selected professional ID or name
  label,               // currently selected professional's name
  professionals,       // full professionals list
  onSelect,            // callback when a professional is chosen
  onAddProfessional    // function to add a new professional
}) {
  const [showModal, setShowModal] = useState(false);
  const [showNewProfessionalModal, setShowNewProfessionalModal] = useState(false);

  // ✅ Safer filtering: only runs .toLowerCase() if pro.type exists
  const filteredPros = (professionals || []).filter(
    (pro) => pro.type?.toLowerCase() === type?.toLowerCase() && !pro.archived
  );

  const handleChoose = (pro) => {
    onSelect(pro.id, pro.name);
    setShowModal(false);
  };

  return (
    <div className="professional-chooser">
      {/* Button showing either selected name or "Choose" */}
      <button className="chooser-btn" onClick={() => setShowModal(true)}>
        {label || "Choose"}
      </button>

      {/* Modal for selecting professionals */}
      {showModal && (
        <div className="chooser-modal-overlay">
          <div className="chooser-modal-content">
            <h3>Select {type}</h3>

            {filteredPros.length > 0 ? (
              <ul className="professional-list">
                {filteredPros.map((pro, idx) => (
                  <li
                    key={idx}
                    className="professional-item"
                    onClick={() => handleChoose(pro)}
                  >
                    <strong>{pro.name}</strong>
                    {pro.company && <span className="company">{pro.company}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-results">No {type}s found</p>
            )}

            <div className="chooser-modal-buttons">
              <button
                className="add-btn"
                onClick={() => {
                  setShowModal(false);
                  setShowNewProfessionalModal(true);
                }}
              >
                + Add New {type}
              </button>
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "Add New Professional" modal */}
      {showNewProfessionalModal && (
        <NewProfessionalModal
          type={type}   // ✅ ensures the new professional gets the right type
          onClose={() => setShowNewProfessionalModal(false)}
          onAddProfessional={onAddProfessional}
        />
      )}
    </div>
  );
}

export default ProfessionalChooserButton;