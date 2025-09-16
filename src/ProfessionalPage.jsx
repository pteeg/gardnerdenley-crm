import React from "react";
import "./ProfessionalPage.css";

function ProfessionalPage({ professional, onBack, properties = [], salesProgressions = [] }) {
  // Get properties represented by this professional
  const representedProperties = properties.filter(prop => prop.vendor === professional.name);
  
  // Separate active and completed properties
  const activeProperties = representedProperties.filter(prop => {
    const progression = salesProgressions.find(sp => sp.address === prop.name);
    return !progression?.dealComplete;
  });
  
  const completedProperties = representedProperties.filter(prop => {
    const progression = salesProgressions.find(sp => sp.address === prop.name);
    return progression?.dealComplete;
  });

  return (
    <div className="professional-page">
      <div className="professional-page-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Professionals
        </button>
        <h1>{professional.name}</h1>
      </div>
      
      <div className="professional-details">
        <div className="detail-section">
          <h3>Contact Information</h3>
          <p><strong>Company:</strong> {professional.company}</p>
          <p><strong>Phone:</strong> {professional.phoneNumber}</p>
          <p><strong>Email:</strong> {professional.email}</p>
          <p><strong>Type:</strong> {professional.type}</p>
        </div>

        <div className="detail-section">
          <h3>Active Properties Represented</h3>
          {activeProperties.length > 0 ? (
            <div className="properties-list">
              {activeProperties.map((property, index) => (
                <div key={index} className="property-item">
                  <strong>{property.name}</strong> - {property.address}
                  <br />
                  <span className="property-details">
                    Guide Price: {property.price ? `£${Number(property.price).toLocaleString()}` : 'Not set'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>No active properties currently being represented.</p>
          )}
        </div>

        <div className="detail-section">
          <h3>Historical Properties Represented</h3>
          {completedProperties.length > 0 ? (
            <div className="properties-list">
              {completedProperties.map((property, index) => (
                <div key={index} className="property-item historical">
                  <strong>{property.name}</strong> - {property.address}
                  <br />
                  <span className="property-details">
                    Guide Price: {property.price ? `£${Number(property.price).toLocaleString()}` : 'Not set'} • 
                    <span className="completed-badge"> Deal Completed</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>No completed properties yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfessionalPage;