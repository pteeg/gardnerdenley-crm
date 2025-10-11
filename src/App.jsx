import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { subscribeToClients } from "./lib/clientsApi";
import "./App.css";
import gdLogo from "./assets/gd-logo.jpeg";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import Contacts from "./Contacts/Contacts";
import PropertiesPage from "./Properties/PropertiesPage";
import SalesProgression from "./Sales Progression/SalesProgression";
import WongaReport from "./Wonga Report/WongaReport";
import Login from "./Login";
import { AuthProvider, useAuth } from "./AuthContext";
import { subscribeToProperties } from "./lib/propertiesApi";
import { subscribeToProfessionals } from "./lib/professionalsApi";
import { subscribeToSalesProgressions } from "./lib/salesProgressionsApi";
import { cleanupOldSalesProgressions } from "./lib/cleanupApi";

function AppContent({ logout }) {
  const [activeTab, setActiveTab] = useState("Contacts");
  const [pendingOpenClientName, setPendingOpenClientName] = useState(null);
  const pillsRef = useRef(null);
  const btnRefs = useRef({});
  const [highlightStyle, setHighlightStyle] = useState({ transform: "translateX(0)", width: 0 });

  // Reposition highlight on tab change or resize
  useLayoutEffect(() => {
    const reposition = () => {
      const container = pillsRef.current;
      const btn = btnRefs.current[activeTab];
      if (!container || !btn) return;
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      const left = bRect.left - cRect.left;
      const width = bRect.width;
      setHighlightStyle({ transform: `translateX(${left}px)`, width });
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activeTab]);
  const tabs = ["Contacts", "Properties", "Sales Progression", "Wonga Report"];

  // ✅ Properties state (Firestore-backed)
  const [properties, setProperties] = useState([]);
  const [showArchivedProperties, setShowArchivedProperties] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToProperties({ includeArchived: true }, setProperties);
    return () => unsubscribe();
  }, []);

  // Listen for requests to open a client by name (from PropertyPage linked pills)
  useEffect(() => {
    const handler = (e) => {
      const name = e?.detail?.name;
      if (!name) return;
      setActiveTab("Contacts");
      setPendingOpenClientName(name);
    };
    window.addEventListener('openClientByName', handler);
    return () => window.removeEventListener('openClientByName', handler);
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

  const updateClientStatus = async (clientName, newStatus) => {
    const client = clients.find(c => c.name === clientName);
    if (client?.id) {
      const { updateClientById } = await import("./lib/clientsApi");
      await updateClientById(client.id, { status: newStatus });
    }
  };

  const handleArchiveClient = async (clientName) => {
    const client = clients.find(c => c.name === clientName);
    if (client?.id) {
      const { archiveClientById } = await import("./lib/clientsApi");
      await archiveClientById(client.id);
    }
  };

  const handleDeleteClient = async (clientName) => {
    const client = clients.find(c => c.name === clientName);
    if (client?.id) {
      const { deleteClientById } = await import("./lib/clientsApi");
      await deleteClientById(client.id);
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
    const { deleteSalesProgressionById, deleteSalesProgressionByClientAndAddress, deleteSalesProgressionByAddress } = await import("./lib/salesProgressionsApi");
    if (progression?.id) {
      await deleteSalesProgressionById(progression.id);
    } else {
      // Try client+address, then address-only fallback
      await deleteSalesProgressionByClientAndAddress(clientName, propertyName);
      await deleteSalesProgressionByAddress(propertyName);
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
    // Compute display name per rule: both spouses -> "A and B"; otherwise first + surname
    const client = clients.find(c => c.name === clientName);
    let displayClientName = clientName;
    if (client) {
      const hasBothFirstNames = Boolean(client.spouse1FirstName) && Boolean(client.spouse2FirstName);
      if (hasBothFirstNames) {
        displayClientName = `${client.spouse1FirstName} and ${client.spouse2FirstName}`;
      } else if (client.spouse1FirstName || client.spouse1Surname) {
        const first = client.spouse1FirstName || "";
        const surname = client.spouse1Surname || "";
        displayClientName = [first, surname].filter(Boolean).join(" ");
      }
    }
    const { createSalesProgression } = await import("./lib/salesProgressionsApi");
    const progression = {
      client: displayClientName,
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
      completed: "Not Done",
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

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const profileLabelRef = useRef(null);
  const [profileButtonWidth, setProfileButtonWidth] = useState(44);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showProfileMenu]);

  // Dynamically size the expanding profile pill to fit label without moving the icon
  useLayoutEffect(() => {
    const computeWidth = () => {
      const labelEl = profileLabelRef.current;
      if (!labelEl) return;
      const labelWidth = labelEl.scrollWidth; // natural width of text
      const padding = 30; // slightly reduced padding so pill expands a bit less
      setProfileButtonWidth(44 + labelWidth + padding);
    };
    if (showProfileMenu) {
      computeWidth();
      window.addEventListener('resize', computeWidth);
      return () => window.removeEventListener('resize', computeWidth);
    } else {
      setProfileButtonWidth(44);
    }
  }, [showProfileMenu]);

  return (
    <div>
      {/* ✅ Header */}
      <div className="header">
        <img src={gdLogo} alt="Logo" className="logo" />
        <div className="nav-pills" ref={pillsRef}>
          <div className="nav-highlight" style={highlightStyle} />
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`nav-button ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              ref={(el) => (btnRefs.current[tab] = el)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="profile-area" ref={profileRef}>
          <button
            type="button"
            className={`profile-button ${showProfileMenu ? 'open' : ''}`}
            onClick={() => setShowProfileMenu((v) => !v)}
            aria-label="Profile menu"
            style={{ width: `${profileButtonWidth}px` }}
          >
            <span className="profile-label" ref={profileLabelRef}>Master Account</span>
            <span className="profile-icon">
              <FontAwesomeIcon icon={faUser} style={{ color: '#555555', width: '20px', height: '20px' }} />
            </span>
          </button>
          {showProfileMenu && (
            <div className="profile-menu">
              <button type="button" onClick={logout}>
                <span>Sign Out</span>
                <FontAwesomeIcon icon={faRightFromBracket} style={{ color: '#555555', marginLeft: 'auto' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Page Content */}
      <div style={{ padding: "0 2rem 2rem 0", marginTop: "-16px" }}>
        {activeTab === "Contacts" && (
          <Contacts
            clients={clients}
            setClients={setClients}
            professionals={professionals}
            setProfessionals={setProfessionals}
            properties={properties}
            setProperties={setProperties}
            allProperties={properties}
            salesProgressions={salesProgressions}
            updatePropertyLinkage={async (propertyName, clientData) => {
              const property = properties.find(p => p.name === propertyName);
              if (property?.id) {
                const { updatePropertyById } = await import("./lib/propertiesApi");
                
                // Store original market status if not already stored
                const originalMarketStatus = property.originalMarketStatus || property.status;
                
                // Handle both old single linkedClient and new linkedClients array
                if (Array.isArray(clientData)) {
                  await updatePropertyById(property.id, { 
                    linkedClients: clientData,
                    linkedClient: clientData.length > 0 ? clientData[0] : null, // keep first client for backward compatibility
                    originalMarketStatus: originalMarketStatus,
                    ...(clientData.length === 0 ? { offerStatus: "None", offerAmount: null, status: originalMarketStatus || "On Market" } : {})
                  });
                } else {
                  // Legacy single client linking
                  await updatePropertyById(property.id, { 
                    linkedClient: clientData,
                    linkedClients: clientData ? [clientData] : [],
                    originalMarketStatus: originalMarketStatus,
                    ...(clientData ? {} : { offerStatus: "None", offerAmount: null, status: originalMarketStatus || "On Market" })
                  });
                }
              }
            }}
            setSalesProgressions={setSalesProgressions}
            removeSalesProgressionRow={removeSalesProgressionRow}
            markPropertyAsMatched={markPropertyAsMatched}
            handleCancelMatch={handleCancelMatch}
            updateClientInfo={updateClientInfo}
            openClientName={pendingOpenClientName}
            onConsumeOpenClient={() => setPendingOpenClientName(null)}
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
          properties={properties}
          onRemoveRow={async (clientName, propertyName) => {
            // Reuse cancel flow from Contacts/App
            await handleCancelMatch(clientName, propertyName);
          }}
          markPropertyAsSold={async (propertyName) => {
            const property = properties.find(p => p.name === propertyName);
            if (property?.id) {
              const { updatePropertyById } = await import("./lib/propertiesApi");
              await updatePropertyById(property.id, { status: "Sold" });
            }
          }}
          updateClientStatus={updateClientStatus}
          professionals={professionals}
          setProfessionals={setProfessionals}
        />
        )}

        {activeTab === "Wonga Report" && (
          <WongaReport data={salesProgressions} properties={properties} clients={clients} />
        )}
      </div>
    </div>
  );
}

function App() {
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AppContent logout={logout} />;
}

function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithAuth;