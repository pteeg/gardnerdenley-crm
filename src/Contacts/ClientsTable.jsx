import React, { useMemo, useState } from "react";
import "./ClientsTable.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';

// Helper function to format client names
function formatClientName(client) {
  if (client.spouse1FirstName) {
    if (client.spouse2FirstName) {
      return client.spouse1Surname
        ? `${client.spouse1FirstName} and ${client.spouse2FirstName} ${client.spouse1Surname}`
        : `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
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
  onRowClick,
  favouritesOnly: favouritesOnlyProp
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(Boolean(favouritesOnlyProp));
  const favouritesOnly = favouritesOnlyProp !== undefined ? favouritesOnlyProp : showFavouritesOnly;

  const filteredClients = useMemo(() => {
    const raw = searchTerm.trim().toLowerCase();
    const favouritesOnly = favouritesOnlyProp !== undefined ? favouritesOnlyProp : showFavouritesOnly;
    const base = favouritesOnly ? (clients || []).filter(c => c.favourite === true) : clients;
    if (!raw) return [...base].sort((a, b) => (b?.favourite === true) - (a?.favourite === true));
    const tokens = raw.split(/\s+/).filter(Boolean);
    const normalize = (v) => String(v ?? "").toLowerCase();
    const normalizeNum = (v) => String(v ?? "").replace(/[^0-9]/g, "");
    const formatDisplayName = (c) => {
      if (c.spouse1FirstName && c.spouse2FirstName) {
        return c.spouse1Surname
          ? `${c.spouse1FirstName} and ${c.spouse2FirstName} ${c.spouse1Surname}`
          : `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
      }
      if (c.spouse1FirstName || c.spouse1Surname) {
        return [c.spouse1FirstName || "", c.spouse1Surname || ""].filter(Boolean).join(" ");
      }
      return c.name || "";
    };
    return base.filter((c) => {
      const haystackParts = [];
      haystackParts.push(formatDisplayName(c));
      haystackParts.push(c.phoneNumber, c.email, c.company, c.currentAddress);
      haystackParts.push(c.searchStartDate, c.clientSource, c.referralContact, c.positionFunding, c.disposal);
      haystackParts.push(c.brief);
      // budget numeric
      const budgetNum = normalizeNum(c.maxBudget);
      if (budgetNum) haystackParts.push(budgetNum);
      // notes
      if (Array.isArray(c.notes)) {
        c.notes.forEach(n => {
          haystackParts.push(n?.text);
          if (n?.date) haystackParts.push(new Date(n.date).toLocaleDateString());
        });
      }
      // associated contacts
      if (Array.isArray(c.associatedContacts)) {
        c.associatedContacts.forEach(ac => {
          haystackParts.push(formatDisplayName(ac?.client || {}));
          haystackParts.push(ac?.relation);
        });
      }
      // linked properties by name if present on client object
      if (Array.isArray(c.properties)) {
        c.properties.forEach(p => haystackParts.push(p?.name));
      }
      const haystack = normalize(haystackParts.filter(Boolean).join(" \u2022 "));
      const haystackNum = normalizeNum(haystackParts.filter(Boolean).join(" "));
      return tokens.every(t => haystack.includes(t) || (/[0-9]/.test(t) && haystackNum.includes(t.replace(/[^0-9]/g, ""))));
    })
    .sort((a, b) => (b?.favourite === true) - (a?.favourite === true));
  }, [clients, favouritesOnlyProp, showFavouritesOnly, searchTerm]);

  return (
    <div className="clients-table-container">
      <div className="table-header">
        <h2>{showArchived ? "Archived Clients" : "Active Clients"}</h2>
        <div className="table-actions">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="table-search-input"
            aria-label="Search clients"
          />
          {!showArchived && (
            <button onClick={onNewClientClick} className="new-client-btn">
              + New Client
            </button>
          )}
          {favouritesOnlyProp === undefined && (
            <button onClick={() => setShowFavouritesOnly(v => !v)} className="toggle-btn">
              {showFavouritesOnly ? 'Show All' : 'Favourites'}
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
            <th></th>
            <th>Name</th>
            <th>Status</th>
            <th>Client Source</th>
            <th>Max Budget</th>
            <th>Phone</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredClients.map((client, index) => (
            <tr key={index} onClick={() => onRowClick(client)} className="clickable-row">
              <td onClick={(e) => { e.stopPropagation(); }}>
                <button
                  aria-label={client.favourite ? 'Unfavourite' : 'Favourite'}
                  className="icon-button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { updateClientById } = await import('../lib/clientsApi');
                    await updateClientById(client.id, { favourite: !client.favourite });
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <FontAwesomeIcon icon={client.favourite ? faHeartSolid : faHeartRegular} style={{ color: '#555555', width: '18px', height: '18px' }} />
                </button>
              </td>
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