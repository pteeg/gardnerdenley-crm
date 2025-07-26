import React from "react";
import "./ClientPage.css";

function ClientPage({ client, onBack }) {
  return (
    <div className="client-page">
      <div className="client-page-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Clients
        </button>
        <h1>{client.name}</h1>
      </div>

      <div className="client-details">
        <div className="detail-section">
          <h3>Contact Information</h3>
          <p><strong>Phone:</strong> {client.phoneNumber || "Not provided"}</p>
        </div>

        <div className="detail-section">
          <h3>Project Details</h3>
          <p><strong>Brief:</strong> {client.brief || "No brief provided"}</p>
          <p><strong>Max Budget:</strong> {client.maxBudget || "Not specified"}</p>
          <p><strong>Status:</strong> {client.status}</p>
        </div>
      </div>
    </div>
  );
}

export default ClientPage;