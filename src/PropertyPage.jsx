import React from "react";
import "./PropertyPage.css";

function PropertyPage({ property, onBack }) {
  if (!property) return null;

  return (
    <div className="property-page">
      <button className="back-button" onClick={onBack}>← Back</button>

      <h1>{property.name}</h1>
      {property.status === "Matched" && property.linkedClient && (
        <p><strong>Status:</strong> Matched to {property.linkedClient}</p>
      )}

      {property.status === "Sold" && property.linkedClient && (
        <p><strong>Status:</strong> Sold to {property.linkedClient}</p>
      )}

      {property.status !== "Matched" && property.status !== "Sold" && (
        <p><strong>Status:</strong> {property.status}</p>
      )}
      <p><strong>Address:</strong> {property.address || "—"}</p>

      <section className="property-section">
        <h3>Vendor (Agent)</h3>
        <p>{property.vendor || "—"}</p>
      </section>

      <section className="property-section">
        <h3>Owner Details</h3>
        <p>{property.ownerDetails || "—"}</p>
      </section>

      <section className="property-section">
        <h3>Property Bio</h3>
        <p>{property.bio || "—"}</p>
      </section>

      <section className="property-section">
        <h3>Property Specs</h3>
        <ul>
          <li><strong>Guide Price:</strong> {property.price || "—"}</li>
          <li><strong>Floor (sq ft):</strong> {property.floorSize || "—"}</li>
          <li><strong>Bedrooms:</strong> {property.bedrooms || "—"}</li>
          <li><strong>Bathrooms:</strong> {property.bathrooms || "—"}</li>
          <li><strong>Style:</strong> {property.style || "—"}</li>
          <li><strong>Receptions:</strong> {property.receptions || "—"}</li>
          <li><strong>Parking:</strong> {property.parking || "—"}</li>
          <li><strong>Land (acres):</strong> {property.land || "—"}</li>
        </ul>
        {property.propertyPhotos?.length > 0 && (
          <section className="property-section">
            <h3>Photos</h3>
            <div className="property-photos-grid">
              {property.propertyPhotos.map((file, idx) => {
                const imageURL = typeof file === "string" ? file : URL.createObjectURL(file);
                return (
                  <img
                    key={idx}
                    src={imageURL}
                    alt={`Property ${idx + 1}`}
                    className="property-photo-thumbnail"
                  />
                );
              })}
            </div>
          </section>
        )}
        {property.floorplan && (
          <section className="property-section">
            <h3>Floorplan</h3>
            <a
              href={URL.createObjectURL(property.floorplan)}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link"
            >
              View Floorplan
            </a>
          </section>
        )}

        {property.epc && (
          <section className="property-section">
            <h3>EPC</h3>
            <a
              href={URL.createObjectURL(property.epc)}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link"
            >
              View EPC
            </a>
          </section>
        )}
      </section>
    </div>
  );
}

export default PropertyPage;