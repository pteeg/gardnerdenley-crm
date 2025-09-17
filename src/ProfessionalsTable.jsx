import React, { useMemo, useState } from "react";
import "./ProfessionalsTable.css";

function ProfessionalsTable({ 
  professionals, 
  onArchiveProfessional, 
  onRestoreProfessional, 
  onToggleView, 
  showArchived, 
  onRowClick, 
  onAddProfessional
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProfessionals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return professionals;
    return professionals.filter((p) => (p.name || "").toLowerCase().includes(term));
  }, [professionals, searchTerm]);

  return (
    <div className="professionals-table-container">
      <div className="table-header">
        <h2>{showArchived ? "Archived Professionals" : "Active Professionals"}</h2>
        <div className="table-actions">
          <input
            type="text"
            placeholder="Search professionals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="table-search-input"
            aria-label="Search professionals"
          />
          {!showArchived && (
            <button onClick={onAddProfessional} className="add-btn">
              + New Professional
            </button>
          )}
          <button onClick={onToggleView} className="toggle-btn">
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
        </div>
      </div>

      <table className="professionals-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredProfessionals.map((professional, index) => (
            <tr key={index} onClick={() => onRowClick(professional)} className="clickable-row">
              <td>{professional.name}</td>
              <td>{professional.company}</td>
              <td>{professional.phoneNumber}</td>
              <td>{professional.email}</td>
              <td>{professional.type}</td>
              <td>
                {showArchived ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreProfessional(professional);
                    }}
                    className="restore-btn"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchiveProfessional(professional);
                    }}
                    className="archive-btn"
                  >
                    Archive
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProfessionalsTable;