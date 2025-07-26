
import React from "react";
import "./ProfessionalPage.css";

function ProfessionalPage({ professional, onBack }) {
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
        </div>
        
        <div className="detail-section">
          <h3>Client Information</h3>
          <p><strong>Current Client:</strong> {professional.currentClient || "None"}</p>
          <div>
            <strong>Client History:</strong>
            {professional.clientHistory && professional.clientHistory.length > 0 ? (
              <ul>
                {professional.clientHistory.map((client, index) => (
                  <li key={index}>{client}</li>
                ))}
              </ul>
            ) : (
              <p>No previous clients</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalPage;
