import React, { useState } from "react";
import ClientsTable from "./ClientsTable";
import ClientPage from "./ClientPage";
import ProfessionalsTable from "./ProfessionalsTable";
import ProfessionalPage from "./ProfessionalPage";
import "./Contacts.css";

function Contacts() {
  const [subPage, setSubPage] = useState("Clients");
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);

  // ✅ Clients
  const [newClient, setNewClient] = useState({
    name: "",
    brief: "",
    maxBudget: "",
    phoneNumber: ""
  });

  const [clients, setClients] = useState([
    {
      name: "Joe Bloggs",
      status: "✓✓✓",
      brief: "Latham / Chaucer rd area",
      maxBudget: "£10,000,000",
      phoneNumber: "+44 7795 528957",
      archived: false
    },
    {
      name: "Steven Gerrard",
      status: "✓✓✓",
      brief: "CB1, near The Leys",
      maxBudget: "",
      phoneNumber: "",
      archived: false
    },
    {
      name: "Ricky Gervais",
      status: "✘✘✘",
      brief: "CB4 area, De Freville",
      maxBudget: "",
      phoneNumber: "",
      archived: false
    },
    {
      name: "Fernando Torres",
      status: "—",
      brief: "",
      maxBudget: "",
      phoneNumber: "",
      archived: false
    }
  ]);

  const [showArchived, setShowArchived] = useState(false);

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

  const toggleArchivedView = () => {
    setShowArchived((prev) => !prev);
  };

  // ✅ Professionals
  const [professionals, setProfessionals] = useState([
    {
      name: "John Smith",
      company: "Smith & Co Solicitors",
      phoneNumber: "+44 7123 456789",
      email: "john@smithco.com",
      currentClient: "Joe Bloggs",
      clientHistory: ["Steven Gerrard", "Ricky Gervais"],
      archived: false
    },
    {
      name: "Emily White",
      company: "White & Partners",
      phoneNumber: "+44 7987 654321",
      email: "emily@whitepartners.com",
      currentClient: null,
      clientHistory: ["Fernando Torres"],
      archived: false
    }
  ]);

  const [showArchivedProfessionals, setShowArchivedProfessionals] =
    useState(false);

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

  const toggleArchivedProfessionalsView = () => {
    setShowArchivedProfessionals((prev) => !prev);
  };

  const AddClientForm = ({ onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>New Client</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setClients([
                ...clients,
                { ...newClient, status: "—", archived: false }
              ]);
              setNewClient({
                name: "",
                brief: "",
                maxBudget: "",
                phoneNumber: ""
              });
              onClose();
            }}
          >
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newClient.name}
                onChange={(e) =>
                  setNewClient({ ...newClient, name: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Brief</label>
              <input
                type="text"
                value={newClient.brief}
                onChange={(e) =>
                  setNewClient({ ...newClient, brief: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Max Budget</label>
              <input
                type="text"
                value={newClient.maxBudget}
                onChange={(e) =>
                  setNewClient({ ...newClient, maxBudget: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                value={newClient.phoneNumber}
                onChange={(e) =>
                  setNewClient({ ...newClient, phoneNumber: e.target.value })
                }
              />
            </div>
            <div className="form-buttons">
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="save-btn">
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
            className={`sidebar-btn ${
              subPage === "Professionals" ? "active" : ""
            }`}
          >
            👤 Professionals
          </button>
        </div>
      )}

      <div className="contacts-main">
        {subPage === "Clients" && !selectedClient && (
          <div>
            <ClientsTable
              clients={clients.filter((c) => c.archived === showArchived)}
              onNewClientClick={() => setShowForm(true)}
              onArchiveClient={handleArchiveClient}
              onRestore={handleRestoreClient}
              onToggleView={toggleArchivedView}
              showArchived={showArchived}
              onRowClick={(client) => setSelectedClient(client)}
            />
            {showForm && <AddClientForm onClose={() => setShowForm(false)} />}
          </div>
        )}
        {subPage === "Clients" && selectedClient && (
          <ClientPage
            client={selectedClient}
            onBack={() => setSelectedClient(null)}
          />
        )}

        {subPage === "Professionals" && !selectedProfessional && (
          <ProfessionalsTable
            professionals={professionals.filter(
              (p) => p.archived === showArchivedProfessionals
            )}
            onArchiveProfessional={handleArchiveProfessional}
            onRestoreProfessional={handleRestoreProfessional}
            onToggleView={toggleArchivedProfessionalsView}
            showArchived={showArchivedProfessionals}
            onRowClick={(pro) => setSelectedProfessional(pro)}
          />
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