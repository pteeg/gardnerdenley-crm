import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";

const activityLogCol = collection(db, "activityLog");

/**
 * Log an activity to the master log
 * @param {Object} activity - The activity to log
 * @param {string} activity.type - Type of activity: 'note' or 'offer'
 * @param {string} activity.entityType - 'client' or 'property'
 * @param {string} activity.entityName - Name of the client or property
 * @param {string} activity.details - Additional details (note text or offer amount)
 * @param {string} activity.status - Optional status (for offers)
 * @param {string} activity.clientName - Optional client name (for offers that reference both client and property)
 * @param {string} activity.propertyName - Optional property name (for offers that reference both client and property)
 */
export async function logActivity(activity) {
  const logEntry = {
    type: activity.type, // 'note' or 'offer'
    entityType: activity.entityType, // 'client' or 'property'
    entityName: activity.entityName,
    details: activity.details || "",
    status: activity.status || null,
    timestamp: activity.timestamp || new Date().toISOString(), // Use custom timestamp if provided
    createdAt: Date.now(),
  };
  
  // For offers, fallenThrough, notes, and phoneCall, support both clientName and propertyName for filtering
  if (activity.type === "offer" || activity.type === "fallenThrough" || activity.type === "note" || activity.type === "phoneCall") {
    if (activity.clientName) {
      logEntry.clientName = activity.clientName;
    }
    if (activity.propertyName) {
      logEntry.propertyName = activity.propertyName;
    }
  }
  
  try {
    await addDoc(activityLogCol, logEntry);
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

/**
 * Update an existing activity log entry
 * @param {string} activityId - The ID of the activity to update
 * @param {Object} updates - The fields to update
 */
export async function updateActivityLog(activityId, updates) {
  try {
    const ref = doc(db, "activityLog", activityId);
    await updateDoc(ref, updates);
  } catch (error) {
    console.error("Error updating activity log:", error);
  }
}

/**
 * Delete an activity log entry
 * @param {string} activityId - The ID of the activity to delete
 */
export async function deleteActivityLog(activityId) {
  try {
    const ref = doc(db, "activityLog", activityId);
    await deleteDoc(ref);
  } catch (error) {
    console.error("Error deleting activity log:", error);
  }
}

/**
 * Subscribe to activity log entries
 * @param {Function} callback - Callback function that receives the list of activities
 * @param {number} maxEntries - Maximum number of entries to retrieve (default: 500)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToActivityLog(callback, maxEntries = 500) {
  const q = query(activityLogCol, orderBy("createdAt", "desc"), limit(maxEntries));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

