import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { subscribeToClients } from "./lib/clientsApi";
import "./App.css";
import gdLogo from "./assets/gd-logo.jpeg";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faX, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import Contacts from "./Contacts/Contacts";
import PropertiesPage from "./Properties/PropertiesPage";
import SalesProgression from "./Sales Progression/SalesProgression";
import WongaReport from "./Wonga Report/WongaReport";
import Overview from "./Overview/Overview";
import Login from "./Login";
import Sidebar from "./Sidebar";
import { AuthProvider, useAuth } from "./AuthContext";
import { subscribeToProperties } from "./lib/propertiesApi";
import { subscribeToProfessionals } from "./lib/professionalsApi";
import { subscribeToSalesProgressions } from "./lib/salesProgressionsApi";
import { cleanupOldSalesProgressions } from "./lib/cleanupApi";
import LogOfferModal from "./LogOfferModal";
import LogNoteModal from "./LogNoteModal";
import ActivityButton from "./ActivityButton";
import { logActivity } from "./lib/activityLogApi";
import EmailTemplatesPage from "./Contacts/EmailTemplatesPage";

function AppContent({ logout }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [pendingOpenClientName, setPendingOpenClientName] = useState(null);
  const pillsRef = useRef(null);
  const btnRefs = useRef({});
  const [highlightStyle, setHighlightStyle] = useState({ transform: "translateX(0)", width: 0 });
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const navDropdownRef = useRef(null);
  const [homeSidebarCollapsed, setHomeSidebarCollapsed] = useState(false);
  const [homeSubPage, setHomeSubPage] = useState("Overview");

  // Reposition highlight on tab change or resize
  useLayoutEffect(() => {
    const reposition = () => {
      const container = pillsRef.current;
      // Map "Overview" to the "Home" button ref
      const tabKey = activeTab === "Overview" ? "Overview" : activeTab;
      const btn = btnRefs.current[tabKey];
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
  const tabs = ["Home", "Contacts", "Properties", "Sales Progression", "Wonga Report"];

  // Check screen width for responsive navigation
  useEffect(() => {
    const checkScreenWidth = () => {
      // Treat slightly narrower widths as "wide" so the + Activity pill
      // can stay centered between the nav and My Account on most laptops.
      setIsNarrowScreen(window.innerWidth < 980);
    };
    
    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);
    return () => window.removeEventListener("resize", checkScreenWidth);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target)) {
        setShowNavDropdown(false);
      }
    };

    if (showNavDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNavDropdown]);

  // ✅ Properties state (Firestore-backed)
  const [properties, setProperties] = useState([]);
  const [showArchivedProperties, setShowArchivedProperties] = useState(false);
  const [pendingOpenPropertyName, setPendingOpenPropertyName] = useState(null);

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

  // Listen for requests to open a property by name (e.g. from master activity log)
  useEffect(() => {
    const handler = (e) => {
      const name = e?.detail?.name;
      if (!name) return;
      setActiveTab("Properties");
      setPendingOpenPropertyName(name);
    };
    window.addEventListener('openPropertyByName', handler);
    return () => window.removeEventListener('openPropertyByName', handler);
  }, []);

  // Listen for requests to open Sales Progression tab
  useEffect(() => {
    const handler = (e) => {
      setActiveTab("Sales Progression");
      // Could potentially scroll to or highlight specific client/property combination in the future
    };
    window.addEventListener('openSalesProgression', handler);
    return () => window.removeEventListener('openSalesProgression', handler);
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
      // When status is "Archived", also set archived to true
      // When status is anything else (e.g., "Under Offer"), set archived to false (unarchives the client)
      const archived = newStatus === "Archived";
      await updateClientById(client.id, { status: newStatus, archived });
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
  const activityButtonCenterRef = useRef(null);

  // Log Offer Modal state
  const [showLogOfferModal, setShowLogOfferModal] = useState(false);
  const [currentSelectedClient, setCurrentSelectedClient] = useState(null);
  
  // Log Note Modal state
  const [showLogNoteModal, setShowLogNoteModal] = useState(false);
  const [showPhoneCallModal, setShowPhoneCallModal] = useState(false);
  const [currentSelectedProperty, setCurrentSelectedProperty] = useState(null);

  // Clear selected client/property when navigating away from Contacts/Properties pages
  useEffect(() => {
    if (activeTab !== "Contacts" && activeTab !== "Properties") {
      setCurrentSelectedClient(null);
      setCurrentSelectedProperty(null);
    }
  }, [activeTab]);

  // Global handlers for + Activity buttons inside entity pages
  useEffect(() => {
    const handleLogOfferForClient = (event) => {
      const name = event.detail?.clientName;
      if (!name) return;
      const client = clients.find((c) => c.name === name);
      if (!client) return;
      setCurrentSelectedClient(client);
      setShowLogOfferModal(true);
    };

    const handleLogNoteForClient = (event) => {
      const name = event.detail?.clientName;
      if (!name) return;
      const client = clients.find((c) => c.name === name);
      if (!client) return;
      setCurrentSelectedClient(client);
      setCurrentSelectedProperty(null);
      // Check if this is for phone call or regular note
      const isPhoneCall = event.detail?.isPhoneCall;
      if (isPhoneCall) {
        setShowPhoneCallModal(true);
      } else {
        setShowLogNoteModal(true);
      }
    };

    window.addEventListener("logOfferForClient", handleLogOfferForClient);
    window.addEventListener("logNoteForClient", handleLogNoteForClient);

    return () => {
      window.removeEventListener("logOfferForClient", handleLogOfferForClient);
      window.removeEventListener("logNoteForClient", handleLogNoteForClient);
    };
  }, [clients]);

  useEffect(() => {
    if (!showProfileMenu) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") setShowProfileMenu(false);
    };

    const handleClickOutside = (e) => {
      // Close when clicking anywhere outside the My Account pill + popup
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  // Position ActivityButton between nav pills and hamburger button (wide screen only)
  useLayoutEffect(() => {
    if (isNarrowScreen) {
      // In narrow screen mode, flex container handles centering
      if (activityButtonCenterRef.current) {
        activityButtonCenterRef.current.style.left = '';
        activityButtonCenterRef.current.style.transform = '';
      }
      return;
    }
    
    const updateActivityButtonPosition = () => {
      if (!pillsRef.current || !profileRef.current || !activityButtonCenterRef.current) return;
      
      const navPillsRect = pillsRef.current.getBoundingClientRect();
      const profileRect = profileRef.current.getBoundingClientRect();
      const headerRect = pillsRef.current.closest('.header')?.getBoundingClientRect();
      
      if (!headerRect) return;
      
      // Calculate midpoint between right edge of nav pills and left edge of hamburger button
      const navPillsRight = navPillsRect.right - headerRect.left;
      const hamburgerLeft = profileRect.left - headerRect.left;
      const midpoint = (navPillsRight + hamburgerLeft) / 2;
      
      // Position the button at the midpoint
      if (midpoint > 0 && midpoint < headerRect.width) {
        activityButtonCenterRef.current.style.left = `${midpoint}px`;
        activityButtonCenterRef.current.style.transform = 'translateX(-50%) translateY(-50%)';
        activityButtonCenterRef.current.style.visibility = 'visible';
      }
    };
    
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateActivityButtonPosition, 100);
    updateActivityButtonPosition();
    window.addEventListener('resize', updateActivityButtonPosition);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateActivityButtonPosition);
    };
  }, [activeTab, isNarrowScreen]);

  return (
    <div>
      {/* ✅ Header */}
      <div className="header">
        <img 
          src={gdLogo} 
          alt="Logo" 
          className="logo clickable-logo" 
          onClick={() => setActiveTab("Overview")}
          style={{ cursor: "pointer" }}
        />
        {isNarrowScreen ? (
          <div className="nav-and-activity-center">
            <div className="nav-area narrow-screen">
              <div className="nav-pills nav-pills-dropdown" ref={navDropdownRef}>
                <button
                  className="nav-button active"
                  onClick={() => setShowNavDropdown(!showNavDropdown)}
                  style={{ position: "relative", zIndex: 1001 }}
                >
                  {activeTab === "Overview" ? "Home" : activeTab}
                  <span className="nav-caret" style={{ marginLeft: "0.5rem" }}>▾</span>
                </button>
                {showNavDropdown && (
                  <div className="nav-dropdown" style={{ zIndex: 10000 }}>
                    {tabs.map((tab) => {
                      const tabKey = tab === "Home" ? "Overview" : tab;
                      const isActive = activeTab === tabKey;
                      return (
                        <button
                          key={tab}
                          className={`nav-dropdown-item ${isActive ? "active" : ""}`}
                          onClick={() => {
                            setActiveTab(tabKey);
                            setShowNavDropdown(false);
                          }}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="activity-button-center narrow-screen" ref={activityButtonCenterRef}>
              <ActivityButton
                onNoteClick={() => {
                  setCurrentSelectedClient(null);
                  setCurrentSelectedProperty(null);
                  setShowLogNoteModal(true);
                }}
                onPhoneCallNoteClick={() => {
                  setCurrentSelectedClient(null);
                  setCurrentSelectedProperty(null);
                  setShowPhoneCallModal(true);
                }}
                onLogOfferClick={() => {
                  setCurrentSelectedClient(null);
                  setShowLogOfferModal(true);
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="nav-area">
              <div className="nav-pills" ref={pillsRef}>
                <div className="nav-highlight" style={highlightStyle} />
                {tabs.map((tab) => {
                  // Map "Home" display name to "Overview" in the code
                  const tabKey = tab === "Home" ? "Overview" : tab;
                  return (
                    <button
                      key={tab}
                      className={`nav-button ${activeTab === tabKey ? "active" : ""}`}
                      onClick={() => setActiveTab(tabKey)}
                      ref={(el) => (btnRefs.current[tabKey] = el)}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="activity-button-center" ref={activityButtonCenterRef}>
              <ActivityButton
                onNoteClick={() => {
                  setCurrentSelectedClient(null);
                  setCurrentSelectedProperty(null);
                  setShowLogNoteModal(true);
                }}
                onPhoneCallNoteClick={() => {
                  setCurrentSelectedClient(null);
                  setCurrentSelectedProperty(null);
                  setShowPhoneCallModal(true);
                }}
                onLogOfferClick={() => {
                  setCurrentSelectedClient(null);
                  setShowLogOfferModal(true);
                }}
              />
            </div>
          </>
        )}
        <div className="profile-area" ref={profileRef}>
          <button
            type="button"
            className={`hamburger-button ${showProfileMenu ? "hamburger-button--active" : ""}`}
            onClick={() => setShowProfileMenu((v) => !v)}
            aria-label="My Account"
          >
            <span className="hamburger-label">My Account</span>
            <FontAwesomeIcon 
              icon={faBars} 
              style={{ color: showProfileMenu ? '#ffffff' : '#555555', width: '18px', height: '18px' }} 
            />
          </button>
          {showProfileMenu && (
            <div className="hamburger-menu">
              <button 
                type="button" 
                className="menu-item" 
                style={{ marginTop: 0 }}
                onClick={() => {
                  // TODO: wire up Settings screen when implemented
                }}
              >
                <span>Settings</span>
              </button>
              <button type="button" onClick={logout} className="menu-item">
                <span>Sign Out</span>
                <FontAwesomeIcon icon={faRightFromBracket} style={{ color: 'white', marginLeft: 'auto' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Page Content */}
      <div style={{ padding: "0", marginTop: "-16px", width: "100%", overflowX: "hidden", marginRight: "0", paddingRight: "0" }}>
        {activeTab === "Overview" && (
          <div className={`home-with-sidebar ${homeSubPage === "Email Templates" ? "home-with-sidebar--white" : ""}`}>
            <Sidebar
              title="Home"
              collapsed={homeSidebarCollapsed}
              onToggleCollapse={() => setHomeSidebarCollapsed((v) => !v)}
              items={[
                {
                  key: "home-overview",
                  label: "Overview",
                  active: homeSubPage === "Overview",
                  onClick: () => setHomeSubPage("Overview"),
                },
                {
                  key: "home-active-searches",
                  label: "Active Searches",
                  active: homeSubPage === "Active Searches",
                  onClick: () => setHomeSubPage("Active Searches"),
                },
                {
                  key: "home-master-activity",
                  label: "Master Activity Log",
                  active: homeSubPage === "Master Activity Log",
                  onClick: () => setHomeSubPage("Master Activity Log"),
                },
                {
                  key: "home-email-templates",
                  label: "Email Templates",
                  active: homeSubPage === "Email Templates",
                  onClick: () => setHomeSubPage("Email Templates"),
                },
              ]}
            />
            <div className="home-main">
              {homeSubPage === "Overview" && (
                <Overview
                  clients={clients}
                  properties={properties}
                  professionals={professionals}
                  salesProgressions={salesProgressions}
                  updateClientStatus={updateClientStatus}
                  createNewSalesProgression={createNewSalesProgression}
                  removeSalesProgressionRow={removeSalesProgressionRow}
                  hasHomeSidebar
                  showTopTiles
                  showActivityLog
                />
              )}

              {homeSubPage === "Active Searches" && (
                <Overview
                  clients={clients}
                  properties={properties}
                  professionals={professionals}
                  salesProgressions={salesProgressions}
                  updateClientStatus={updateClientStatus}
                  createNewSalesProgression={createNewSalesProgression}
                  removeSalesProgressionRow={removeSalesProgressionRow}
                  hasHomeSidebar
                  showTopTiles
                  showActivityLog={false}
                />
              )}

              {homeSubPage === "Master Activity Log" && (
                <Overview
                  clients={clients}
                  properties={properties}
                  professionals={professionals}
                  salesProgressions={salesProgressions}
                  updateClientStatus={updateClientStatus}
                  createNewSalesProgression={createNewSalesProgression}
                  removeSalesProgressionRow={removeSalesProgressionRow}
                  hasHomeSidebar
                  showTopTiles={false}
                  showActivityLog
                />
              )}

              {homeSubPage === "Email Templates" && (
                <EmailTemplatesPage
                  clients={clients}
                  professionals={professionals}
                />
              )}
            </div>
          </div>
        )}

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
            onSelectedClientChange={setCurrentSelectedClient}
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
            openPropertyName={pendingOpenPropertyName}
            onConsumeOpenProperty={() => setPendingOpenPropertyName(null)}
            clients={clients}
            allProperties={properties}
            updateClientStatus={updateClientStatus}
            createNewSalesProgression={createNewSalesProgression}
            removeSalesProgressionRow={removeSalesProgressionRow}
          />
        )}

        {activeTab === "Sales Progression" && (
        <SalesProgression
          data={salesProgressions}
          setData={setSalesProgressions}
          clients={clients}
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

      {/* Log Offer Modal */}
      <LogOfferModal
        isOpen={showLogOfferModal}
        onClose={() => setShowLogOfferModal(false)}
        clients={clients}
        properties={properties}
        preSelectedClient={currentSelectedClient}
        onSave={async ({ client, property, amount, timestamp }) => {
          // Update property offer
          const { updatePropertyById } = await import("./lib/propertiesApi");
          const propertyToUpdate = properties.find(p => p.id === property.id);
          if (propertyToUpdate?.id) {
            const offers = Array.isArray(propertyToUpdate.offers) ? [...propertyToUpdate.offers] : [];
            offers.push({
              date: timestamp || new Date().toISOString(),
              amount: amount,
              status: "Pending"
            });
            await updatePropertyById(propertyToUpdate.id, {
              offerAmount: amount,
              offerStatus: "Pending",
              offers: offers
            });
          }

          // Update client status
          await updateClientStatus(client.name, "Under Offer");

          // Note: Do NOT automatically link property to client - prospective properties is separate

          // Log to activity log with both client and property references
          await logActivity({
            type: "offer",
            entityType: "property", // Primary entity type
            entityName: property.name,
            clientName: client.name,
            propertyName: property.name,
            details: String(amount),
            status: "Pending",
            timestamp: timestamp || new Date().toISOString(),
          });
        }}
      />

      {/* Log Note Modal */}
      <LogNoteModal
        isOpen={showLogNoteModal}
        onClose={() => setShowLogNoteModal(false)}
        clients={clients}
        properties={properties}
        professionals={professionals}
        preSelectedClient={currentSelectedClient}
        preSelectedProperty={currentSelectedProperty}
        onSave={async ({ client, property, professional, note, timestamp }) => {
          const { updateClientById } = await import("./lib/clientsApi");
          const { updatePropertyById } = await import("./lib/propertiesApi");
          
          // Update client notes if client is selected
          if (client) {
            const clientToUpdate = clients.find(c => c.id === client.id);
            if (clientToUpdate?.id) {
              const notes = Array.isArray(clientToUpdate.notes) 
                ? [...clientToUpdate.notes, { date: timestamp, text: note }]
                : [{ date: timestamp, text: note }];
              await updateClientById(clientToUpdate.id, { notes });
            }
          }

          // Update property notes if property is selected
          if (property) {
            const propertyToUpdate = properties.find(p => p.id === property.id);
            if (propertyToUpdate?.id) {
              const notes = Array.isArray(propertyToUpdate.notes)
                ? [...propertyToUpdate.notes, { date: timestamp, text: note }]
                : [{ date: timestamp, text: note }];
              await updatePropertyById(propertyToUpdate.id, { notes });
            }
          }

          // Log to activity log - single entry with all linked entities
          const activityLogEntry = {
            type: "note",
            details: note,
            timestamp: timestamp,
          };

          // Always include professionalName if professional is selected
          if (professional) {
            activityLogEntry.professionalName = professional.name;
          }

          // Determine entityType and entityName based on what's selected
          if (client && property) {
            // Both selected - use primary entity as client, but include both in the log
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
            activityLogEntry.propertyName = property.name;
          } else if (client && professional) {
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
          } else if (property && professional) {
            activityLogEntry.entityType = "property";
            activityLogEntry.entityName = property.name;
            activityLogEntry.propertyName = property.name;
          } else if (client) {
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
          } else if (property) {
            activityLogEntry.entityType = "property";
            activityLogEntry.entityName = property.name;
            activityLogEntry.propertyName = property.name;
          } else if (professional) {
            activityLogEntry.entityType = "professional";
            activityLogEntry.entityName = professional.name;
          }

          await logActivity(activityLogEntry);
        }}
      />

      {/* Phone Call Modal */}
      <LogNoteModal
        isOpen={showPhoneCallModal}
        onClose={() => setShowPhoneCallModal(false)}
        clients={clients}
        properties={properties}
        professionals={professionals}
        preSelectedClient={currentSelectedClient}
        preSelectedProperty={currentSelectedProperty}
        title="Add Phone Call"
        onSave={async ({ client, property, professional, note, timestamp }) => {
          const { updateClientById } = await import("./lib/clientsApi");
          const { updatePropertyById } = await import("./lib/propertiesApi");
          
          // Update client notes if client is selected
          if (client) {
            const clientToUpdate = clients.find(c => c.id === client.id);
            if (clientToUpdate?.id) {
              const notes = Array.isArray(clientToUpdate.notes) 
                ? [...clientToUpdate.notes, { date: timestamp, text: note }]
                : [{ date: timestamp, text: note }];
              await updateClientById(clientToUpdate.id, { notes });
            }
          }

          // Update property notes if property is selected
          if (property) {
            const propertyToUpdate = properties.find(p => p.id === property.id);
            if (propertyToUpdate?.id) {
              const notes = Array.isArray(propertyToUpdate.notes)
                ? [...propertyToUpdate.notes, { date: timestamp, text: note }]
                : [{ date: timestamp, text: note }];
              await updatePropertyById(propertyToUpdate.id, { notes });
            }
          }

          // Log to activity log - single entry with both client and property if both are selected
          const activityLogEntry = {
            type: "phoneCall",
            details: note,
            timestamp: timestamp,
          };

          // Always include professionalName if professional is selected
          if (professional) {
            activityLogEntry.professionalName = professional.name;
          }

          // Determine entityType and entityName based on what's selected
          if (client && property) {
            // Both selected - use primary entity as client, but include both in the log
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
            activityLogEntry.propertyName = property.name;
          } else if (client && professional) {
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
          } else if (property && professional) {
            activityLogEntry.entityType = "property";
            activityLogEntry.entityName = property.name;
            activityLogEntry.propertyName = property.name;
          } else if (client) {
            activityLogEntry.entityType = "client";
            activityLogEntry.entityName = client.name;
            activityLogEntry.clientName = client.name;
          } else if (property) {
            activityLogEntry.entityType = "property";
            activityLogEntry.entityName = property.name;
            activityLogEntry.propertyName = property.name;
          } else if (professional) {
            activityLogEntry.entityType = "professional";
            activityLogEntry.entityName = professional.name;
          }

          await logActivity(activityLogEntry);
        }}
      />
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