import React from "react";
import "./WongaReport.css";
import Sidebar from "../Sidebar";

const WongaReport = ({ data }) => {
  // Filter for completed deals only
  const completedDeals = data.filter((row) => row.dealComplete);

  // Sort completed deals by payment expected date (soonest first)
  const sortedDeals = [...completedDeals].sort((a, b) => {
    const dateA = a.paymentExpected ? new Date(a.paymentExpected) : new Date(9999, 11, 31);
    const dateB = b.paymentExpected ? new Date(b.paymentExpected) : new Date(9999, 11, 31);
    return dateA - dateB;
  });

  return (
    <div className="wonga-report">
      <div className="wonga-body">
        <Sidebar
          title="Wonga Report"
          items={[
            { key: 'completed', label: 'Completed Deals', icon: '✅', active: true, onClick: () => {} },
          ]}
        />
        <div className="wonga-content">
          <h1>Wonga Report</h1>
          <table className="wonga-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Property Address</th>
            <th>Payment Expected</th>
            <th>Invoice Amount (£)</th>
          </tr>
        </thead>
        <tbody>
          {sortedDeals.length > 0 ? (
            sortedDeals.map((row, index) => (
              <tr key={index}>
                <td>{row.client}</td>
                <td>{row.address}</td>
                <td>{row.paymentExpected || "—"}</td>
                <td>
                  {row.invoiceAmount
                    ? `£${row.invoiceAmount.toLocaleString()}`
                    : "—"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", padding: "1rem" }}>
                No completed deals yet ya monkey
              </td>
            </tr>
          )}
        </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WongaReport;