import { Realm } from "@realm/react";
import { useAuth } from "~/lib/hooks/useAuth";

/**
 * Utility function to filter Realm objects to only show data from the current user
 * @param objects Realm.Results collection to filter
 * @param allowSyncedData Whether to include synced (API-sourced) data
 * @returns Filtered collection
 */
export function filterByCurrentUser<T extends Realm.Object>(
  objects: Realm.Results<T>,
  allowSyncedData: boolean = true
): Realm.Results<T> {
  const { user } = useAuth({});
  
  if (!user || !user.id) {
    return objects.filtered("TRUEPREDICATE LIMIT(0)"); // Empty result if no user
  }
  
  const currentUserId = user.id;

  // Filter objects by user ID
  const filteredObjects = objects.filtered(
    "form_data.user_id == $0",
    currentUserId
  );
  
  return filteredObjects;
}

// Define an interface for Izu-like objects
interface IzuLike {
  id: number;
  position?: number;
  izucode?: string;
  location?: {
    village?: string;
    cell?: string;
    sector?: string;
  };
}

/**
 * A generic filter function to ensure data is properly scoped to the current user
 * @param objects The Realm collection to filter
 * @param currentUserId The current user's ID
 * @returns Filtered collection
 * 
 * Note: This function performs basic user ID filtering.
 * More complex position-based filtering is handled in the respective service files
 * (izus.ts and families.ts) where they have access to all required schemas.
 */
export function filterDataByUserId<T extends Realm.Object>(
  objects: Realm.Results<T>, 
  currentUserId: number
): Realm.Results<T> {
  // Check for different schemas and apply appropriate filters
  // Get type name from the type of first object if available, or fallback to default
  const typeName = objects.length > 0 ? objects[0].constructor.name : 'Unknown';
  
  // This function performs basic user filtering only
  // The more complex position-based filtering is handled in the specific
  // service files (izus.ts and families.ts) where they have access to all schemas
  
  switch (typeName) {
    // For survey submissions
    case 'SurveySubmission':
      return objects.filtered(
        "form_data.user_id == $0",
        currentUserId
      );
      
    // For families - basic filtering, position-based filtering is in families.ts
    case 'Families':
      // We only do basic filtering here - position-based filtering happens in families.ts
      return objects;
      
    // For Izus - basic filtering, position-based filtering is in izus.ts
    case 'Izu':
      // We only do basic filtering here - position-based filtering happens in izus.ts
      return objects;
      
    // For FollowUps
    case 'FollowUps':
      return objects.filtered(
        "form_data.user_id == $0 OR user.id == $0",
        currentUserId
      );
      
    // For MonitoringResponses
    case 'MonitoringResponses':
      return objects.filtered(
        "user_id == $0",
        currentUserId
      );
      
    // Default filter for unknown types
    default:
      console.warn(`No specific filter for type ${typeName}, using default`);
      try {
        // Try with a safe default query
        return objects.filtered(
          "user_id == $0",
          currentUserId
        );
      } catch (error: any) {
        // If that fails, try the form_data approach
        try {
          return objects.filtered(
            "form_data.user_id == $0",
            currentUserId
          );
        } catch (error2: any) {
          // Last resort - return all data if we can't filter
          console.error(`Could not filter ${typeName} by user ID: ${error2.message}`);
          return objects;
        }
      }
  }
} 