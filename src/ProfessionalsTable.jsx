import React from "react";
import "./ClientsTable.css"; // Reuse the same table styles for now

function ProfessionalsTable({
  professionals,
  onArchiveProfessional,
  onRestoreProfessional,
  onToggleView,
  showArchived,
  onRowClick
}) {
  return (
    <div className="clients-container">
      <div className="clients-header">
        <h2>Professionals {showArchived && "(Archived)"}</h2>
        <div className="clients-buttons">
          <button className="secondary-btn" onClick={onToggleView}>
            {showArchived ? "View Active" : "View Archived"}
          </button>
        </div>
      </div>

      <table className="clients-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Phone Number</th>
            <th>Email</th>
            <th>Current Client</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {professionals.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty-row">
                {showArchived
                  ? "No archived professionals."
                  : "No active professionals."}
              </td>
            </tr>
          ) : (
            professionals.map((pro, index) => (
              <tr
                key={index}
                className="clickable-row"
                onClick={() => !showArchived && onRowClick(pro)}
              >
                <td>{pro.name}</td>
                <td>{pro.company}</td>
                <td>{pro.phoneNumber}</td>
                <td>{pro.email}</td>
                <td>{pro.currentClient || "—"}</td>
                <td>
                  {!showArchived ? (
                    <button
                      className="archive-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveProfessional(pro);
                      }}
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      className="restore-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreProfessional(pro);
                      }}
                    >
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProfessionalsTable;