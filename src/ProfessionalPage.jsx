import React from "react";
import "./ProfessionalPage.css";

function ProfessionalPage({ professional, onBack }) {
  return (
    <div className="professional-page">
      <button className="back-btn" onClick={onBack}>
        ← Back to Professionals
      </button>

      <h1 className="professional-name">{professional.name}</h1>
      <p className="professional-info">
        <strong>Speciality:</strong> {professional.speciality || "—"}
      </p>
      <p className="professional-info">
        <strong>Phone:</strong> {professional.phoneNumber || "—"}
      </p>
      <p className="professional-info">
        <strong>Email:</strong> {professional.email || "—"}
      </p>

      {/* Currently Engaged Clients */}
      <div className="professional-section">
        <h2>Currently Engaged Clients</h2>
        <ul className="professional-list">
          <li>Joe Bloggs – Viewing Stage</li>
          <li>Ricky Gervais – Offer Accepted</li>
        </ul>
      </div>

      {/* Client History */}
      <div className="professional-section">
        <h2>Client History</h2>
        <ul className="professional-list">
          <li>Steven Gerrard – Completed (12/05/25)</li>
          <li>Fernando Torres – Completed (03/02/25)</li>
        </ul>
      </div>
    </div>
  );
}

export default ProfessionalPage;