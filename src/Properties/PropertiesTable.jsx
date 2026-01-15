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
      <div className="table-header">
        <h2>{showArchived ? "Archived Properties" : "Active Properties"}</h2>
        <div className="table-actions">
          <button className="toggle-btn" onClick={onToggleView}>
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
        </div>
      </div>

      <div className="properties-tiles-container">
        <div className="properties-table-header-row">
          <div className="property-tile-column-header"></div>
          <div className="property-tile-column-header">Name</div>
          <div className="property-tile-column-header">Brief</div>
          <div className="property-tile-column-header">Price</div>
          <div className="property-tile-column-header">Status</div>
          <div className="property-tile-column-header"></div>
        </div>
        {properties.length === 0 ? (
          <div className="empty-row">
            {showArchived ? "No archived properties." : "No active properties."}
          </div>
        ) : (
          properties.map((property, index) => (
            <div 
              key={index} 
              className="property-tile clickable-row"
            >
              <div className="property-tile-favourite" onClick={(e) => { e.stopPropagation(); }}>
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
              </div>
              <div className="property-tile-name">{property.name}</div>
              <div className="property-tile-brief">{property.brief || "—"}</div>
              <div className="property-tile-price">{property.price ? `£${Number(property.price).toLocaleString()}` : "—"}</div>
              <div className="property-tile-status">{property.status || "—"}</div>
              <div className="property-tile-actions" onClick={(e) => { e.stopPropagation(); }}>
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PropertiesTable;