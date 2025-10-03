import React, { useMemo, useState } from "react";
import "./ProfessionalsTable.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';

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
          <button onClick={onToggleView} className="toggle-btn">
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
        </div>
      </div>

      <table className="professionals-table">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Company</th>
            <th>Email</th>
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredProfessionals.map((professional, index) => (
            <tr key={index} onClick={() => onRowClick(professional)} className="clickable-row">
              <td onClick={(e) => e.stopPropagation()}>
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
              </td>
              <td>{professional.name}</td>
              <td>{professional.company}</td>
              <td>{professional.email}</td>
              <td>
                <span className="type-pill">{professional.type || '—'}</span>
              </td>
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