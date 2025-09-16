import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const salesProgressionsCol = collection(db, "salesProgressions");

export function subscribeToSalesProgressions({ includeCompleted = true }, callback) {
  console.log("Setting up sales progressions subscription, includeCompleted:", includeCompleted);
  const q = includeCompleted ? salesProgressionsCol : query(salesProgressionsCol, where("dealComplete", "==", false));
  return onSnapshot(q, 
    (snap) => {
      console.log("Sales progressions snapshot received, docs count:", snap.docs.length);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      console.log("Mapped sales progressions list:", list);
      callback(list);
    },
    (error) => {
      console.error("Error in sales progressions subscription:", error);
    }
  );
}

export async function createSalesProgression(progression) {
  const payload = {
    client: progression.client || "",
    address: progression.address || "",
    contractSent: progression.contractSent || "Not Done",
    contractSigned: progression.contractSigned || "Not Done",
    clientIdDocument: progression.clientIdDocument || "Not Done",
    aml: progression.aml || "Not Done",
    solicitorRecommended: progression.solicitorRecommended || "Not Done",
    solicitorEngaged: progression.solicitorEngaged || "Not Done",
    solicitorDetails: progression.solicitorDetails || "",
    mortgageAdvisorRecommended: progression.mortgageAdvisorRecommended || "Not Done",
    mortgageAdvisorDetails: progression.mortgageAdvisorDetails || "",
    mortgageValBooked: progression.mortgageValBooked || "Not Done",
    surveyorRecommended: progression.surveyorRecommended || "Not Done",
    surveyorDetails: progression.surveyorDetails || "",
    surveyBooked: progression.surveyBooked || "Not Done",
    sdltAdvisorRecommended: progression.sdltAdvisorRecommended || "Not Done",
    targetExchangeDate: progression.targetExchangeDate || "",
    targetCompletionDate: progression.targetCompletionDate || "",
    removalsRecommended: progression.removalsRecommended || "Not Done",
    removalsBooked: progression.removalsBooked || "Not Done",
    exchangeDateSet: progression.exchangeDateSet || "",
    completionDateSet: progression.completionDateSet || "",
    exchanged: progression.exchanged || "Not Done",
    invoiceSent: progression.invoiceSent || "Not Done",
    invoicePaid: progression.invoicePaid || "Not Done",
    paymentExpected: progression.paymentExpected || "",
    invoiceAmount: progression.invoiceAmount || "",
    dealComplete: progression.dealComplete || false,
    createdAt: Date.now(),
  };
  const ref = await addDoc(salesProgressionsCol, payload);
  return ref.id;
}

export async function updateSalesProgressionById(id, updates) {
  const ref = doc(db, "salesProgressions", id);
  await updateDoc(ref, updates);
  console.log("Sales progression updated with ID:", id, "updates:", updates);
}

export async function deleteSalesProgressionById(id) {
  const ref = doc(db, "salesProgressions", id);
  await deleteDoc(ref);
}

export async function deleteSalesProgressionByClientAndAddress(client, address) {
  const q = query(salesProgressionsCol, where("client", "==", client), where("address", "==", address));
  const snap = await getDocs(q);
  const deletions = [];
  snap.forEach((d) => {
    deletions.push(deleteDoc(doc(db, "salesProgressions", d.id)));
  });
  await Promise.all(deletions);
}

export async function deleteSalesProgressionByAddress(address) {
  const q = query(salesProgressionsCol, where("address", "==", address));
  const snap = await getDocs(q);
  const deletions = [];
  snap.forEach((d) => {
    deletions.push(deleteDoc(doc(db, "salesProgressions", d.id)));
  });
  await Promise.all(deletions);
}
