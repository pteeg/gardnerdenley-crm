import React, { useState } from "react";
import ClientsTable from "./ClientsTable";
import ClientPage from "./ClientPage";
import ProfessionalsTable from "./ProfessionalsTable";
import ProfessionalPage from "./ProfessionalPage";
import NewProfessionalModal from "./NewProfessionalModal";
import "./Contacts.css";
import Sidebar from "../Sidebar";
import AddClientForm from "./AddClientForm";
import { createClient } from "../lib/clientsApi";
import EmailTemplatePickerModal from "./EmailTemplatePickerModal";

function Contacts({
  professionals,
  setProfessionals,
  properties,
  setProperties,
  salesProgressions,
  setSalesProgressions,
  clients,
  setClients,
  removeSalesProgressionRow,
  markPropertyAsMatched,
  // ✅ NEW: receive helper from App.jsx
  createNewSalesProgression,
  openClientName,
  onConsumeOpenClient,
  onSelectedClientChange
}) {
  const [subPage, setSubPage] = useState("Clients");
  const [clientsSubFilter, setClientsSubFilter] = useState({ mode: 'all', value: '' }); // mode: all|status|type|fav
  const [professionalsSubFilter, setProfessionalsSubFilter] = useState({ mode: 'all' }); // mode: all|fav|type
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedProfessionals, setShowArchivedProfessionals] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [templateEmailRecipient, setTemplateEmailRecipient] = useState(null);

  // Helper to format a client's display name like elsewhere in the app
  const formatClientName = (c) => {
    if (!c) return "";
    if (c.spouse1FirstName && c.spouse2FirstName) {
      return c.spouse1Surname
        ? `${c.spouse1FirstName} and ${c.spouse2FirstName} ${c.spouse1Surname}`
        : `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
    }
    if (c.spouse1FirstName || c.spouse1Surname) {
      const first = c.spouse1FirstName || "";
      const surname = c.spouse1Surname || "";
      return [first, surname].filter(Boolean).join(" ");
    }
    return c.name || "";
  };

  // Notify parent when selected client changes
  React.useEffect(() => {
    if (onSelectedClientChange) {
      onSelectedClientChange(selectedClient);
    }
  }, [selectedClient, onSelectedClientChange]);

  // When asked to open a specific contact by name, try clients first; if not found, try professionals
  React.useEffect(() => {
    if (!openClientName) return;
    // Try client by exact stored name
    let foundClient = clients.find(c => c.name === openClientName);
    // Try by formatted display name
    if (!foundClient) {
      foundClient = clients.find(c => formatClientName(c) === openClientName);
    }
    if (foundClient) {
      setSubPage("Clients");
      setSelectedClient(foundClient);
      // Ensure view starts at top after navigation
      setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 0);
    } else {
      // Fallback: try professionals by name
      const foundPro = professionals.find(p => p.name === openClientName);
      if (foundPro) {
        setSubPage("Professionals");
        setSelectedProfessional(foundPro);
        setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 0);
      }
    }
    if (onConsumeOpenClient) onConsumeOpenClient();
  }, [openClientName, clients, professionals]);

  const handleArchiveClient = async (clientToArchive) => {
    if (clientToArchive.id) {
      const { archiveClientById } = await import("../lib/clientsApi");
      await archiveClientById(clientToArchive.id);
      
      // Reset property statuses back to market status
      await resetLinkedPropertiesStatus(clientToArchive.name);
    }
    setSelectedClient(null);
  };

  const handleDeleteClient = async (clientToDelete) => {
    if (clientToDelete.id) {
      const { deleteClientById } = await import("../lib/clientsApi");
      await deleteClientById(clientToDelete.id);
      
      // Reset property statuses back to market status
      await resetLinkedPropertiesStatus(clientToDelete.name);
    }
    setSelectedClient(null);
  };

  const resetLinkedPropertiesStatus = async (clientName) => {
    // Find all properties linked to this client
    const linkedProperties = properties.filter(property => 
      (property.linkedClients && property.linkedClients.includes(clientName)) ||
      property.linkedClient === clientName
    );

    // Reset each property's status back to its original market status
    for (const property of linkedProperties) {
      if (property.id) {
        const { updatePropertyById } = await import("../lib/propertiesApi");
        
        // Use the stored original market status, or default to "On Market"
        const marketStatus = property.originalMarketStatus || "On Market";
        
        // Remove client from linkedClients array and reset status
        const updatedLinkedClients = (property.linkedClients || []).filter(name => name !== clientName);
        
        await updatePropertyById(property.id, {
          status: marketStatus,
          linkedClients: updatedLinkedClients,
          linkedClient: updatedLinkedClients.length > 0 ? updatedLinkedClients[0] : null,
          offerStatus: "None"
        });
      }
    }
  };

  const handleOpenEmailTemplatesForClient = (client) => {
    if (!client?.email) return;
    const name = formatClientName(client) || client.email;
    setTemplateEmailRecipient({ email: client.email, name });
  };

  const handleRestoreClient = async (clientToRestore) => {
    if (clientToRestore.id) {
      const { restoreClientById } = await import("../lib/clientsApi");
      await restoreClientById(clientToRestore.id);
    }
    setSelectedClient(null);
  };

  const updateClientStatus = async (clientName, newStatus) => {
    const target = clients.find(c => c.name === clientName);
    if (target?.id) {
      const { updateClientById } = await import("../lib/clientsApi");
      // When status is "Archived", also set archived to true
      // When status is anything else (e.g., "Under Offer"), set archived to false (unarchives the client)
      const archived = newStatus === "Archived";
      await updateClientById(target.id, { status: newStatus, archived });
      // Optimistically update local state so UI reflects immediately
      setClients(prev => prev.map(c => c.id === target.id ? { ...c, status: newStatus, archived } : c));
      // If this client is currently open, refresh the selectedClient too
      setSelectedClient(prev => (prev && prev.id === target.id ? { ...prev, status: newStatus, archived } : prev));
    }
  };

  const updatePropertyOffer = async (propertyName, update) => {
    const property = properties.find(p => p.name === propertyName);
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      // Build offers history updates
      let offers = Array.isArray(property.offers) ? [...property.offers] : [];
      let offersChanged = false;
      if (update.appendOffer) {
        offers.push(update.appendOffer);
        offersChanged = true;
      }
      if (update.setLastOfferStatus && offers.length > 0) {
        offers[offers.length - 1] = {
          ...offers[offers.length - 1],
          status: update.setLastOfferStatus
        };
        offersChanged = true;
      }
      const updates = {
        ...update,
        ...(offersChanged ? { offers } : {}),
        ...(update.offerStatus === "Accepted" ? { status: "Matched" } : {})
      };
      await updatePropertyById(property.id, updates);
    }
  };

  const updateClientProperties = async (clientName, updatedProperties) => {
    const client = clients.find(c => c.name === clientName);
    if (client?.id) {
      const { updateClientById } = await import("../lib/clientsApi");
      await updateClientById(client.id, { properties: updatedProperties });
    }
  };

  const toggleArchivedView = () => setShowArchived(prev => !prev);

  const handleArchiveProfessional = async (proToArchive) => {
    if (proToArchive.id) {
      const { archiveProfessionalById } = await import('../lib/professionalsApi');
      await archiveProfessionalById(proToArchive.id);
    }
    setSelectedProfessional(null);
  };

  const handleRestoreProfessional = async (proToRestore) => {
    if (proToRestore.id) {
      const { restoreProfessionalById } = await import('../lib/professionalsApi');
      await restoreProfessionalById(proToRestore.id);
    }
    setSelectedProfessional(null);
  };

  const toggleArchivedProfessionalsView = () => setShowArchivedProfessionals(prev => !prev);

  const handleAddProfessional = async (newPro) => {
    const { createProfessional } = await import('../lib/professionalsApi');
    await createProfessional({ ...newPro, archived: false });
    setIsAdding(false);
  };

  const handleAcceptOffer = async (clientName, propertyName) => {
    await createNewSalesProgression(clientName, propertyName);
    await markPropertyAsMatched(propertyName);
    await updateClientStatus(clientName, "Matched");
  };

  const handleCancelMatch = async (clientName, propertyName) => {
    await removeSalesProgressionRow(propertyName, clientName);

    const client = clients.find(c => c.name === clientName);
    if (client?.id) {
      const { updateClientById } = await import("../lib/clientsApi");
      const updatedProperties = client.properties?.filter(p => p.name !== propertyName) || [];
      await updateClientById(client.id, { properties: updatedProperties });
    }

    const property = properties.find(p => p.name === propertyName);
    if (property?.id) {
      const { updatePropertyById } = await import("../lib/propertiesApi");
      await updatePropertyById(property.id, {
        linkedClient: "",
        status: "On Market",
        offerStatus: "None"
      });
    }
  };

  const updateClientInfo = async (originalName, updatedClient) => {
    const client = clients.find(c => c.name === originalName);
    if (client?.id) {
      const { updateClientById } = await import("../lib/clientsApi");
      await updateClientById(client.id, updatedClient);
    }

    // Update sales progressions with new client name (only if name changed)
    if (updatedClient.name && updatedClient.name !== originalName) {
      const progressionsToUpdate = salesProgressions.filter(row => row.client === originalName);
      for (const progression of progressionsToUpdate) {
        if (progression.id) {
          const { updateSalesProgressionById } = await import("../lib/salesProgressionsApi");
          await updateSalesProgressionById(progression.id, { client: updatedClient.name });
        }
      }

      // Update properties with new client name
      const propertiesToUpdate = properties.filter(p => p.linkedClient === originalName);
      for (const property of propertiesToUpdate) {
        if (property.id) {
          const { updatePropertyById } = await import("../lib/propertiesApi");
          await updatePropertyById(property.id, { linkedClient: updatedClient.name });
        }
      }
    }

    // Update selectedClient by merging updates with existing client data
    if (selectedClient && selectedClient.name === originalName) {
      setSelectedClient(prev => ({ ...prev, ...updatedClient }));
    }
  };

  const isProfileOpen =
    (subPage === "Clients" && !!selectedClient) ||
    (subPage === "Professionals" && !!selectedProfessional);

  return (
    <div className="contacts-container">
      {!isProfileOpen && (
        <Sidebar
        title="Contacts"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        items={[
          {
            key: "clients",
            label: "Clients",
            active: subPage === "Clients",
            onClick: () => setSubPage("Clients"),
          },
          // Nested subsection for Clients
          ...(subPage === 'Clients' ? [{ key: 'clients-sub', label: (
            <div className="gd-sidebar-subsection slide-in">
              <button
                className={`gd-sidebar-item subitem ${clientsSubFilter.mode === 'all' && !showArchived ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'all', value: '' }); setShowArchived(false); }}
                type="button"
              >All</button>
              <button
                className={`gd-sidebar-item subitem ${clientsSubFilter.mode === 'fav' && !showArchived ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'fav', value: '' }); setShowArchived(false); }}
                type="button"
              >Favourites</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Searching' && !showArchived) ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'status', value: 'Searching' }); setShowArchived(false); }}
                type="button"
              >Searching</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Under Offer' && !showArchived) ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'status', value: 'Under Offer' }); setShowArchived(false); }}
                type="button"
              >Under Offer</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Matched' && !showArchived) ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'status', value: 'Matched' }); setShowArchived(false); }}
                type="button"
              >Matched</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Exchanged' && !showArchived) ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'status', value: 'Exchanged' }); setShowArchived(false); }}
                type="button"
              >Exchanged</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'type' && clientsSubFilter.value === 'Client' && !showArchived) ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'type', value: 'Client' }); setShowArchived(false); }}
                type="button"
              >Client</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'type' && clientsSubFilter.value === 'Developer' && !showArchived) ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'type', value: 'Developer' }); setShowArchived(false); }}
                type="button"
              >Developer</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'type' && clientsSubFilter.value === 'Vendor' && !showArchived) ? 'active' : ''}`}
                onClick={() => { setClientsSubFilter({ mode: 'type', value: 'Vendor' }); setShowArchived(false); }}
                type="button"
              >Vendor</button>
              <button
                className={`gd-sidebar-item subitem ${showArchived ? 'active' : ''}`}
                onClick={() => { toggleArchivedView(); setClientsSubFilter({ mode: 'all', value: '' }); }}
                type="button"
              >
                Archived
              </button>
            </div>
          ), active: false, onClick: () => {} }] : []),
          {
            key: "professionals",
            label: "Professionals",
            active: subPage === "Professionals",
            onClick: () => setSubPage("Professionals"),
          },
          // Nested subsection for Professionals
          ...(subPage === 'Professionals' ? [{ key: 'pros-sub', label: (
            <div className="gd-sidebar-subsection slide-in">
              <button
                className={`gd-sidebar-item subitem ${professionalsSubFilter.mode === 'all' && !showArchivedProfessionals ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'all' }); setShowArchivedProfessionals(false); }}
                type="button"
              >All</button>
              <button
                className={`gd-sidebar-item subitem ${professionalsSubFilter.mode === 'fav' && !showArchivedProfessionals ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'fav' }); setShowArchivedProfessionals(false); }}
                type="button"
              >Favourites</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Solicitor' && !showArchivedProfessionals) ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'type', value: 'Solicitor' }); setShowArchivedProfessionals(false); }}
                type="button"
              >Solicitor</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Mortgage Advisor' && !showArchivedProfessionals) ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'type', value: 'Mortgage Advisor' }); setShowArchivedProfessionals(false); }}
                type="button"
              >Mortgage Advisor</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Surveyor' && !showArchivedProfessionals) ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'type', value: 'Surveyor' }); setShowArchivedProfessionals(false); }}
                type="button"
              >Surveyor</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'SDLT Advisor' && !showArchivedProfessionals) ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'type', value: 'SDLT Advisor' }); setShowArchivedProfessionals(false); }}
                type="button"
              >SDLT Advisor</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Agent' && !showArchivedProfessionals) ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'type', value: 'Agent' }); setShowArchivedProfessionals(false); }}
                type="button"
              >Agent</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Developer' && !showArchivedProfessionals) ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'type', value: 'Developer' }); setShowArchivedProfessionals(false); }}
                type="button"
              >Developer</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Other' && !showArchivedProfessionals) ? 'active' : ''}`}
                onClick={() => { setProfessionalsSubFilter({ mode: 'type', value: 'Other' }); setShowArchivedProfessionals(false); }}
                type="button"
              >Other</button>
              <button
                className={`gd-sidebar-item subitem ${showArchivedProfessionals ? 'active' : ''}`}
                onClick={() => { setShowArchivedProfessionals(prev => !prev); setProfessionalsSubFilter({ mode: 'all' }); }}
                type="button"
              >
                Archived
              </button>
            </div>
          ), active: false, onClick: () => {} }] : []),
        ]}
      />
      )}

      <div className={`contacts-main ${isProfileOpen ? 'client-profile-open' : ''}`}>
        {subPage === "Clients" && !selectedClient && (
          <>
            <ClientsTable
              clients={clients
                .filter((c) => c.archived === showArchived)
                .filter((c) => {
                  if (clientsSubFilter.mode === 'all') return true;
                  if (clientsSubFilter.mode === 'fav') {
                    return c.favourite === true;
                  }
                  if (clientsSubFilter.mode === 'status') {
                    if (!clientsSubFilter.value) return true;
                    // For "Archived" status, show archived clients that have had a deal completed
                    if (clientsSubFilter.value === 'Archived') {
                      // Check if client is archived and has a completed deal (invoicePaid === "Done")
                      const hasCompletedDeal = salesProgressions.some(sp => {
                        // Match client name (handle formatted names)
                        const clientName = c.name;
                        const spClientName = sp.client;
                        // Direct match
                        if (spClientName === clientName) {
                          return sp.invoicePaid === "Done";
                        }
                        // Check formatted names
                        if (c.spouse1FirstName && c.spouse2FirstName) {
                          const bothFirstNames = `${c.spouse1FirstName} and ${c.spouse2FirstName}`;
                          if (spClientName === bothFirstNames || 
                              (c.spouse1Surname && spClientName === `${bothFirstNames} ${c.spouse1Surname}`)) {
                            return sp.invoicePaid === "Done";
                          }
                        }
                        if (c.spouse1FirstName) {
                          const singleName = c.spouse1Surname 
                            ? `${c.spouse1FirstName} ${c.spouse1Surname}` 
                            : c.spouse1FirstName;
                          if (spClientName === singleName) {
                            return sp.invoicePaid === "Done";
                          }
                        }
                        return false;
                      });
                      return c.archived === true && hasCompletedDeal;
                    }
                    return (c.status || '').toLowerCase() === clientsSubFilter.value.toLowerCase();
                  }
                  if (clientsSubFilter.mode === 'type') {
                    if (!clientsSubFilter.value) return true;
                    return Array.isArray(c.types) && c.types.map((t)=>String(t).toLowerCase()).includes(clientsSubFilter.value.toLowerCase());
                  }
                  return true;
                })}
              favouritesOnly={clientsSubFilter.mode === 'fav'}
              onNewClientClick={() => setShowForm(true)}
              onRestore={handleRestoreClient}
              showArchived={showArchived}
              onRowClick={(client) => setSelectedClient(client)}
              onEmailClick={handleOpenEmailTemplatesForClient}
            />
            {showForm && (
              <AddClientForm
                onClose={() => setShowForm(false)}
                onSave={async (newClient) => {
                  await createClient({ ...newClient, archived: false, properties: [] });
                }}
                allClients={clients}
                professionals={professionals}
              />
            )}
          </>
        )}

      {subPage === "Clients" && selectedClient && (
          <ClientPage
            client={selectedClient}
            updateClientStatus={updateClientStatus}
            onBack={() => setSelectedClient(null)}
            properties={properties}
            allClients={clients}
            salesProgressions={salesProgressions}
            updateClientProperties={updateClientProperties}
            setProperties={setProperties}
            allProperties={properties}
            updatePropertyLinkage={async (propertyName, clientData) => {
              const property = properties.find(p => p.name === propertyName);
              if (property?.id) {
                const { updatePropertyById } = await import("../lib/propertiesApi");
                
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
            handleAcceptOffer={handleAcceptOffer}
            updatePropertyOffer={updatePropertyOffer}
            removeSalesProgressionRow={removeSalesProgressionRow}
            handleCancelMatch={handleCancelMatch}
            updateClientInfo={updateClientInfo}
            onArchiveClient={handleArchiveClient}
            onDeleteClient={handleDeleteClient}
            onOpenEmailWithTemplate={handleOpenEmailTemplatesForClient}
            professionals={professionals}
          />
        )}

        {subPage === "Professionals" && !selectedProfessional && (
          <>
            <ProfessionalsTable
              professionals={professionals
                .filter((p) => p.archived === showArchivedProfessionals)
                .filter((p) => {
                  if (professionalsSubFilter.mode === 'fav') return p.favourite === true;
                  if (professionalsSubFilter.mode === 'type') return (p.type || '').toLowerCase() === (professionalsSubFilter.value || '').toLowerCase();
                  return true;
                })
              }
              onArchiveProfessional={handleArchiveProfessional}
              onRestoreProfessional={handleRestoreProfessional}
              showArchived={showArchivedProfessionals}
              onRowClick={(pro) => setSelectedProfessional(pro)}
              onAddProfessional={() => setIsAdding(true)}
            />
            {isAdding && (
              <NewProfessionalModal
                onClose={() => setIsAdding(false)}
                onAddProfessional={handleAddProfessional}
              />
            )}
          </>
        )}

        {subPage === "Professionals" && selectedProfessional && (
          <ProfessionalPage
            professional={selectedProfessional}
            onBack={() => setSelectedProfessional(null)}
            properties={properties}
            salesProgressions={salesProgressions}
            clients={clients}
            onArchiveProfessional={handleArchiveProfessional}
            onRestoreProfessional={handleRestoreProfessional}
          />
        )}
      </div>

      {templateEmailRecipient && (
        <EmailTemplatePickerModal
          isOpen={!!templateEmailRecipient}
          recipient={templateEmailRecipient}
          onClose={() => setTemplateEmailRecipient(null)}
        />
      )}
    </div>
  );
}

export default Contacts;