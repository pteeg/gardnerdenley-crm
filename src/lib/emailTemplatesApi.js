import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

const emailTemplatesCol = collection(db, "emailTemplates");

export function subscribeToEmailTemplates(callback) {
  const q = query(emailTemplatesCol, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

export async function createEmailTemplate(template) {
  const payload = {
    name: template.name || "",
    subject: template.subject || "",
    body: template.body || "",
    createdByEmail: template.createdByEmail || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const ref = await addDoc(emailTemplatesCol, payload);
  return ref.id;
}

export async function updateEmailTemplateById(id, updates) {
  const ref = doc(db, "emailTemplates", id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteEmailTemplateById(id) {
  const ref = doc(db, "emailTemplates", id);
  await deleteDoc(ref);
}

