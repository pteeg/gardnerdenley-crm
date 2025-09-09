import { collection, addDoc, doc, updateDoc, onSnapshot, query, where } from "firebase/firestore";
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


