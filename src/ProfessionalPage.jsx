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
          <p><strong>Type:</strong> {professional.type}</p>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalPage;