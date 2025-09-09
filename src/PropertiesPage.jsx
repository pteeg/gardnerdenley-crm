import React, { useState } from 'react';
import './PropertiesPage.css';
import Sidebar from './Sidebar';
import NewPropertyModal from './NewPropertyModal';
import PropertyPage from './PropertyPage';

const PropertiesPage = ({ professionals }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const [properties, setProperties] = useState([
    {
      id: 1,
      name: '12 Latham Road',
      brief: '5-bed detached, large garden',
      price: '£2,500,000',
      status: 'On Market',
      archived: false,
    },
    {
      id: 2,
      name: '24 Chaucer Road',
      brief: '4-bed semi-detached, needs renovation',
      price: '£1,200,000',
      status: 'On Market',
      archived: false,
    },
    {
      id: 3,
      name: '31 Milton Road',
      brief: '3-bed end terrace, garden flat',
      price: '£800,000',
      status: 'Off Market',
      archived: false,
    }
  ]);

  const filteredProperties = properties.filter(property => {
    if (selectedFilter === 'archived') return property.archived;
    if (selectedFilter === 'on') return property.status === "On Market" && !property.archived;
    if (selectedFilter === 'off') return property.status === "Off Market" && !property.archived;
    if (selectedFilter === 'matched') return property.status === "Matched" && !property.archived;
    if (selectedFilter === 'sold') return property.status === "Sold" && !property.archived;
    return !property.archived; // "all" = not archived
  });

  const handleFilterClick = (filter) => {
    setSelectedFilter(filter);
    setSelectedProperty(null); // reset when toggling views
  };

  const handleAddProperty = (newProperty) => {
    const propertyWithId = {
      ...newProperty,
      id: properties.length + 1,
      archived: false,
    };
    setProperties([...properties, propertyWithId]);
    setIsAdding(false);
  };

  const handleRowClick = (property) => {
    setSelectedProperty(property);
  };

  const handleBackFromDetail = () => {
    setSelectedProperty(null);
  };

  const handleToggleArchive = (id) => {
    setProperties(prev =>
      prev.map(property =>
        property.id === id
          ? { ...property, archived: !property.archived }
          : property
      )
    );
  };

  return (
    <div className="properties-container">
      <Sidebar
        title="Properties"
        items={[
          { key: 'all', label: 'All Properties', icon: '🏡', active: selectedFilter === 'all', onClick: () => handleFilterClick('all') },
          { key: 'on', label: 'On Market', icon: '🟢', active: selectedFilter === 'on', onClick: () => handleFilterClick('on') },
          { key: 'off', label: 'Off Market', icon: '🔴', active: selectedFilter === 'off', onClick: () => handleFilterClick('off') },
          { key: 'archived', label: 'Archived', icon: '📁', active: selectedFilter === 'archived', onClick: () => handleFilterClick('archived') },
          { key: 'matched', label: 'Matched', icon: '🤝', active: selectedFilter === 'matched', onClick: () => handleFilterClick('matched') },
          { key: 'sold', label: 'Sold', icon: '🎉', active: selectedFilter === 'sold', onClick: () => handleFilterClick('sold') },
        ]}
      />

      {/* Main content */}
      <div className="properties-content">
        {!selectedProperty ? (
          <>
            <div className="properties-header">
              <h2>Properties</h2>
              <button onClick={() => setIsAdding(true)}>+ Add Property</button>
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
                {filteredProperties.map(property => (
                  <tr key={property.id}>
                    <td onClick={() => handleRowClick(property)}>{property.name}</td>
                    <td onClick={() => handleRowClick(property)}>{property.brief}</td>
                    <td onClick={() => handleRowClick(property)}>{property.price}</td>
                    <td onClick={() => handleRowClick(property)}>{property.status}</td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleToggleArchive(property.id);
                        }}
                        className={property.archived ? "unarchive-button" : "archive-button"}
                      >
                        {property.archived ? "Restore" : "Archive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <PropertyPage property={selectedProperty} onBack={handleBackFromDetail} />
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