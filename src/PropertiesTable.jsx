import React from "react";
import "./PropertiesTable.css";

function PropertiesTable({
  properties,
  onArchiveProperty,
  onRestoreProperty,
  onToggleView,
  showArchived
}) {
  return (
    <div className="properties-container">
      <div className="properties-header">
        <h2>Properties {showArchived && "(Archived)"}</h2>
        <div className="properties-buttons">
          <button className="secondary-btn" onClick={onToggleView}>
            {showArchived ? "View Active" : "View Archived"}
          </button>
        </div>
      </div>

      <table className="properties-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Brief</th>
            <th>Price</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {properties.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-row">
                {showArchived
                  ? "No archived properties."
                  : "No active properties."}
              </td>
            </tr>
          ) : (
            properties.map((property, index) => (
              <tr key={index}>
                <td>{property.name}</td>
                <td>{property.brief}</td>
                <td>{property.price}</td>
                <td>{property.status}</td>
                <td>
                  {!showArchived ? (
                    <button
                      className="archive-btn"
                      onClick={() => onArchiveProperty(property)}
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      className="restore-btn"
                      onClick={() => onRestoreProperty(property)}
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

export default PropertiesTable;