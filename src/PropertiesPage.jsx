import React, { useMemo, useState } from 'react';
import './PropertiesPage.css';
import Sidebar from './Sidebar';
import NewPropertyModal from './NewPropertyModal';
import PropertyPage from './PropertyPage';

const PropertiesPage = ({ professionals, properties = [], onArchiveProperty, onRestoreProperty, onToggleView, showArchived }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

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
    const term = searchTerm.trim().toLowerCase();
    if (!term) return filteredProperties;
    return filteredProperties.filter((p) => (p.name || "").toLowerCase().includes(term));
  }, [filteredProperties, searchTerm]);

  const handleFilterClick = (filter) => {
    setSelectedFilter(filter);
    setSelectedProperty(null); // reset when toggling views
  };

  const handleAddProperty = async (newProperty) => {
    const { createProperty } = await import('./lib/propertiesApi');
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
    const { toggleArchiveProperty } = await import('./lib/propertiesApi');
    await toggleArchiveProperty(id, !archived);
  };

  const handleDeleteProperty = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this property? This action cannot be undone.')) {
      const { deletePropertyById } = await import('./lib/propertiesApi');
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
    const { updatePropertyById } = await import('./lib/propertiesApi');
    await updatePropertyById(id, updatedData);
    
    // Update the selectedProperty with the new data
    if (selectedProperty && selectedProperty.id === id) {
      setSelectedProperty(prev => ({
        ...prev,
        ...updatedData
      }));
    }
  };

  return (
    <div className="properties-container">
      <Sidebar
        title="Properties"
        items={[
          { key: 'all', label: 'All Properties', active: selectedFilter === 'all' && !showArchived, onClick: () => handleFilterClick('all') },
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
                  <th>Name</th>
                  <th>Description</th>
                  <th>Guide Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleProperties.map(property => (
                  <tr key={property.id}>
                    <td onClick={() => handleRowClick(property)}>{property.name}</td>
                    <td onClick={() => handleRowClick(property)}>{property.description}</td>
                    <td onClick={() => handleRowClick(property)}>{property.price ? `£${Number(property.price).toLocaleString()}` : ''}</td>
                    <td onClick={() => handleRowClick(property)}>{property.status}</td>
                    <td>
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