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
    <div className="clients-container">
      <div className="clients-header">
        <h2>Clients {showArchived && "(Archived)"}</h2>
        <div className="clients-buttons">
          <button className="primary-btn" onClick={onNewClientClick}>
            + New Client
          </button>
          <button className="secondary-btn" onClick={onToggleView}>
            {showArchived ? "View Active" : "View Archived"}
          </button>
        </div>
      </div>

      <table className="clients-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Name</th>
            <th>Brief</th>
            <th>Max Budget</th>
            <th>Phone Number</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty-row">
                {showArchived
                  ? "No archived clients."
                  : "No active clients. Add one!"}
              </td>
            </tr>
          ) : (
            clients.map((client, index) => (
              <tr 
                key={index}
                className="clickable-row"
                onClick={() => !showArchived && onRowClick(client)}
                >
                <td>{client.status}</td>
                <td>{client.name}</td>
                <td>{client.brief}</td>
                <td>{client.maxBudget}</td>
                <td>{client.phoneNumber}</td>
                <td>
                  {!showArchived ? (
                    <button
                      className="archive-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // ✅ prevent triggering row click
                        onArchiveClient(client);
                      }}
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      className="restore-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // ✅ prevent triggering row click
                        onRestore(client);
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

export default ClientsTable;