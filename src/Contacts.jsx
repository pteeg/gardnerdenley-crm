import React, { useState } from "react";
import ClientsTable from "./ClientsTable";
import ClientPage from "./ClientPage";
import ProfessionalsTable from "./ProfessionalsTable";
import ProfessionalPage from "./ProfessionalPage";
import NewProfessionalModal from "./NewProfessionalModal";
import "./Contacts.css";
import AddClientForm from "./AddClientForm";

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

  const handleArchiveClient = (clientToArchive) => {
    setClients(
      clients.map((c) =>
        c.name === clientToArchive.name ? { ...c, archived: true } : c
      )
    );
    setSelectedClient(null);
  };

  const handleRestoreClient = (clientToRestore) => {
    setClients(
      clients.map((c) =>
        c.name === clientToRestore.name ? { ...c, archived: false } : c
      )
    );
    setSelectedClient(null);
  };

  const updateClientStatus = (clientName, newStatus) => {
    setClients(prevClients =>
      prevClients.map(client =>
        client.name === clientName
          ? {
              ...client,
              status: newStatus,
              archived: false
            }
          : client
      )
    );
  };

  const updatePropertyOffer = (propertyName, update) => {
    setProperties(prev =>
      prev.map(p =>
        p.name === propertyName
          ? {
              ...p,
              ...update,
              ...(update.offerStatus === "Accepted" ? { status: "Matched" } : {})
            }
          : p
      )
    );

    if (update.offerStatus === "Accepted") {
      const acceptedProperty = properties.find(p => p.name === propertyName);
      setSalesProgressions(prev => [
        ...prev,
        // ✅ Use helper so defaults = "Not Done"
        createNewSalesProgression(
          acceptedProperty?.linkedClient || "",
          acceptedProperty?.name || ""
        )
      ]);
    }
  };

  const updateClientProperties = (clientName, updatedProperties) => {
    setClients(prevClients =>
      prevClients.map(client =>
        client.name === clientName
          ? { ...client, properties: updatedProperties }
          : client
      )
    );
  };

  const toggleArchivedView = () => setShowArchived(prev => !prev);

  const handleArchiveProfessional = (proToArchive) => {
    setProfessionals(
      professionals.map((p) =>
        p.name === proToArchive.name ? { ...p, archived: true } : p
      )
    );
    setSelectedProfessional(null);
  };

  const handleRestoreProfessional = (proToRestore) => {
    setProfessionals(
      professionals.map((p) =>
        p.name === proToRestore.name ? { ...p, archived: false } : p
      )
    );
    setSelectedProfessional(null);
  };

  const toggleArchivedProfessionalsView = () => setShowArchivedProfessionals(prev => !prev);

  const handleAddProfessional = (newPro) => {
    setProfessionals([...professionals, { ...newPro, archived: false }]);
    setIsAdding(false);
  };

  const handleAcceptOffer = (clientName, propertyName) => {
    setSalesProgressions(prev => [
      ...prev,
      createNewSalesProgression(clientName, propertyName) // ✅ Use centralised function
    ]);

    // ✅ Also mark the property as matched
    markPropertyAsMatched(propertyName);

    // ✅ Optionally, update client info if needed (optional)
    updateClientInfo(clientName, { status: "Offer Accepted" });
  };

  const handleCancelMatch = (clientName, propertyName) => {
    removeSalesProgressionRow(propertyName, clientName);

    setClients(prev =>
      prev.map(c =>
        c.name === clientName
          ? {
              ...c,
              properties: c.properties.filter(p => p.name !== propertyName)
            }
          : c
      )
    );

    setProperties(prev =>
      prev.map(p =>
        p.name === propertyName
          ? {
              ...p,
              linkedClient: "",
              status: "On Market",
              offerStatus: "None"
            }
          : p
      )
    );
  };

  const updateClientInfo = (originalName, updatedClient) => {
    setClients(prev =>
      prev.map(c => c.name === originalName ? updatedClient : c)
    );

    setSalesProgressions(prev =>
      prev.map(row =>
        row.client === originalName
          ? { ...row, client: updatedClient.name }
          : row
      )
    );

    setProperties(prev =>
      prev.map(p =>
        p.linkedClient === originalName
          ? { ...p, linkedClient: updatedClient.name }
          : p
      )
    );

    setSelectedClient(updatedClient);
  };

  return (
    <div className="contacts-container">
      {!selectedClient && !selectedProfessional && (
        <div className="contacts-sidebar">
          <div className="sidebar-title">CONTACTS</div>
          <button
            onClick={() => setSubPage("Clients")}
            className={`sidebar-btn ${subPage === "Clients" ? "active" : ""}`}
          >
            👤 Clients
          </button>
          <button
            onClick={() => setSubPage("Professionals")}
            className={`sidebar-btn ${subPage === "Professionals" ? "active" : ""}`}
          >
            👤 Professionals
          </button>
        </div>
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
                onSave={(newClient) => {
                  setClients((prev) => [...prev, { ...newClient, archived: false, properties: [] }]);
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
            updatePropertyLinkage={(propertyName, clientName) => {
              setProperties(prev =>
                prev.map(p =>
                  p.name === propertyName ? { ...p, linkedClient: clientName } : p
                )
              );
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