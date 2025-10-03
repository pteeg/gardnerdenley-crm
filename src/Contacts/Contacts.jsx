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
  onConsumeOpenClient
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

  // When asked to open a specific client by name, switch to Clients and select it
  React.useEffect(() => {
    if (!openClientName) return;
    setSubPage("Clients");
    const found = clients.find(c => c.name === openClientName);
    if (found) {
      setSelectedClient(found);
    }
    if (onConsumeOpenClient) onConsumeOpenClient();
  }, [openClientName, clients]);

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
      await updateClientById(target.id, { status: newStatus, archived: false });
      // Optimistically update local state so UI reflects immediately
      setClients(prev => prev.map(c => c.id === target.id ? { ...c, status: newStatus, archived: false } : c));
      // If this client is currently open, refresh the selectedClient too
      setSelectedClient(prev => (prev && prev.id === target.id ? { ...prev, status: newStatus, archived: false } : prev));
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

    // Update sales progressions with new client name
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

    setSelectedClient(updatedClient);
  };

  return (
    <div className="contacts-container">
      <Sidebar
        title="Contacts"
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
                className={`gd-sidebar-item subitem ${clientsSubFilter.mode === 'all' ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'all', value: '' })}
                type="button"
              >All</button>
              <button
                className={`gd-sidebar-item subitem ${clientsSubFilter.mode === 'fav' ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'fav', value: '' })}
                type="button"
              >Favourites</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Searching') ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'status', value: 'Searching' })}
                type="button"
              >Searching</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Under Offer') ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'status', value: 'Under Offer' })}
                type="button"
              >Under Offer</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Matched') ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'status', value: 'Matched' })}
                type="button"
              >Matched</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Exchanged') ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'status', value: 'Exchanged' })}
                type="button"
              >Exchanged</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'status' && clientsSubFilter.value === 'Completed') ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'status', value: 'Completed' })}
                type="button"
              >Completed</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'type' && clientsSubFilter.value === 'Client') ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'type', value: 'Client' })}
                type="button"
              >Client</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'type' && clientsSubFilter.value === 'Developer') ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'type', value: 'Developer' })}
                type="button"
              >Developer</button>
              <button
                className={`gd-sidebar-item subitem ${(clientsSubFilter.mode === 'type' && clientsSubFilter.value === 'Vendor') ? 'active' : ''}`}
                onClick={() => setClientsSubFilter({ mode: 'type', value: 'Vendor' })}
                type="button"
              >Vendor</button>
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
                className={`gd-sidebar-item subitem ${professionalsSubFilter.mode === 'all' ? 'active' : ''}`}
                onClick={() => setProfessionalsSubFilter({ mode: 'all' })}
                type="button"
              >All</button>
              <button
                className={`gd-sidebar-item subitem ${professionalsSubFilter.mode === 'fav' ? 'active' : ''}`}
                onClick={() => setProfessionalsSubFilter({ mode: 'fav' })}
                type="button"
              >Favourites</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Solicitor') ? 'active' : ''}`}
                onClick={() => setProfessionalsSubFilter({ mode: 'type', value: 'Solicitor' })}
                type="button"
              >Solicitor</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Mortgage Advisor') ? 'active' : ''}`}
                onClick={() => setProfessionalsSubFilter({ mode: 'type', value: 'Mortgage Advisor' })}
                type="button"
              >Mortgage Advisor</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Surveyor') ? 'active' : ''}`}
                onClick={() => setProfessionalsSubFilter({ mode: 'type', value: 'Surveyor' })}
                type="button"
              >Surveyor</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'SDLT Advisor') ? 'active' : ''}`}
                onClick={() => setProfessionalsSubFilter({ mode: 'type', value: 'SDLT Advisor' })}
                type="button"
              >SDLT Advisor</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Agent') ? 'active' : ''}`}
                onClick={() => setProfessionalsSubFilter({ mode: 'type', value: 'Agent' })}
                type="button"
              >Agent</button>
              <button
                className={`gd-sidebar-item subitem ${(professionalsSubFilter.mode === 'type' && professionalsSubFilter.value === 'Other') ? 'active' : ''}`}
                onClick={() => setProfessionalsSubFilter({ mode: 'type', value: 'Other' })}
                type="button"
              >Other</button>
            </div>
          ), active: false, onClick: () => {} }] : []),
        ]}
      />

      <div className="contacts-main">
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
              onArchiveClient={handleArchiveClient}
              onRestore={handleRestoreClient}
              onToggleView={toggleArchivedView}
              showArchived={showArchived}
              onRowClick={(client) => setSelectedClient(client)}
            />
            {showForm && (
              <AddClientForm
                onClose={() => setShowForm(false)}
                onSave={async (newClient) => {
                  await createClient({ ...newClient, archived: false, properties: [] });
                }}
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
            professionals={professionals}
          />
        )}

        {subPage === "Professionals" && !selectedProfessional && (
          <>
            <ProfessionalsTable
              professionals={professionals
                .filter((p) => p.archived === showArchived)
                .filter((p) => {
                  if (professionalsSubFilter.mode === 'fav') return p.favourite === true;
                  if (professionalsSubFilter.mode === 'type') return (p.type || '').toLowerCase() === (professionalsSubFilter.value || '').toLowerCase();
                  return true;
                })
              }
              onArchiveProfessional={handleArchiveProfessional}
              onRestoreProfessional={handleRestoreProfessional}
              onToggleView={toggleArchivedProfessionalsView}
              showArchived={showArchived}
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
          />
        )}
      </div>
    </div>
  );
}

export default Contacts;