import React from "react";
import "./ClientsTable.css";

// Helper function to format client names
function formatClientName(client) {
  if (client.spouse1FirstName) {
    if (client.spouse2FirstName) {
      return `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
    }
    // Single spouse: show first + surname if present
    if (client.spouse1Surname) return `${client.spouse1FirstName} ${client.spouse1Surname}`;
    return client.spouse1FirstName;
  }
  // Fallback to old name field for existing data
  return client.name || "Unknown";
}

function ClientsTable({ 
  clients, 
  onNewClientClick, 
  onArchiveClient, 
  onRestore, 
  onToggleView, 
  showArchived, 
  onRowClick 
}) {
  return (
    <div className="clients-table-container">
      <div className="table-header">
        <h2>{showArchived ? "Archived Clients" : "Active Clients"}</h2>
        <div className="table-actions">
          {!showArchived && (
            <button onClick={onNewClientClick} className="new-client-btn">
              + New Client
            </button>
          )}
          <button onClick={onToggleView} className="toggle-btn">
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
        </div>
      </div>

      <table className="clients-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Client Source</th>
            <th>Max Budget</th>
            <th>Phone</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => (
            <tr key={index} onClick={() => onRowClick(client)} className="clickable-row">
              <td>{formatClientName(client)}</td>
              <td>
                <span className={`status-badge ${(client.status || "unknown").toLowerCase().replace(/\s/g, '-')}`}>
                  {client.status || "Unknown"}
                </span>
              </td>
              <td>{client.clientSource || "—"}</td>
              <td>£{Number(client.maxBudget).toLocaleString()}</td>
              <td>{client.phoneNumber}</td>
              <td>
                {showArchived ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(client);
                    }}
                    className="restore-btn"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchiveClient(client);
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

export default ClientsTable;