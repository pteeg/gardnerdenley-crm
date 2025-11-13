import React, { useMemo, useState, useEffect } from 'react';
import './PropertiesPage.css';
import Sidebar from '../Sidebar';
import NewPropertyModal from './NewPropertyModal';
import PropertyPage from './PropertyPage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';

const PropertiesPage = ({ professionals, properties = [], onArchiveProperty, onRestoreProperty, onToggleView, showArchived }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Sync selectedProperty with properties array when it updates (especially for comparables)
  useEffect(() => {
    if (selectedProperty) {
      const updatedProperty = properties.find(p => p.id === selectedProperty.id);
      if (updatedProperty) {
        // Check if comparables array has changed
        const currentComparables = JSON.stringify(selectedProperty.comparables || []);
        const newComparables = JSON.stringify(updatedProperty.comparables || []);
        if (currentComparables !== newComparables) {
          setSelectedProperty(updatedProperty);
        }
      }
    }
  }, [properties, selectedProperty?.id]);

  const filteredProperties = properties.filter(property => {
    if (showArchived) return property.archived;
    if (selectedFilter === 'on') return property.status === "On Market" && !property.archived;
    if (selectedFilter === 'off') return property.status === "Off Market" && !property.archived;
    if (selectedFilter === 'matched') return property.status === "Matched" && !property.archived;
    if (selectedFilter === 'sold') return property.status === "Sold" && !property.archived;
    return !property.archived; // "all" = not archived
  });

  const [searchTerm, setSearchTerm] = useState("");

  const visibleProperties = useMemo(() => {
    const raw = searchTerm.trim().toLowerCase();
    const base = selectedFilter === 'fav' ? filteredProperties.filter(p => p.favourite === true) : filteredProperties;
    if (!raw) return [...base].sort((a, b) => (b?.favourite === true) - (a?.favourite === true));
    const tokens = raw.split(/\s+/).filter(Boolean);
    const normalize = (v) => String(v ?? "").toLowerCase();
    const normalizeNum = (v) => String(v ?? "").replace(/[^0-9]/g, "");
    return base.filter((p) => {
      const parts = [];
      parts.push(p.name, p.description, p.address, p.status, p.vendor, p.ownerDetails);
      parts.push(p.style, p.parking);
      parts.push(p.bedrooms, p.bathrooms, p.receptions, p.floorSize, p.land);
      // price numeric
      const priceNum = normalizeNum(p.price);
      if (priceNum) parts.push(priceNum);
      // linked clients names
      if (Array.isArray(p.linkedClients)) {
        p.linkedClients.forEach(c => {
          if (typeof c === 'string') parts.push(c);
          else if (c) {
            const firsts = [c.spouse1FirstName, c.spouse2FirstName].filter(Boolean).join(' and ');
            const single = c.spouse1Surname ? `${c.spouse1FirstName || ''} ${c.spouse1Surname}`.trim() : c.spouse1FirstName || '';
            parts.push(firsts || single || c.name);
          }
        });
      }
      const haystack = normalize(parts.filter(Boolean).join(' \u2022 '));
      const haystackNum = normalizeNum(parts.filter(Boolean).join(' '));
      return tokens.every(t => haystack.includes(t) || (/[0-9]/.test(t) && haystackNum.includes(t.replace(/[^0-9]/g, ''))));
    })
    .sort((a, b) => (b?.favourite === true) - (a?.favourite === true));
  }, [filteredProperties, selectedFilter, searchTerm]);

  const handleFilterClick = (filter) => {
    setSelectedFilter(filter);
    setSelectedProperty(null); // reset when toggling views
  };

  const handleAddProperty = async (newProperty) => {
    const { createProperty } = await import('../lib/propertiesApi');
    await createProperty(newProperty);
    setIsAdding(false);
  };

  const handleRowClick = (property) => {
    setSelectedProperty(property);
  };

  const handleBackFromDetail = () => {
    setSelectedProperty(null);
  };

  const handleToggleArchive = async (id, archived) => {
    const { toggleArchiveProperty } = await import('../lib/propertiesApi');
    await toggleArchiveProperty(id, !archived);
  };

  const handleDeleteProperty = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this property? This action cannot be undone.')) {
      const { deletePropertyById } = await import('../lib/propertiesApi');
      await deletePropertyById(id);
    }
  };

  // Get the title based on selected filter
  const getPageTitle = () => {
    if (showArchived) return 'Archived Properties';
    const filterLabels = {
      'all': 'All Properties',
      'on': 'On Market',
      'off': 'Off Market',
      'matched': 'Matched',
      'sold': 'Acquired'
    };
    return filterLabels[selectedFilter] || 'Properties';
  };

  const handleUpdateProperty = async (id, updatedData) => {
    const { updatePropertyById } = await import('../lib/propertiesApi');
    await updatePropertyById(id, updatedData);
    
    // Update the selectedProperty with the new data
    if (selectedProperty && selectedProperty.id === id) {
      setSelectedProperty(prev => {
        // For arrays like comparables, replace them entirely rather than merging
        const merged = { ...prev };
        Object.keys(updatedData).forEach(key => {
          if (Array.isArray(updatedData[key])) {
            merged[key] = updatedData[key];
          } else {
            merged[key] = updatedData[key];
          }
        });
        return merged;
      });
    }
  };

  return (
    <div className="properties-container">
      <Sidebar
        title="Properties"
        items={[
          { key: 'all', label: 'All Properties', active: selectedFilter === 'all' && !showArchived, onClick: () => handleFilterClick('all') },
          { key: 'fav', label: 'Favourites', active: selectedFilter === 'fav' && !showArchived, onClick: () => handleFilterClick('fav') },
          { key: 'on', label: 'On Market', active: selectedFilter === 'on' && !showArchived, onClick: () => handleFilterClick('on') },
          { key: 'off', label: 'Off Market', active: selectedFilter === 'off' && !showArchived, onClick: () => handleFilterClick('off') },
          { key: 'matched', label: 'Matched', active: selectedFilter === 'matched' && !showArchived, onClick: () => handleFilterClick('matched') },
          { key: 'sold', label: 'Acquired', active: selectedFilter === 'sold' && !showArchived, onClick: () => handleFilterClick('sold') },
        ]}
      />

      {/* Main content */}
      <div className="properties-content">
        {!selectedProperty ? (
          <>
            <div className="properties-header">
              <h2>{getPageTitle()}</h2>
              <div className="table-actions">
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="table-search-input"
                  aria-label="Search properties"
                />
                {!showArchived && (
                  <button className="new-client-btn" onClick={() => setIsAdding(true)}>+ Add Property</button>
                )}
                <button onClick={onToggleView} className="toggle-btn">
                  {showArchived ? "Show Active" : "Show Archived"}
                </button>
              </div>
            </div>

            <table className="properties-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Guide Price</th>
                  <th>Status</th>
                  <th style={{ width: '120px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleProperties.map(property => (
                  <tr key={property.id}>
                    <td onClick={(e) => e.stopPropagation()} style={{ width: '40px' }}>
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
                    <td onClick={() => handleRowClick(property)}>{property.name}</td>
                    <td onClick={() => handleRowClick(property)}>{property.description}</td>
                    <td onClick={() => handleRowClick(property)}>{property.price ? `£${Number(property.price).toLocaleString()}` : ''}</td>
                    <td onClick={() => handleRowClick(property)}>{property.status}</td>
                    <td style={{ width: '120px', textAlign: 'right' }}>
                      <div className="action-buttons">
                        <button
                          onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleToggleArchive(property.id, property.archived);
                          }}
                          className={property.archived ? "unarchive-button" : "archive-button"}
                        >
                          {property.archived ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <PropertyPage 
            property={selectedProperty} 
            onBack={handleBackFromDetail}
            professionals={professionals}
            onUpdateProperty={handleUpdateProperty}
            onDeleteProperty={handleDeleteProperty}
            allProperties={properties}
            onSelectProperty={(property) => setSelectedProperty(property)}
          />
        )}
      </div>

      {isAdding && (
        <NewPropertyModal 
          onClose={() => setIsAdding(false)} 
          onSave={handleAddProperty} 
          professionals={professionals}
        />
      )}
    </div>
  );
};

export default PropertiesPage;