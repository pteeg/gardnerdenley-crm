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
    description: property.description || "",
    price: property.price || "",
    status: property.status || (property.onMarket ? "On Market" : "Off Market"),
    archived: false,
    favourite: Boolean(property.favourite) || false,
    linkedClient: property.linkedClient || "",
    address: property.address || "",
    offerStatus: property.offerStatus || null,
    offerAmount: property.offerAmount || null,
    vendor: property.vendor || "",
    ownerDetails: property.ownerDetails || "",
    floorSize: property.floorSize || "",
    bedrooms: property.bedrooms || "",
    bathrooms: property.bathrooms || "",
    style: property.style || "",
    receptions: property.receptions || "",
    parking: property.parking || "",
    land: property.land || "",
    createdAt: Date.now(),
  };
  const ref = await addDoc(propertiesCol, payload);
  return ref.id;
}

export async function updatePropertyById(id, updates) {
  const ref = doc(db, "properties", id);
  // Remove undefined values from updates (Firestore doesn't allow undefined)
  const cleanedUpdates = {};
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      cleanedUpdates[key] = updates[key];
    }
  });
  await updateDoc(ref, cleanedUpdates);
}

export async function toggleArchiveProperty(id, archived) {
  await updatePropertyById(id, { archived });
}

export async function deletePropertyById(id) {
  const ref = doc(db, "properties", id);
  await deleteDoc(ref);
}


