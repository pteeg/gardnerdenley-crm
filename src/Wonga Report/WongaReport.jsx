import React, { useState } from "react";
import "./WongaReport.css";
import Sidebar from "../Sidebar";
import WongaChart from "./WongaChart";

// Helper function to find a client by matching various name formats
function findClientByName(clientName, clients = []) {
  if (!clientName || !clients.length) return null;
  
  return clients.find(c => {
    // Direct match with client.name
    if (c.name === clientName) return true;
    
    // Check formatted names
    if (c.spouse1FirstName && c.spouse2FirstName) {
      const bothFirstNames = `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
      if (clientName === bothFirstNames || 
          (c.spouse1Surname && clientName === `${bothFirstNames} ${c.spouse1Surname}`)) {
        return true;
      }
    }
    if (c.spouse1FirstName) {
      const singleName = c.spouse1Surname 
        ? `${c.spouse1FirstName} ${c.spouse1Surname}` 
        : c.spouse1FirstName;
      if (clientName === singleName) return true;
    }
    return false;
  });
}

// Helper function to format client names
function formatClientName(clientName, clients = []) {
  const client = findClientByName(clientName, clients);
  
  if (client && client.spouse1FirstName) {
    if (client.spouse2FirstName) {
      return client.spouse1Surname
        ? `${client.spouse1FirstName} and ${client.spouse2FirstName} ${client.spouse1Surname}`
        : `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
    }
    return client.spouse1Surname ? `${client.spouse1FirstName} ${client.spouse1Surname}` : client.spouse1FirstName;
  }
  // Fallback to original client name
  return clientName || "Unknown";
}

// Format a stored ISO date (yyyy-mm-dd) to dd-mm-yyyy for display
function formatDateDMY(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const WongaReport = ({ data, clients = [], properties = [] }) => {
  // Filter for completed deals only
  const completedDeals = data.filter((row) => row.dealComplete);

  // Sort completed deals by payment expected date (soonest first)
  const sortedDeals = [...completedDeals].sort((a, b) => {
    const dateA = a.paymentExpected ? new Date(a.paymentExpected) : new Date(9999, 11, 31);
    const dateB = b.paymentExpected ? new Date(b.paymentExpected) : new Date(9999, 11, 31);
    return dateA - dateB;
  });

  const toggleInvoicePaid = async (row) => {
    try {
      if (!row?.id) return;
      const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
      const next = row.invoicePaid === "Done" ? "Not Done" : "Done";
      const payload = { invoicePaid: next, dealComplete: next === "Done" };
      await updateSalesProgressionById(row.id, payload);
    } catch (e) {
      console.error("Failed to toggle invoicePaid from WongaReport:", e);
    }
  };

  // FY state (controls graph, table, and tiles)
  const today = new Date();
  const initialFY = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;
  const [fyStartYear, setFyStartYear] = React.useState(initialFY);

  const from = new Date(fyStartYear, 3, 1);
  const to = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
  const inFY = (dStr) => {
    if (!dStr) return false;
    const d = new Date(dStr);
    return d >= from && d <= to;
  };

  const filteredForFY = data.filter(row => {
    const dateStr = row.paymentExpected || row.completionDateSet || row.targetCompletionDate;
    return dateStr && inFY(dateStr);
  });
  // Table scope: 'fy' uses FY filter, 'full' shows all completed deals
  const [tableScope, setTableScope] = React.useState('fy');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const tableRows = tableScope === 'full' ? sortedDeals : filteredForFY;

  return (
    <div className="wonga-report">
      <div className="wonga-body">
        <Sidebar
          title="Wonga"
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          items={[
            { key: 'fy', label: 'By Financial Year', active: tableScope === 'fy', onClick: () => setTableScope('fy') },
            { key: 'full', label: 'Full Table', active: tableScope === 'full', onClick: () => setTableScope('full') },
          ]}
        />
        <div className="wonga-content">
          {/* FY controls visible only in FY view */}
          {tableScope === 'fy' && (
            <div className="wonga-fy-controls">
              <div className="wonga-fy-left">
                <button className="wonga-fy-btn" onClick={() => setFyStartYear(y => y - 1)}>← Previous Year</button>
              </div>
              <h3 className="wonga-fy-title">Financial Year {fyStartYear}/{fyStartYear + 1}</h3>
              <div className="wonga-fy-right">
                <button className="wonga-fy-btn" onClick={() => setFyStartYear(y => y + 1)}>Next Year →</button>
              </div>
            </div>
          )}

          {/* Tiles: FY totals in FY view, Overall totals in Full Table view */}
          <div className="wonga-tiles">
            {tableScope === 'fy' ? (
              (() => {
                const netRevenue = filteredForFY.reduce((sum, row) => sum + (Number(row.invoiceAmount) || 0), 0);
                const grossRevenue = Math.round(netRevenue * 1.2);
                return (
                  <>
                    <div className="wonga-tile">
                      <div className="wonga-tile-title">Net Revenue ({fyStartYear}/{fyStartYear + 1})</div>
                      <div className="wonga-tile-value">£{netRevenue.toLocaleString()}</div>
                    </div>
                    <div className="wonga-tile">
                      <div className="wonga-tile-title">Gross Revenue incl. VAT ({fyStartYear}/{fyStartYear + 1})</div>
                      <div className="wonga-tile-value">£{grossRevenue.toLocaleString()}</div>
                    </div>
                  </>
                );
              })()
            ) : (
              (() => {
                const netRevenue = sortedDeals.reduce((sum, row) => sum + (Number(row.invoiceAmount) || 0), 0);
                const grossRevenue = Math.round(netRevenue * 1.2);
                return (
                  <>
                    <div className="wonga-tile">
                      <div className="wonga-tile-title">Total Net Revenue</div>
                      <div className="wonga-tile-value">£{netRevenue.toLocaleString()}</div>
                    </div>
                    <div className="wonga-tile">
                      <div className="wonga-tile-title">Total Gross Revenue incl. VAT</div>
                      <div className="wonga-tile-value">£{grossRevenue.toLocaleString()}</div>
                    </div>
                  </>
                );
              })()
            )}
          </div>

          {/* Graph only in FY view */}
          {tableScope === 'fy' && (
            <div className="graph-container">
              <WongaChart salesProgressions={data} startYear={fyStartYear} />
            </div>
          )}
          
          {/* Table container - 40% of remaining space */}
          <div className="floating-table-container">
            <div className="table-container">
            <div className="table-scroll">
              <table className="wonga-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Client Source</th>
                    <th>Value</th>
                    <th>Fee %</th>
                    <th>Net GD Fee £</th>
                    <th className="forecast-col">Forecast Completion</th>
                    <th>Paid?</th>
                    <th>Disposal</th>
                    <th>Property</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length > 0 ? (
                    tableRows.map((row, index) => {
                      // Find the client data to get additional information
                      const client = findClientByName(row.client, clients);
                      
                      // Use the Invoice Amount from sales progression as the Net GD Fee
                      const netFee = Number(row.invoiceAmount) || 0;
                      
                      // Accepted offer amount from linked property (fallback to any stored value on the row)
                      const linkedProperty = properties.find(p => p.name === row.address);
                      const acceptedOffer = linkedProperty && linkedProperty.offerStatus === "Accepted"
                        ? Number(linkedProperty.offerAmount) || 0
                        : Number(linkedProperty?.offerAmount) || 0; // show offerAmount even if not marked Accepted
                      const propertyValue = acceptedOffer || (Number(row.propertyValue) || 0);
                      // Prefer explicit fee percent stored on the progression; otherwise fallback to invoice/value calc
                      const feePercentage = (row.feePercent !== undefined && row.feePercent !== "")
                        ? Number(row.feePercent).toFixed(1)
                        : (propertyValue > 0 && netFee > 0)
                          ? ((netFee / propertyValue) * 100).toFixed(1)
                          : null;
                      
                      return (
                        <tr key={index}>
                          <td>{formatClientName(row.client, clients)}</td>
                          <td>{client?.clientSource || "—"}</td>
                          <td>{propertyValue ? `£${propertyValue.toLocaleString()}` : "—"}</td>
                          <td>{feePercentage !== null ? `${feePercentage}%` : "—"}</td>
                          <td>{netFee ? `£${netFee.toLocaleString()}` : "—"}</td>
                          <td className="forecast-col">
                            {(() => {
                              const primary = row.completionDateSet || row.targetCompletionDate;
                              const payment = row.paymentExpected;
                              const primaryFmt = formatDateDMY(primary);
                              const paymentFmt = formatDateDMY(payment);
                              if (!primaryFmt && !paymentFmt) return "—";
                              if (primaryFmt && paymentFmt && primary !== payment) {
                                return `${primaryFmt} (Expected ${paymentFmt})`;
                              }
                              return primaryFmt || paymentFmt || "—";
                            })()}
                          </td>
                          <td>
                            <button
                              onClick={() => toggleInvoicePaid(row)}
                              className={row.invoicePaid === "Done" ? "paid-btn" : "pending-btn"}
                              style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: 4,
                                border: "1px solid #aaa",
                                cursor: "pointer",
                                background: row.invoicePaid === "Done" ? "#d4edda" : "#fff",
                                color: row.invoicePaid === "Done" ? "#155724" : "#333"
                              }}
                            >
                              {row.invoicePaid === "Done" ? "Paid" : "Pending"}
                            </button>
                          </td>
                          <td>{client?.disposal || "—"}</td>
                          <td>{row.address}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-row">
                        No completed deals found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WongaReport;