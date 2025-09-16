import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

const clientsCol = collection(db, "clients");

export function subscribeToClients({ includeArchived = true }, callback) {
  const q = includeArchived ? clientsCol : query(clientsCol, where("archived", "==", false));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

export async function createClient(client) {
  const payload = {
    name: client.name,
    phoneNumber: client.phoneNumber || "",
    brief: client.brief || "",
    maxBudget: typeof client.maxBudget === "number" ? client.maxBudget : Number(client.maxBudget || 0),
    status: client.status || "Searching",
    spouse1FirstName: client.spouse1FirstName || "",
    spouse1Surname: client.spouse1Surname || "",
    spouse2FirstName: client.spouse2FirstName || "",
    spouse2Surname: client.spouse2Surname || "",
    clientSource: client.clientSource || "",
    referralContact: client.referralContact || "",
    positionFunding: client.positionFunding || "",
    disposal: client.disposal || "",
    searchStartDate: client.searchStartDate || "",
    archived: false,
    properties: client.properties || [],
    createdAt: Date.now(),
  };
  const ref = await addDoc(clientsCol, payload);
  return ref.id;
}

export async function updateClientById(id, updates) {
  const ref = doc(db, "clients", id);
  await updateDoc(ref, updates);
}

export async function archiveClientById(id) {
  await updateClientById(id, { archived: true });
}

export async function restoreClientById(id) {
  await updateClientById(id, { archived: false });
}

export async function deleteClientById(id) {
  const ref = doc(db, "clients", id);
  await deleteDoc(ref);
}


