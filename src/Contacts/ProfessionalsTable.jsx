import React, { useMemo, useState } from "react";
import "./ProfessionalsTable.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';

function ProfessionalsTable({ 
  professionals, 
  onArchiveProfessional, 
  onRestoreProfessional, 
  showArchived, 
  onRowClick, 
  onAddProfessional
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProfessionals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = !term ? professionals : professionals.filter((p) => (p.name || "").toLowerCase().includes(term));
    return [...base].sort((a, b) => (b?.favourite === true) - (a?.favourite === true));
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
        </div>
      </div>

      <div className="professionals-tiles-container">
        <div className="professionals-table-header-row">
          <div className="professional-tile-column-header"></div>
          <div className="professional-tile-column-header">Name</div>
          <div className="professional-tile-column-header">Company</div>
          <div className="professional-tile-column-header">Mobile</div>
          <div className="professional-tile-column-header">Email</div>
          <div className="professional-tile-column-header">Type</div>
        </div>
        {filteredProfessionals.length === 0 ? (
          <div className="empty-row">
            No professionals found
          </div>
        ) : (
          filteredProfessionals.map((professional, index) => (
            <div 
              key={index} 
              onClick={() => onRowClick(professional)} 
              className="professional-tile clickable-row"
            >
              <div className="professional-tile-favourite" onClick={(e) => { e.stopPropagation(); }}>
                <button
                  aria-label={professional.favourite ? 'Unfavourite' : 'Favourite'}
                  className="icon-button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { updateProfessionalById } = await import('../lib/professionalsApi');
                    await updateProfessionalById(professional.id, { favourite: !professional.favourite });
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <FontAwesomeIcon icon={professional.favourite ? faHeartSolid : faHeartRegular} style={{ color: '#555555', width: '18px', height: '18px' }} />
                </button>
              </div>
              <div className="professional-tile-name">{professional.name}</div>
              <div className="professional-tile-company">{professional.company || "—"}</div>
              <div className="professional-tile-mobile">{professional.phoneMobile || professional.phoneNumber || "—"}</div>
              <div className="professional-tile-email">{professional.email || "—"}</div>
              <div className="professional-tile-type">
                <span className="type-pill">{professional.type || '—'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ProfessionalsTable;