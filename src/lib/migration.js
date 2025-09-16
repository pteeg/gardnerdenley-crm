import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

const clientsCol = collection(db, "clients");

/**
 * Migration utility to add new fields to existing client records
 * This should be run once to update existing data
 */
export async function migrateClientData() {
  try {
    console.log("Starting client data migration...");
    
    // Get all existing clients
    const snapshot = await getDocs(clientsCol);
    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${clients.length} clients to migrate`);
    
    let migratedCount = 0;
    
    for (const client of clients) {
      const updates = {};
      
      // Add new fields with default values if they don't exist
      if (!client.spouse1FirstName) {
        updates.spouse1FirstName = "";
      }
      if (!client.spouse1Surname) {
        updates.spouse1Surname = "";
      }
      if (!client.spouse2FirstName) {
        updates.spouse2FirstName = "";
      }
      if (!client.spouse2Surname) {
        updates.spouse2Surname = "";
      }
      if (!client.clientSource) {
        updates.clientSource = "";
      }
      if (!client.disposal) {
        updates.disposal = "";
      }
      if (!client.searchStartDate) {
        updates.searchStartDate = "";
      }
      
      // Only update if there are changes needed
      if (Object.keys(updates).length > 0) {
        const clientRef = doc(db, "clients", client.id);
        await updateDoc(clientRef, updates);
        migratedCount++;
        console.log(`Migrated client: ${client.name || client.id}`);
      }
    }
    
    console.log(`Migration completed! Updated ${migratedCount} clients.`);
    return { success: true, migratedCount };
    
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to extract names from existing client name field
 * This can be used to populate spouse fields from existing name data
 */
export function parseClientName(existingName) {
  if (!existingName) return { spouse1FirstName: "", spouse1Surname: "" };
  
  // Try to parse "First Last" format
  const parts = existingName.trim().split(" ");
  if (parts.length >= 2) {
    return {
      spouse1FirstName: parts[0],
      spouse1Surname: parts.slice(1).join(" ")
    };
  }
  
  // If only one part, treat as first name
  return {
    spouse1FirstName: parts[0] || "",
    spouse1Surname: ""
  };
}

/**
 * Run this function in the browser console to migrate data
 * Example: migrateClientData().then(result => console.log(result))
 */
window.migrateClientData = migrateClientData;
