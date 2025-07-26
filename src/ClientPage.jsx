import React from "react";
import "./ClientPage.css";

function ClientPage({ client, onBack }) {
  return (
    <div className="client-page">
      <button className="back-btn" onClick={onBack}>
        ← Back to Clients
      </button>

      <h2 className="client-name">{client.name}</h2>

      <div className="client-sections">
        {/* Left column */}
        <div className="client-info">
          <div className="client-box">
            <h3>Contact Info</h3>
            <p><strong>Phone:</strong> {client.phoneNumber || "N/A"}</p>
            <p><strong>Email:</strong> example@email.com</p>
            <p><strong>Partner:</strong> None</p>
          </div>

          <div className="client-box">
            <h3>Requirements</h3>
            <p><strong>Max Budget:</strong> {client.maxBudget || "N/A"}</p>
            <p><strong>Area:</strong> {client.brief || "N/A"}</p>
            <p><strong>Bedrooms:</strong> 3–5 (example)</p>
            <p><strong>Notes:</strong> Likes quiet roads</p>
          </div>
        </div>

        {/* Right column */}
        <div className="client-side">
          <div className="client-box">
            <h3>Documents</h3>
            <ul>
              <li>Proof of ID – Uploaded 10/07/25</li>
              <li>Proof of Address – Pending</li>
            </ul>
          </div>

          <div className="client-box">
            <h3>Activity</h3>
            <ul className="activity-list">
              <li>📌 Feedback given on 12 Latham Road – 10/07/25</li>
              <li>📌 Viewing booked for 3 Chaucer Road – 08/07/25</li>
              <li>📌 Initial enquiry received – 01/07/25</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ✅ NEW Suggested Properties section */}
      <div className="client-box suggested-properties">
        <h3>Suggested Properties</h3>
        <ul className="suggested-list">
          <li>🏡 12 Latham Road – £9,500,000</li>
          <li>🏡 3 Chaucer Road – £7,200,000</li>
          <li>🏡 18 De Freville Avenue – £6,800,000</li>
        </ul>
      </div>
    </div>
  );
}

export default ClientPage;