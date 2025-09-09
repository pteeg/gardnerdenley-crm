import { collection, addDoc, doc, updateDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

const professionalsCol = collection(db, "professionals");

export function subscribeToProfessionals({ includeArchived = true }, callback) {
  const q = includeArchived ? professionalsCol : query(professionalsCol, where("archived", "==", false));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

export async function createProfessional(professional) {
  const payload = {
    name: professional.name,
    company: professional.company || "",
    type: professional.type || "",
    archived: false,
    createdAt: Date.now(),
  };
  const ref = await addDoc(professionalsCol, payload);
  return ref.id;
}

export async function updateProfessionalById(id, updates) {
  const ref = doc(db, "professionals", id);
  await updateDoc(ref, updates);
}

export async function archiveProfessionalById(id) {
  await updateProfessionalById(id, { archived: true });
}

export async function restoreProfessionalById(id) {
  await updateProfessionalById(id, { archived: false });
}


