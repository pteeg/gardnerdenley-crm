import React, { useState } from "react";
import "./PropertyPage.css";
import NewPropertyModal from "./NewPropertyModal";
import ComparablesSelectionModal from "./ComparablesSelectionModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import gdLogo from "../assets/gd-logo.jpeg";

function PropertyPage({ property, onBack, professionals = [], onUpdateProperty, onDeleteProperty, allProperties = [], onSelectProperty }) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [showComparablesModal, setShowComparablesModal] = useState(false);

  if (!property) return null;

  const formatOfferClientDisplay = () => {
    if (Array.isArray(property.linkedClients) && property.linkedClients.length > 0) {
      const c = property.linkedClients[0];
      if (typeof c === 'string') return c;
      const first1 = c?.spouse1FirstName || "";
      const first2 = c?.spouse2FirstName || "";
      const surname = c?.spouse1Surname || "";
      if (first1 && first2) {
        return [first1, "and", first2, surname].filter(Boolean).join(" ");
      }
      return [first1, surname].filter(Boolean).join(" ");
    }
    return "Client";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Matched": return "#28a745";
      case "Sold": return "#6c757d";
      case "On Market": return "#007bff";
      case "Off Market": return "#ffc107";
      case "N/A": return "#6c757d";
      default: return "#6c757d";
    }
  };

  const formatPrice = (price) => {
    if (!price || price === "") return "—";
    // Handle both string and number prices
    const numericPrice = typeof price === 'string' ? price.replace(/[^0-9]/g, '') : price;
    if (!numericPrice || numericPrice === '0') return "—";
    return `£${Number(numericPrice).toLocaleString()}`;
  };

  const formatClientName = (clientData) => {
    if (!clientData) return "—";
    // If string, it's already formatted elsewhere
    if (typeof clientData === 'string') return clientData;
    // Always prefer first names only
    if (clientData.spouse1FirstName) {
      if (clientData.spouse2FirstName) {
        return `${clientData.spouse1FirstName} and ${clientData.spouse2FirstName}`;
      }
      return clientData.spouse1FirstName;
    }
    return clientData.name || clientData.firstName || "Unknown Client";
  };


  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async (updatedData) => {
    if (onUpdateProperty) {
      await onUpdateProperty(property.id, updatedData);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      if (onDeleteProperty) {
        await onDeleteProperty(property.id);
        onBack(); // Navigate back to properties list after deletion
      }
    }
  };

  const handleAddComparables = async (selectedProperties) => {
    // Store only IDs for comparables - we'll fetch latest data when displaying
    // This replaces the entire comparables array with the selected ones (for editing)
    const comparables = selectedProperties.map(p => ({
      id: p.id || null
    })).filter(c => c.id !== null);
    
    if (onUpdateProperty) {
      await onUpdateProperty(property.id, { comparables });
    }
  };

  // Get the latest property data for a comparable (or fallback to stored data)
  const getComparableData = (comparable) => {
    if (!comparable || !comparable.id) return comparable;
    
    // Try to find the latest property data
    const latestProperty = allProperties.find(p => p.id === comparable.id);
    if (latestProperty) {
      return {
        id: latestProperty.id,
        name: latestProperty.name,
        price: latestProperty.price,
        floorSize: latestProperty.floorSize,
        bedrooms: latestProperty.bedrooms,
        bathrooms: latestProperty.bathrooms,
        address: latestProperty.address
      };
    }
    
    // Fallback to stored comparable data (for backwards compatibility)
    return comparable;
  };

  const handleRemoveComparable = async (comparableId) => {
    const updatedComparables = (property.comparables || []).filter(c => c.id !== comparableId);
    if (onUpdateProperty) {
      await onUpdateProperty(property.id, { comparables: updatedComparables });
    }
  };

  const handleExportPDF = async () => {
    const comparables = property.comparables || [];
    if (comparables.length === 0) {
      alert("No comparables to export");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Add logo at top left
      try {
        // Load image and convert to base64
        const response = await fetch(gdLogo);
        const blob = await response.blob();
        
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            try {
              const dataURL = reader.result;
              
              // Create image to get dimensions
              const img = new Image();
              img.onload = () => {
                // Add logo to PDF (resize to fit - height 34mm, 1.7x the original size)
                const logoHeight = 34;
                const logoWidth = (img.width / img.height) * logoHeight;
                doc.addImage(dataURL, 'JPEG', 14, 10, logoWidth, logoHeight);
                resolve();
              };
              img.onerror = reject;
              img.src = dataURL;
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (logoError) {
        console.warn("Could not add logo to PDF:", logoError);
        // Continue without logo if it fails
      }
      
      // Title (positioned below the logo to avoid overlap)
      doc.setFontSize(18);
      doc.text(`Comparables for ${property.name}`, 14, 47);
      
      // Property details below the title
      let yPos = 54;
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      doc.text(`Guide Price: ${formatPrice(property.price)}`, 14, yPos);
      yPos += 6;
      doc.text(`Floor Size: ${property.floorSize ? `${property.floorSize} sq ft` : "—"}`, 14, yPos);
      
      // Calculate average
      const avgPricePerSqFt = calculateAveragePricePerSqFt();
      
      // Position average just above the table
      yPos += 10;
      
      // Add average in bold, just above the table
      if (avgPricePerSqFt !== null) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(51, 51, 51);
        doc.text(`Average £/sqF: £${avgPricePerSqFt.toLocaleString()}`, 14, yPos);
        doc.setFont(undefined, 'normal'); // Reset font
        yPos += 8;
      }
      
      // Table data - only comparables (not the property itself)
      const tableData = comparables.map(c => {
        const comparableData = getComparableData(c);
        return [
          comparableData?.name || "—",
          formatPrice(comparableData?.price),
          comparableData?.floorSize ? `${comparableData.floorSize} sq ft` : "—",
          String(comparableData?.bedrooms || "—"),
          String(comparableData?.bathrooms || "—"),
          calculatePricePerSqFt(comparableData?.price, comparableData?.floorSize)
        ];
      });

      // Add table
      autoTable(doc, {
        startY: yPos,
        head: [['Name', 'Guide Price', 'Floor Size', 'Bedrooms', 'Bathrooms', '£/sqF']],
        body: tableData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [85, 85, 85] },
        margin: { top: yPos }
      });

      // Save PDF
      doc.save(`Comparables_${property.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  const calculatePricePerSqFt = (price, floorSize) => {
    if (!price || !floorSize) return "—";
    const numericPrice = typeof price === 'string' ? price.replace(/[^0-9]/g, '') : price;
    const numericFloorSize = parseFloat(floorSize);
    if (!numericPrice || !numericFloorSize || numericFloorSize === 0) return "—";
    const pricePerSqFt = Number(numericPrice) / numericFloorSize;
    return `£${Math.round(pricePerSqFt).toLocaleString()}`;
  };

  const calculatePricePerSqFtNumber = (price, floorSize) => {
    if (!price || !floorSize) return null;
    const numericPrice = typeof price === 'string' ? price.replace(/[^0-9]/g, '') : price;
    const numericFloorSize = parseFloat(floorSize);
    if (!numericPrice || !numericFloorSize || numericFloorSize === 0) return null;
    return Number(numericPrice) / numericFloorSize;
  };

  const calculateAveragePricePerSqFt = () => {
    if (!property.comparables || property.comparables.length === 0) return null;
    
    const validPrices = property.comparables
      .map(c => {
        const comparableData = getComparableData(c);
        return calculatePricePerSqFtNumber(comparableData?.price, comparableData?.floorSize);
      })
      .filter(price => price !== null);
    
    if (validPrices.length === 0) return null;
    
    const sum = validPrices.reduce((acc, price) => acc + price, 0);
    return Math.round(sum / validPrices.length);
  };

  return (
    <div className="property-page">
      {/* Header Section */}
      <div className="property-header">
        <div className="property-title-section">
          <button className="back-btn" onClick={onBack} type="button" style={{ marginBottom: '8px' }}>
            <i className="fa-solid fa-arrow-left" style={{ color: '#555555', fontSize: '1.4rem' }} />
          </button>
          <h1 className="property-title">{property.name}</h1>
          <div className="property-status">
            <span className="status-badge">
              Market Status: {property.status}
            </span>
            {property.linkedClients && property.linkedClients.length > 0 && (
              <div className="linked-clients">
                {property.status === "Matched" ? "Matched to" : 
                 property.status === "Sold" ? "Acquired by" : 
                 "Linked to"} {property.linkedClients.map((client, index) => (
                  <button
                    key={index}
                    type="button"
                    className="linked-client clickable"
                    onClick={() => {
                      const name = typeof client === 'string' ? client : (client && client.name) ? client.name : null;
                      if (name) {
                        window.dispatchEvent(new CustomEvent('openClientByName', { detail: { name } }));
                      }
                    }}
                  >
                    {formatClientName(client)}
                    {index < property.linkedClients.length - 1 && ", "}
                  </button>
                ))}
              </div>
            )}
            {/* Fallback for old single linkedClient field */}
            {(!property.linkedClients || property.linkedClients.length === 0) && property.linkedClient && (
              <button
                type="button"
                className="linked-client clickable"
                onClick={() => {
                  const name = typeof property.linkedClient === 'string' ? property.linkedClient : (property.linkedClient && property.linkedClient.name) ? property.linkedClient.name : null;
                  if (name) {
                    window.dispatchEvent(new CustomEvent('openClientByName', { detail: { name } }));
                  }
                }}
              >
                {property.status === "Matched" ? "Matched to" : 
                 property.status === "Sold" ? "Acquired by" : 
                 "Linked to"} {formatClientName(property.linkedClient)}
              </button>
            )}
          </div>
          <div className="property-price">
            <span className="price-label">Guide Price</span>
            <span className="price-value">{formatPrice(property.price)}</span>
          </div>
        </div>
        
        <div className="header-actions">
          <div className="action-buttons">
            <button className="edit-button" onClick={handleEdit}>
              Edit
            </button>
            <button className="delete-button" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="property-tabs">
        <button
          className={`property-tab ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
          type="button"
        >
          Details
        </button>
        <button
          className={`property-tab ${activeTab === "comparables" ? "active" : ""}`}
          onClick={() => setActiveTab("comparables")}
          type="button"
        >
          Comparables
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="property-content">
          {/* Left Column */}
          <div className="property-main">
            {/* Property Details Card */}
            <div className="property-card">
              <h2 className="card-title">Property Details</h2>
              <div className="property-address">
                <span className="address-icon">📍</span>
                <span>{property.address || "Address not provided"}</span>
              </div>
              
              <div className="specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Bedrooms</span>
                  <span className="spec-value">{property.bedrooms || "—"}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Bathrooms</span>
                  <span className="spec-value">{property.bathrooms || "—"}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Receptions</span>
                  <span className="spec-value">{property.receptions || "—"}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Floor Size</span>
                  <span className="spec-value">{property.floorSize ? `${property.floorSize} sq ft` : "—"}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Style</span>
                  <span className="spec-value">{property.style || "—"}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Parking</span>
                  <span className="spec-value">{property.parking || "—"}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Land</span>
                  <span className="spec-value">{property.land ? `${property.land} acres` : "—"}</span>
                </div>
              </div>
              
              {/* Description - Full Width */}
              {property.description && (
                <div className="property-description">
                  <h3 className="description-title">Description</h3>
                  <p className="description-text">{property.description}</p>
                </div>
              )}
            </div>

            {/* Offers Logged Card */}
            <div className="property-card">
              <h2 className="card-title">Offers Logged</h2>
              {Array.isArray(property.offers) && property.offers.length > 0 ? (
                <div className="offers-logged-list">
                  {property.offers.map((o, idx) => (
                    <div key={idx} className="offer-entry">
                      <span>
                        {o && o.amount !== undefined && o.amount !== null && o.amount !== ""
                          ? `${formatOfferClientDisplay()} ${new Date(o.date).toLocaleDateString()}: £${Number(o.amount).toLocaleString()}${o.status ? ` (${o.status})` : ''}`
                          : `${formatOfferClientDisplay()} ${new Date(o.date).toLocaleDateString()}: ${o?.status || 'Event'}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-offers">No offers logged</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="property-sidebar">
            {/* Vendor Card */}
            <div className="property-card">
              <h3 className="card-title">Vendor (Agent)</h3>
              <p className="vendor-info">{property.vendor || "Not specified"}</p>
            </div>

            {/* Owner Details Card */}
            <div className="property-card">
              <h3 className="card-title">Owner Details</h3>
              <p className="owner-info">{property.ownerDetails || "Not specified"}</p>
            </div>

            {/* Documents Card */}
            <div className="property-card">
              <h3 className="card-title">Documents</h3>
              <div className="documents-list">
                {property.floorplan && (
                  <a
                    href={typeof property.floorplan === 'string' ? property.floorplan : URL.createObjectURL(property.floorplan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    <span className="document-icon">📐</span>
                    View Floorplan
                  </a>
                )}
                {property.epc && (
                  <a
                    href={typeof property.epc === 'string' ? property.epc : URL.createObjectURL(property.epc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-link"
                  >
                    <span className="document-icon">📊</span>
                    View EPC
                  </a>
                )}
                {!property.floorplan && !property.epc && (
                  <p className="no-documents">No documents available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "comparables" && (
        <div className="property-content comparables-content">
          <div className="property-card comparables-card">
            <div className="comparables-header">
              <h2 className="card-title">Comparables</h2>
              <div className="comparables-actions">
                <button
                  className="create-comparable-btn"
                  onClick={() => setShowComparablesModal(true)}
                  type="button"
                >
                  {property.comparables && property.comparables.length > 0 ? "Edit Comparable" : "Create Comparable"}
                </button>
                {(property.comparables && property.comparables.length > 0) && (
                  <button
                    className="export-pdf-btn"
                    onClick={handleExportPDF}
                    type="button"
                  >
                    Export PDF
                  </button>
                )}
              </div>
            </div>

            {property.comparables && property.comparables.length > 0 ? (
              <>
                {(() => {
                  const avgPricePerSqFt = calculateAveragePricePerSqFt();
                  return avgPricePerSqFt !== null ? (
                    <div className="comparables-average">
                      <span className="average-label">Average £/sqF:</span>
                      <span className="average-value">£{avgPricePerSqFt.toLocaleString()}</span>
                    </div>
                  ) : null;
                })()}
                <div className="comparables-table-wrapper">
                  <table className="comparables-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Guide Price</th>
                      <th>Floor Size</th>
                      <th>Bedrooms</th>
                      <th>Bathrooms</th>
                      <th>£/sqF</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {property.comparables.map((comparable) => {
                      const comparableData = getComparableData(comparable);
                      const comparableId = comparable.id || comparableData?.id;
                      const handleRowClick = () => {
                        if (comparableId && onSelectProperty) {
                          const targetProperty = allProperties.find(p => p.id === comparableId);
                          if (targetProperty) {
                            onSelectProperty(targetProperty);
                          }
                        }
                      };
                      return (
                        <tr 
                          key={comparableId}
                          onClick={handleRowClick}
                          className="comparable-row-clickable"
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{comparableData?.name || "—"}</td>
                          <td>{formatPrice(comparableData?.price)}</td>
                          <td>{comparableData?.floorSize ? `${comparableData.floorSize} sq ft` : "—"}</td>
                          <td>{comparableData?.bedrooms || "—"}</td>
                          <td>{comparableData?.bathrooms || "—"}</td>
                          <td>{calculatePricePerSqFt(comparableData?.price, comparableData?.floorSize)}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              className="remove-comparable-btn"
                              onClick={() => handleRemoveComparable(comparableId)}
                              type="button"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <p className="no-comparables">No comparables added yet. Click "Create Comparable" to add properties.</p>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <NewPropertyModal
          onClose={handleCancelEdit}
          onSave={handleSaveEdit}
          professionals={professionals}
          initialData={property}
          isEdit={true}
        />
      )}

      {/* Comparables Selection Modal */}
      {showComparablesModal && (
        <ComparablesSelectionModal
          properties={allProperties}
          onClose={() => setShowComparablesModal(false)}
          onDone={handleAddComparables}
          excludePropertyId={property.id}
          existingComparableIds={(property.comparables || []).map(c => c.id)}
        />
      )}
    </div>
  );
}

export default PropertyPage;