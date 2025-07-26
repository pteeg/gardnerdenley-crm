import React from "react";
import "./ClientsTable.css";

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
          <button onClick={onToggleView} className="toggle-btn">
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
          {!showArchived && (
            <button onClick={onNewClientClick} className="new-client-btn">
              + New Client
            </button>
          )}
        </div>
      </div>

      <table className="clients-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Brief</th>
            <th>Max Budget</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => (
            <tr key={index} onClick={() => onRowClick(client)} className="clickable-row">
              <td>{client.name}</td>
              <td>{client.status}</td>
              <td>{client.brief}</td>
              <td>{client.maxBudget}</td>
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