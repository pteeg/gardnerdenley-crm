import React, { useEffect, useState } from "react";
import { subscribeToClients } from "./lib/clientsApi";
import "./App.css";
import gdLogo from "./assets/gd logo new.png";
import profilePic from "./assets/Me smiling.jpeg";
import Contacts from "./Contacts";
import PropertiesPage from "./PropertiesPage";
import SalesProgression from "./Sales Progression/SalesProgression";
import WongaReport from "./Wonga Report/WongaReport";
import { subscribeToProperties } from "./lib/propertiesApi";
import { subscribeToProfessionals } from "./lib/professionalsApi";
import { subscribeToSalesProgressions } from "./lib/salesProgressionsApi";
import { cleanupOldSalesProgressions } from "./lib/cleanupApi";

function App() {
  const [activeTab, setActiveTab] = useState("Contacts");
  const tabs = ["Contacts", "Properties", "Sales Progression", "Wonga Report"];

  // ✅ Properties state (Firestore-backed)
  const [properties, setProperties] = useState([]);
  const [showArchivedProperties, setShowArchivedProperties] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToProperties({ includeArchived: true }, setProperties);
    return () => unsubscribe();
  }, []);

  const handleArchiveProperty = async (propertyToArchive) => {
    if (propertyToArchive?.id) {
      const { toggleArchiveProperty } = await import("./lib/propertiesApi");
      await toggleArchiveProperty(propertyToArchive.id, true);
    }
  };

  const handleRestoreProperty = async (propertyToRestore) => {
    if (propertyToRestore?.id) {
      const { toggleArchiveProperty } = await import("./lib/propertiesApi");
      await toggleArchiveProperty(propertyToRestore.id, false);
    }
  };

  const toggleArchivedPropertiesView = () => {
    setShowArchivedProperties((prev) => !prev);
  };

  // ✅ Professionals state (Firestore-backed)
  const [professionals, setProfessionals] = useState([]);
  useEffect(() => {
    const unsubscribe = subscribeToProfessionals({ includeArchived: true }, setProfessionals);
    return () => unsubscribe();
  }, []);

  // ✅ Clients state (Firestore-backed)
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToClients({ includeArchived: true }, (list) => {
      setClients(list);
    });
    return () => unsubscribe();
  }, []);

  const updateClientInfo = async (clientName, updatedClientData) => {
    const client = clients.find(c => c.name === clientName);
    if (client?.id) {
      const { updateClientById } = await import("./lib/clientsApi");
      await updateClientById(client.id, updatedClientData);
    }
  };

  // ✅ Sales Progressions state (Firestore-backed)
  const [salesProgressions, setSalesProgressions] = useState([]);
  useEffect(() => {
    // Clean up any old invalid data on first load
    cleanupOldSalesProgressions();
    
    const unsubscribe = subscribeToSalesProgressions({ includeCompleted: true }, (data) => {
      console.log("Raw sales progressions data from Firestore:", data);
      // Filter out any old data that doesn't have proper Firestore IDs
      const validData = data.filter(item => {
        // Keep items that have a valid Firestore document ID (not "Not Done" or empty)
        const hasValidId = item.id && item.id !== "Not Done" && item.id !== "";
        console.log("Item:", item, "hasValidId:", hasValidId);
        return hasValidId;
      });
      console.log("Filtered sales progressions data:", validData);
      setSalesProgressions(validData);
    });
    return () => unsubscribe();
  }, []);

  const removeSalesProgressionRow = async (propertyName, clientName) => {
    const progression = salesProgressions.find(row => 
      row.address === propertyName && row.client === clientName
    );
    if (progression?.id) {
      const { deleteSalesProgressionById } = await import("./lib/salesProgressionsApi");
      await deleteSalesProgressionById(progression.id);
    }
  };

  const markPropertyAsMatched = async (propertyName) => {
    const property = properties.find(p => p.name === propertyName);
    if (property?.id) {
      const { updatePropertyById } = await import("./lib/propertiesApi");
      await updatePropertyById(property.id, { status: "Matched" });
    }
  };

  const handleCancelMatch = async (clientName, propertyName) => {
    const property = properties.find(p => p.name === propertyName);
    if (property?.id) {
      const { updatePropertyById } = await import("./lib/propertiesApi");
      await updatePropertyById(property.id, { 
        status: "On Market", 
        linkedClient: null,
        offerStatus: "None"
      });
    }
    await removeSalesProgressionRow(propertyName, clientName);
  };

  const createNewSalesProgression = async (clientName, propertyName) => {
    console.log("Creating new sales progression for:", clientName, propertyName);
    const { createSalesProgression } = await import("./lib/salesProgressionsApi");
    const progression = {
      client: clientName,
      address: propertyName,
      contractSent: "Not Done",
      contractSigned: "Not Done",
      clientIdDocument: "Not Done",
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
    };
    try {
      const docId = await createSalesProgression(progression);
      console.log("Sales progression created with ID:", docId);
    } catch (error) {
      console.error("Error creating sales progression:", error);
    }
  };

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
            updatePropertyLinkage={async (propertyName, clientName) => {
              const property = properties.find(p => p.name === propertyName);
              if (property?.id) {
                const { updatePropertyById } = await import("./lib/propertiesApi");
                await updatePropertyById(property.id, { linkedClient: clientName });
              }
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
          markPropertyAsSold={async (propertyName) => {
            const property = properties.find(p => p.name === propertyName);
            if (property?.id) {
              const { updatePropertyById } = await import("./lib/propertiesApi");
              await updatePropertyById(property.id, { status: "Sold" });
            }
          }}
          professionals={professionals}
          setProfessionals={setProfessionals}
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