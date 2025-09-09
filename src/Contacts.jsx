import React, { useState } from "react";
import ClientsTable from "./ClientsTable";
import ClientPage from "./ClientPage";
import ProfessionalsTable from "./ProfessionalsTable";
import ProfessionalPage from "./ProfessionalPage";
import NewProfessionalModal from "./NewProfessionalModal";
import "./Contacts.css";
import Sidebar from "./Sidebar";
import AddClientForm from "./AddClientForm";
import { createClient } from "./lib/clientsApi";

function Contacts({
  professionals,
  setProfessionals,
  properties,
  setProperties,
  setSalesProgressions,
  clients,
  setClients,
  removeSalesProgressionRow,
  // ✅ NEW: receive helper from App.jsx
  createNewSalesProgression
}) {
  const [subPage, setSubPage] = useState("Clients");
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedProfessionals, setShowArchivedProfessionals] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleArchiveClient = async (clientToArchive) => {
    if (clientToArchive.id) {
      const { archiveClientById } = await import("./lib/clientsApi");
      await archiveClientById(clientToArchive.id);
    }
    setSelectedClient(null);
  };

  const handleRestoreClient = async (clientToRestore) => {
    if (clientToRestore.id) {
      const { restoreClientById } = await import("./lib/clientsApi");
      await restoreClientById(clientToRestore.id);
    }
    setSelectedClient(null);
  };

  const updateClientStatus = async (clientName, newStatus) => {
    const target = clients.find(c => c.name === clientName);
    if (target?.id) {
      const { updateClientById } = await import("./lib/clientsApi");
      await updateClientById(target.id, { status: newStatus, archived: false });
    }
  };

  const updatePropertyOffer = async (propertyName, update) => {
    const property = properties.find(p => p.name === propertyName);
    if (property?.id) {
      const { updatePropertyById } = await import("./lib/propertiesApi");
      const updates = {
        ...update,
        ...(update.offerStatus === "Accepted" ? { status: "Matched" } : {})
      };
      await updatePropertyById(property.id, updates);
    }
  };

  const updateClientProperties = async (clientName, updatedProperties) => {
    const client = clients.find(c => c.name === clientName);
    if (client?.id) {
      const { updateClientById } = await import("./lib/clientsApi");
      await updateClientById(client.id, { properties: updatedProperties });
    }
  };

  const toggleArchivedView = () => setShowArchived(prev => !prev);

  const handleArchiveProfessional = async (proToArchive) => {
    if (proToArchive.id) {
      const { archiveProfessionalById } = await import('./lib/professionalsApi');
      await archiveProfessionalById(proToArchive.id);
    }
    setSelectedProfessional(null);
  };

  const handleRestoreProfessional = async (proToRestore) => {
    if (proToRestore.id) {
      const { restoreProfessionalById } = await import('./lib/professionalsApi');
      await restoreProfessionalById(proToRestore.id);
    }
    setSelectedProfessional(null);
  };

  const toggleArchivedProfessionalsView = () => setShowArchivedProfessionals(prev => !prev);

  const handleAddProfessional = async (newPro) => {
    const { createProfessional } = await import('./lib/professionalsApi');
    await createProfessional({ ...newPro, archived: false });
    setIsAdding(false);
  };

  const handleAcceptOffer = async (clientName, propertyName) => {
    await createNewSalesProgression(clientName, propertyName);
    await markPropertyAsMatched(propertyName);
    await updateClientInfo(clientName, { status: "Offer Accepted" });
  };

  const handleCancelMatch = async (clientName, propertyName) => {
    await removeSalesProgressionRow(propertyName, clientName);

    const client = clients.find(c => c.name === clientName);
    if (client?.id) {
      const { updateClientById } = await import("./lib/clientsApi");
      const updatedProperties = client.properties?.filter(p => p.name !== propertyName) || [];
      await updateClientById(client.id, { properties: updatedProperties });
    }

    const property = properties.find(p => p.name === propertyName);
    if (property?.id) {
      const { updatePropertyById } = await import("./lib/propertiesApi");
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
      const { updateClientById } = await import("./lib/clientsApi");
      await updateClientById(client.id, updatedClient);
    }

    // Update sales progressions with new client name
    const progressionsToUpdate = salesProgressions.filter(row => row.client === originalName);
    for (const progression of progressionsToUpdate) {
      if (progression.id) {
        const { updateSalesProgressionById } = await import("./lib/salesProgressionsApi");
        await updateSalesProgressionById(progression.id, { client: updatedClient.name });
      }
    }

    // Update properties with new client name
    const propertiesToUpdate = properties.filter(p => p.linkedClient === originalName);
    for (const property of propertiesToUpdate) {
      if (property.id) {
        const { updatePropertyById } = await import("./lib/propertiesApi");
        await updatePropertyById(property.id, { linkedClient: updatedClient.name });
      }
    }

    setSelectedClient(updatedClient);
  };

  return (
    <div className="contacts-container">
      {!selectedClient && !selectedProfessional && (
        <Sidebar
          title="Contacts"
          items={[
            {
              key: "clients",
              label: "Clients",
              icon: "👤",
              active: subPage === "Clients",
              onClick: () => setSubPage("Clients"),
            },
            {
              key: "professionals",
              label: "Professionals",
              icon: "👤",
              active: subPage === "Professionals",
              onClick: () => setSubPage("Professionals"),
            },
          ]}
        />
      )}

      <div className="contacts-main">
        {subPage === "Clients" && !selectedClient && (
          <>
            <ClientsTable
              clients={clients.filter((c) => c.archived === showArchived)}
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
            updateClientProperties={updateClientProperties}
            setProperties={setProperties}
            allProperties={properties}
            updatePropertyLinkage={async (propertyName, clientName) => {
              const property = properties.find(p => p.name === propertyName);
              if (property?.id) {
                const { updatePropertyById } = await import("./lib/propertiesApi");
                await updatePropertyById(property.id, { linkedClient: clientName });
              }
            }}
            handleAcceptOffer={handleAcceptOffer}
            updatePropertyOffer={updatePropertyOffer}
            removeSalesProgressionRow={removeSalesProgressionRow}
            handleCancelMatch={handleCancelMatch}
            updateClientInfo={updateClientInfo}
          />
        )}

        {subPage === "Professionals" && !selectedProfessional && (
          <>
            <ProfessionalsTable
              professionals={professionals.filter((p) => p.archived === showArchivedProfessionals)}
              onArchiveProfessional={handleArchiveProfessional}
              onRestoreProfessional={handleRestoreProfessional}
              onToggleView={toggleArchivedProfessionalsView}
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
          />
        )}
      </div>
    </div>
  );
}

export default Contacts;