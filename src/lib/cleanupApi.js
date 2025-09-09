import { collection, getDocs, doc } from "firebase/firestore";
import { db } from "./firebase";

export async function cleanupOldSalesProgressions() {
  try {
    const salesProgressionsCol = collection(db, "salesProgressions");
    const snapshot = await getDocs(salesProgressionsCol);
    
    const docsToMigrate = [];
    
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      // If old structure where 'id' (status) was persisted in the document body, migrate it
      if (
        data.id &&
        (data.id === "Done" || data.id === "Not Done" || data.id === "Pending") &&
        !data.clientIdDocument
      ) {
        docsToMigrate.push({ docId: docSnapshot.id, data });
      }
    });

    // Migrate documents with old structure
    for (const { docId, data } of docsToMigrate) {
      const { updateDoc } = await import("firebase/firestore");
      const docRef = doc(db, "salesProgressions", docId);
      await updateDoc(docRef, {
        clientIdDocument: data.id, // Move the status value to clientIdDocument
        // Never write over the Firestore document ID field in our payload
        // Remove the incorrect 'id' field from the document body
        id: docId
      });
      console.log(`Migrated sales progression document: ${docId}`);
    }

    console.log(`Migrated ${docsToMigrate.length} sales progression documents`);
    return docsToMigrate.length;
  } catch (error) {
    console.error("Error cleaning up old sales progressions:", error);
    return 0;
  }
}
