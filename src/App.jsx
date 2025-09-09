import React, { useState } from "react";
import "./App.css";
import gdLogo from "./assets/gd logo new.png";
import profilePic from "./assets/Me smiling.jpeg";
import Contacts from "./Contacts";
import PropertiesPage from "./PropertiesPage";
import SalesProgression from "./Sales Progression/SalesProgression";
import WongaReport from "./Wonga Report/WongaReport";

function App() {
  const [activeTab, setActiveTab] = useState("Contacts");
  const tabs = ["Contacts", "Properties", "Sales Progression", "Wonga Report"];

  // ✅ Properties state
  const [properties, setProperties] = useState([
    {
      name: "12 Latham Road",
      brief: "5-bed detached, large garden",
      price: "£2,500,000",
      status: "On Market",
      archived: false
    },
    {
      name: "24 Chaucer Road",
      brief: "4-bed semi-detached, needs renovation",
      price: "£1,200,000",
      status: "On Market",
      archived: false
    }
  ]);

  const [showArchivedProperties, setShowArchivedProperties] = useState(false);

  const handleArchiveProperty = (propertyToArchive) => {
    setProperties(
      properties.map((p) =>
        p.name === propertyToArchive.name ? { ...p, archived: true } : p
      )
    );
  };

  const handleRestoreProperty = (propertyToRestore) => {
    setProperties(
      properties.map((p) =>
        p.name === propertyToRestore.name ? { ...p, archived: false } : p
      )
    );
  };

  const toggleArchivedPropertiesView = () => {
    setShowArchivedProperties((prev) => !prev);
  };

  // ✅ Professionals state
  const [professionals, setProfessionals] = useState([
    // Temporary local seed data
    {
      id: "1",
      name: "John Smith",
      company: "Smith & Co.",
      type: "Solicitor",
      archived: false
    },
    {
      id: "2",
      name: "Mary Jones",
      company: "Jones Surveyors",
      type: "Surveyor",
      archived: false
    },
    {
      id: "3",
      name: "Mark Taylor",
      company: "Taylor Mortgages",
      type: "MortgageAdvisor",
      archived: false
    }
  ]);

  // ✅ Clients state
  const [clients, setClients] = useState([]);

  const updateClientInfo = (clientName, updatedClientData) => {
    setClients(prevClients =>
      prevClients.map(client =>
        client.name === clientName ? { ...client, ...updatedClientData } : client
      )
    );
  };

  // ✅ Dummy sales progression data here
  const [salesProgressions, setSalesProgressions] = useState([
    {
      client: "Alex Johnson",
      address: "13 Latham Road",
      contractSent: "Not Done",
      contractSigned: "Not Done",
      id: "Not Done",
      aml: "Not Done",
      solicitorRecommended: "Not Done",
      solicitorEngaged: "Not Done",
      solicitorDetails: "",
      mortgageAdvisorRecommended: "Not Done",
      mortgageAdvisorDetails: "",
      mortgageValBooked: "Not Done",
      surveyorRecommended: "Not Done",
      surveyorDetails: "",
      surveyBooked: "Not Done",
      sdltAdvisorRecommended: "Not Done",
      targetExchangeDate: "",
      targetCompletionDate: "",
      removalsRecommended: "Not Done",
      removalsBooked: "Not Done",
      exchangeDateSet: "Not Done",
      completionDateSet: "Not Done",
      exchanged: "Not Done",
      invoiceSent: "Not Done",
      invoicePaid: "Not Done",
      paymentExpected: "",
      invoiceAmount: ""
    }
  ]);

  const removeSalesProgressionRow = (propertyName, clientName) => {
    setSalesProgressions(prev =>
      prev.filter((row) => row.address !== propertyName || row.client !== clientName)
    );
  };

  const markPropertyAsMatched = (propertyName) => {
    setProperties(prev =>
      prev.map(p =>
        p.name === propertyName ? { ...p, status: "Matched" } : p
      )
    );
  };

  const handleCancelMatch = (clientName, propertyName) => {
    setProperties(prev =>
      prev.map(p =>
        p.name === propertyName ? { ...p, status: "On Market", linkedClient: null } : p
      )
    );
    removeSalesProgressionRow(propertyName, clientName);
  };

  const createNewSalesProgression = (clientName, propertyName) => ({
    client: clientName,
    address: propertyName,
    contractSent: "Not Done",
    contractSigned: "Not Done",
    id: "Not Done",
    aml: "Not Done",
    solicitorRecommended: "Not Done",
    solicitorEngaged: "Not Done",
    solicitorDetails: "",
    mortgageAdvisorRecommended: "Not Done",
    mortgageAdvisorDetails: "",
    mortgageValBooked: "Not Done",
    surveyorRecommended: "Not Done",
    surveyorDetails: "",
    surveyBooked: "Not Done",
    sdltAdvisorRecommended: "Not Done",
    targetExchangeDate: "",
    targetCompletionDate: "",
    removalsRecommended: "Not Done",
    removalsBooked: "Not Done",
    exchangeDateSet: "",
    completionDateSet: "",
    exchanged: "Not Done",
    invoiceSent: "Not Done",
    invoicePaid: "Not Done",
    paymentExpected: "",
    invoiceAmount: "",
    dealComplete: false
  });

  return (
    <div>
      {/* ✅ Header */}
      <div className="header">
        <img src={gdLogo} alt="Logo" className="logo" />
        <div className="nav-pills">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`nav-button ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="profile-pill">
          <img src={profilePic} alt="Profile" className="profile-pic" />
          <div className="profile-details">
            <div className="profile-name">Toby Gardner</div>
            <div className="profile-email">gardner.b.toby@gmail.com</div>
          </div>
        </div>
      </div>

      {/* ✅ Page Content */}
      <div style={{ padding: "2rem 2rem 2rem 0" }}>
        {activeTab === "Contacts" && (
          <Contacts
            clients={clients}
            setClients={setClients}
            professionals={professionals}
            setProfessionals={setProfessionals}
            properties={properties}
            setProperties={setProperties}
            allProperties={properties}
            updatePropertyLinkage={(propertyName, clientName) => {
              setProperties(prev =>
                prev.map(p =>
                  p.name === propertyName
                    ? { ...p, linkedClient: clientName }
                    : p
                )
              );
            }}
            setSalesProgressions={setSalesProgressions}
            removeSalesProgressionRow={removeSalesProgressionRow}
            markPropertyAsMatched={markPropertyAsMatched}
            handleCancelMatch={handleCancelMatch}
            updateClientInfo={updateClientInfo}
            createNewSalesProgression={createNewSalesProgression}
          />
        )}

        {activeTab === "Properties" && (
          <PropertiesPage
            properties={properties.filter(
              (p) => p.archived === showArchivedProperties
            )}
            onArchiveProperty={handleArchiveProperty}
            onRestoreProperty={handleRestoreProperty}
            onToggleView={toggleArchivedPropertiesView}
            showArchived={showArchivedProperties}
            professionals={professionals}
          />
        )}

        {activeTab === "Sales Progression" && (
        <SalesProgression
          data={salesProgressions}
          setData={setSalesProgressions}
          markPropertyAsSold={(propertyName) => {
            setProperties(prev =>
              prev.map(p =>
                p.name === propertyName ? { ...p, status: "Sold" } : p
              )
            );
          }}
          professionals={professionals}                 // ⬅ NEW
          setProfessionals={setProfessionals}           // ⬅ NEW
        />
        )}

        {activeTab === "Wonga Report" && (
          <WongaReport data={salesProgressions} />
        )}
      </div>
    </div>
  );
}

export default App;