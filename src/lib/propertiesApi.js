import { collection, addDoc, doc, updateDoc, onSnapshot, query, where, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

const propertiesCol = collection(db, "properties");

export function subscribeToProperties({ includeArchived = true }, callback) {
  const q = includeArchived ? propertiesCol : query(propertiesCol, where("archived", "==", false));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

export async function createProperty(property) {
  const payload = {
    name: property.name,
    brief: property.brief || property.description || "",
    price: property.price || "",
    status: property.status || (property.onMarket ? "On Market" : "Off Market"),
    archived: false,
    favourite: Boolean(property.favourite) || false,
    linkedClient: property.linkedClient || "",
    address: property.address || "",
    offerStatus: property.offerStatus || null,
    offerAmount: property.offerAmount || null,
    vendor: property.vendor || "",
    createdAt: Date.now(),
  };
  const ref = await addDoc(propertiesCol, payload);
  return ref.id;
}

export async function updatePropertyById(id, updates) {
  const ref = doc(db, "properties", id);
  await updateDoc(ref, updates);
}

export async function toggleArchiveProperty(id, archived) {
  await updatePropertyById(id, { archived });
}

export async function deletePropertyById(id) {
  const ref = doc(db, "properties", id);
  await deleteDoc(ref);
}


