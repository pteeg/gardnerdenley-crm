import React from "react";
import "./ProfessionalsTable.css";

function ProfessionalsTable({ 
  professionals, 
  onArchiveProfessional, 
  onRestoreProfessional, 
  onToggleView, 
  showArchived, 
  onRowClick 
}) {
  return (
    <div className="professionals-table-container">
      <div className="table-header">
        <h2>{showArchived ? "Archived Professionals" : "Active Professionals"}</h2>
        <div className="table-actions">
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
            <th>Current Client</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {professionals.map((professional, index) => (
            <tr key={index} onClick={() => onRowClick(professional)} className="clickable-row">
              <td>{professional.name}</td>
              <td>{professional.company}</td>
              <td>{professional.phoneNumber}</td>
              <td>{professional.email}</td>
              <td>{professional.currentClient || "None"}</td>
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