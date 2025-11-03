// import { useState, useEffect, useCallback, useRef } from "react";
// import { useTranslation } from "react-i18next";
// import { useSQLite } from "~/providers/RealContextProvider";
// import { useAuth } from "~/lib/hooks/useAuth";
// import { useDataSync } from "~/services/dataSync";
// import { isOnline } from "~/services/network";

// import {
//   SurveySubmission,
//   parseSQLiteRow,
//   syncPendingSubmissions,
//   fetchSurveySubmissionsFromRemote,
// } from "~/services/survey-submission";

// /**
//  * Hook to get all survey submissions with auto-sync and database lock prevention
//  */
// export const useGetAllSurveySubmissions = (forceSync: boolean = false) => {
//   const { user, isLoggedIn } = useAuth({});
//   const { getAll, update, create, deleteAll } = useSQLite();
//   const { t } = useTranslation();
//   const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
//   const [isOffline, setIsOffline] = useState(false);
//   const [isRefreshing, setIsRefreshing] = useState(false);


//   // Use a ref to track ongoing operations and prevent concurrent database access
//   const operationLock = useRef(false);
//   const userIdFilter = user?.id.toString() || user?.json?.id.toString() || "";
//   const userId = user?.id|| user?.json?.id;
//   const loginStatus = Promise.resolve(isLoggedIn);
//   const { syncStatus, refresh } = useDataSync([
//     {
//       key: `surveySubmissions-${userId}`,
//       fetchFn: async () => fetchSurveySubmissionsFromRemote(userIdFilter ,await loginStatus),
//       tableName: "SurveySubmissions",
//       staleTime: 5 * 60 * 1000,
//       forceSync,
//     },
//   ]);

//   /**
//    * Load submissions from SQLite with lock protection
//    */
//   const loadFromSQLite = useCallback(async () => {
//     // Wait if another operation is in progress
//     if (operationLock.current) {
//       console.log("Operation already in progress, waiting...");
//       return;
//     }

//     operationLock.current = true;

//     try {
//       const rows = await getAll("SurveySubmissions");
//       const parsed = rows.map(parseSQLiteRow);
//       const userRows = parsed.filter(
//         (s: SurveySubmission) => s.created_by_user_id === userId
//       );
//       setSubmissions(userRows);
//       console.log(`Loaded ${userRows.length} submissions from SQLite`);
//     } catch (err) {
//       console.error("Failed to load submissions:", err);
//     } finally {
//       operationLock.current = false;
//     }
//   }, [getAll, userId]);

//   // /**
//   //  * Safe deletion that waits for locks
//   //  */
//   // const safeDeleteAll = useCallback(async () => {
//   //   // Wait for any ongoing operations
//   //   let attempts = 0;
//   //   const maxAttempts = 10;

//   //   while (operationLock.current && attempts < maxAttempts) {
//   //     console.log(`Waiting for operation to complete (attempt ${attempts + 1}/${maxAttempts})...`);
//   //     await new Promise(resolve => setTimeout(resolve, 500));
//   //     attempts++;
//   //   }

//   //   if (operationLock.current) {
//   //     console.error("Could not acquire lock for deletion after multiple attempts");
//   //     return false;
//   //   }

//   //   operationLock.current = true;

//   //   try {
//   //     await deleteAll("SurveySubmissions");
//   //     console.log("Successfully deleted all records from SurveySubmissions");
//   //     return true;
//   //   } catch (error) {
//   //     console.error("Error deleting all records from SurveySubmissions:", error);
//   //     return false;
//   //   } finally {
//   //     operationLock.current = false;
//   //   }
//   // }, [deleteAll]);

//   /**
//    * Sync remote data to local database with lock protection
//    */
//   const syncRemoteToLocal = useCallback(async () => {
//     if (operationLock.current) {
//       console.log("Sync already in progress, skipping...");
//       return;
//     }

//     operationLock.current = true;
//     setIsRefreshing(true);

//     try {
//       const online = isOnline();
//       setIsOffline(!online);
//       const loginStatus = await Promise.resolve(isLoggedIn);
//       if (online && loginStatus) {
//         console.log("Fetching remote submissions...");

//         // First, try to sync any pending local changes
//         await syncPendingSubmissions(getAll, update, t, userId);

//         // Then refresh from remote
//         await refresh(`SurveySubmissions`, forceSync);

//         // Finally, reload from SQLite
//         // Release lock temporarily for the load operation
//         operationLock.current = false;
//         await loadFromSQLite();
//       }
//     } catch (error) {
//       console.error("Error during sync:", error);
//     } finally {
//       operationLock.current = false;
//       setIsRefreshing(false);
//     }
//   }, [refresh, loadFromSQLite, forceSync, userId, getAll, update, t]);

//   /**
//    * Initial load
//    */
//   useEffect(() => {
//     loadFromSQLite();
//   }, [loadFromSQLite]);

//   /**
//    * Auto-sync on mount and when forceSync changes
//    */
//   useEffect(() => {
//     if (!isLoggedIn || !userId) {
//       console.log("[useGetAllSurveySubmissions] Skipping sync — user not logged in yet");
//       return;
//     }
//     console.log("[useGetAllSurveySubmissions] User logged in, starting sync...");
//     syncRemoteToLocal();
//   }, [forceSync, userId, isLoggedIn]);

//   /**
//    * Manual sync function
//    */
//   const manualSync = useCallback(async () => {
//     const online = isOnline();
//     if (!online) {
//       console.warn("Cannot sync while offline");
//       return { synced: 0, failed: 0, errors: [] };
//     }

//     if (isRefreshing) {
//       console.warn("Sync already in progress");
//       return { synced: 0, failed: 0, errors: [] };
//     }

//     console.log("Manual sync triggered...");
//     setIsRefreshing(true);

//     try {
//       // Sync pending submissions
//       const syncResult = await syncPendingSubmissions(getAll, update, t, userId);

//       // Refresh from remote
//       await refresh(`surveySubmissions-${userId}`, true);

//       // Reload from SQLite
//       await loadFromSQLite();

//       console.log("Manual sync complete");
//       return syncResult;
//     } catch (error) {
//       console.error("Error during manual sync:", error);
//       return { synced: 0, failed: 0, errors: [error instanceof Error ? error.message : "Unknown error"] };
//     } finally {
//       setIsRefreshing(false);
//     }
//   }, [getAll, update, refresh, loadFromSQLite, userId, t, isRefreshing]);

//   return {
//     submissions,
//     isLoading: syncStatus[`surveySubmissions-${userId}`]?.isLoading || false,
//     isRefreshing,
//     error: syncStatus[`surveySubmissions-${userId}`]?.error || null,
//     lastSyncTime: syncStatus[`surveySubmissions-${userId}`]?.lastSyncTime || null,
//     isOffline,
//     refresh: manualSync,
//     // safeDeleteAll, Expose safe delete function if needed
//   };
// };
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSQLite } from "~/providers/RealContextProvider";
import { useAuth } from "~/lib/hooks/useAuth";
import { useDataSync } from "~/services/dataSync";
import { isOnline } from "~/services/network";

import {
  SurveySubmission,
  parseSQLiteRow,
  syncPendingSubmissions,
  fetchSurveySubmissionsFromRemote,
  toSQLiteRow,
} from "~/services/survey-submission";

/**
 * Hook to get all survey submissions with auto-sync and database lock prevention
 */
export const useGetAllSurveySubmissions = (forceSync: boolean = false) => {
  const { user, isLoggedIn } = useAuth({});
  const { getAll, update, create, deleteAll } = useSQLite();
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use a ref to track ongoing operations and prevent concurrent database access
  const operationLock = useRef(false);
  const userIdFilter = user?.id.toString() || user?.json?.id.toString() || "";
  const userId = user?.id || user?.json?.id;

  /**
   * Load submissions from SQLite with lock protection
   */
  const loadFromSQLite = useCallback(async () => {
    try {
      const rows = await getAll("SurveySubmissions");
      const parsed = rows.map(parseSQLiteRow);
      
      const userRows = parsed.filter(
        (s: SurveySubmission) => String(s.created_by_user_id) === String(userId)
      );
      if (userRows.length === 0) {
        console.log("No submissions found for user in SQLite.");
        safeDeleteAll();
      }
      setSubmissions(userRows);
      console.log(`Loaded ${parsed.length} submissions from SQLite`);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      operationLock.current = false;
    }
  }, [getAll, userId]);

   const safeDeleteAll = useCallback(async () => {
    // Wait for any ongoing operations
    let attempts = 0;
    const maxAttempts = 10;

    while (operationLock.current && attempts < maxAttempts) {
      console.log(`Waiting for operation to complete (attempt ${attempts + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (operationLock.current) {
      console.error("Could not acquire lock for deletion after multiple attempts");
      return false;
    }

    operationLock.current = true;

    try {
      await deleteAll("SurveySubmissions");
      console.log("Successfully deleted all records from SurveySubmissions");
      return true;
    } catch (error) {
      console.error("Error deleting all records from SurveySubmissions:", error);
      return false;
    } finally {
      operationLock.current = false;
    }
  }, [deleteAll]);

  /**
   * Save fetched remote data to SQLite
   */
  const saveRemoteDataToSQLite = useCallback(async (remoteData: any[]) => {
    if (!remoteData || remoteData.length === 0) {
      console.log("No remote data to save");
      return;
    }

    console.log(`Saving ${remoteData.length} submissions to SQLite...`);

    try {
      // Get existing submissions to avoid duplicates
      const existingRows = await getAll("SurveySubmissions");
      const existingIds = new Set(existingRows.map((row: any) => row.id));

      let savedCount = 0;
      let updatedCount = 0;

      for (const remoteRow of remoteData) {
        try {
          // Check if this submission already exists
          const existingSubmission = existingRows.find(
            (row: any) => row.id === remoteRow.id
          );

          if (existingSubmission) {
            // Update existing submission
            await update("SurveySubmissions", existingSubmission._id, {
              ...remoteRow,
              // Preserve local modifications
              is_modified: existingSubmission.is_modified || remoteRow.is_modified,
              needs_update_sync: existingSubmission.needs_update_sync || remoteRow.needs_update_sync,
            });
            updatedCount++;
          } else {
            // Create new submission
            await create("SurveySubmissions", remoteRow);
            savedCount++;
          }
        } catch (error) {
          console.error(`Failed to save submission ${remoteRow._id}:`, error);
        }
      }

      console.log(`✅ Saved ${savedCount} new submissions, updated ${updatedCount} existing ones`);
    } catch (error) {
      console.error("Error saving remote data to SQLite:", error);
      throw error;
    }
  }, [getAll, create, update]);

  /**
   * Sync remote data to local database with lock protection
   */
  const syncRemoteToLocal = useCallback(async () => {
    if (operationLock.current) {
      console.log("Sync already in progress, skipping...");
      return;
    }

    operationLock.current = true;
    setIsRefreshing(true);

    try {
      const online = isOnline();
      setIsOffline(!online);

      if (online && isLoggedIn) {
        console.log("Fetching remote submissions...");

        // First, try to sync any pending local changes
        await syncPendingSubmissions(getAll, update, t, userId);

        // Fetch remote data
        const remoteData = await fetchSurveySubmissionsFromRemote(userIdFilter,await isLoggedIn);

        // Save remote data to SQLite
        if (remoteData && remoteData.length > 0) {
          await saveRemoteDataToSQLite(remoteData);
        }

        // Finally, reload from SQLite
        operationLock.current = false;
        await loadFromSQLite();
      } else {
        console.log("Offline or not logged in, loading from local SQLite only");
        operationLock.current = false;
        await loadFromSQLite();
      }
    } catch (error) {
      console.error("Error during sync:", error);
    } finally {
      operationLock.current = false;
      setIsRefreshing(false);
    }
  }, [
    loadFromSQLite,
    saveRemoteDataToSQLite,
    userIdFilter,
    userId,
    getAll,
    update,
    t,
    isLoggedIn,
  ]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadFromSQLite();
  }, [loadFromSQLite]);

  /**
   * Auto-sync on mount and when forceSync changes
   */
  useEffect(() => {
    if (!isLoggedIn || !userId) {
      console.log("[useGetAllSurveySubmissions] Skipping sync — user not logged in yet");
      return;
    }
    console.log("[useGetAllSurveySubmissions] User logged in, starting sync...");
    syncRemoteToLocal();
  }, [forceSync, userId, isLoggedIn, syncRemoteToLocal]);

  /**
   * Manual sync function
   */
  const manualSync = useCallback(async () => {
    const online = isOnline();
    if (!online) {
      console.warn("Cannot sync while offline");
      return { synced: 0, failed: 0, errors: [] };
    }

    if (isRefreshing) {
      console.warn("Sync already in progress");
      return { synced: 0, failed: 0, errors: [] };
    }

    console.log("Manual sync triggered...");
    setIsRefreshing(true);

    try {
      // Sync pending submissions
      const syncResult = await syncPendingSubmissions(getAll, update, t, userId);

      // Fetch and save remote data
      const remoteData = await fetchSurveySubmissionsFromRemote(userIdFilter,await isLoggedIn);
      if (remoteData && remoteData.length > 0) {
        await saveRemoteDataToSQLite(remoteData);
      }

      // Reload from SQLite
      await loadFromSQLite();

      console.log("Manual sync complete");
      return syncResult;
    } catch (error) {
      console.error("Error during manual sync:", error);
      return {
        synced: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    } finally {
      setIsRefreshing(false);
    }
  }, [
    getAll,
    update,
    loadFromSQLite,
    saveRemoteDataToSQLite,
    userIdFilter,
    userId,
    t,
    isRefreshing,
    isLoggedIn,
  ]);

  return {
    submissions,
    isLoading: isRefreshing,
    isRefreshing,
    error: null,
    lastSyncTime: null,
    isOffline,
    refresh: manualSync,
    safeDeleteAll
  };
};