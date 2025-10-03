import React from "react";
import "./PropertiesTable.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';

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
            <th></th>
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
              <td colSpan="6" className="empty-row">
                {showArchived
                  ? "No archived properties."
                  : "No active properties."}
              </td>
            </tr>
          ) : (
            properties.map((property, index) => (
              <tr key={index}>
                <td>
                  <button
                    aria-label={property.favourite ? 'Unfavourite' : 'Favourite'}
                    className="icon-button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const { updatePropertyById } = await import('../lib/propertiesApi');
                      await updatePropertyById(property.id, { favourite: !property.favourite });
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <FontAwesomeIcon icon={property.favourite ? faHeartSolid : faHeartRegular} style={{ color: '#555555', width: '18px', height: '18px' }} />
                  </button>
                </td>
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