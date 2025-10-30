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
} from "~/services/survey-submission";

/**
 * Hook to get all survey submissions with auto-sync and database lock prevention
 */
export const useGetAllSurveySubmissions = (forceSync: boolean = false) => {
  const { user } = useAuth({});
  const { getAll, update, create, deleteAll } = useSQLite();
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use a ref to track ongoing operations and prevent concurrent database access
  const operationLock = useRef(false);
  const userId = user?.id || user?.json?.id;

  const { syncStatus, refresh } = useDataSync([
    {
      key: `surveySubmissions-${userId}`,
      fetchFn: async () => fetchSurveySubmissionsFromRemote(),
      tableName: "SurveySubmissions",
      staleTime: 5 * 60 * 1000,
      forceSync,
    },
  ]);

  /**
   * Load submissions from SQLite with lock protection
   */
  const loadFromSQLite = useCallback(async () => {
    // Wait if another operation is in progress
    if (operationLock.current) {
      console.log("Operation already in progress, waiting...");
      return;
    }

    operationLock.current = true;
    
    try {
      const rows = await getAll("SurveySubmissions");
      const parsed = rows.map(parseSQLiteRow);
      const userRows = parsed.filter(
        (s: SurveySubmission) => s.created_by_user_id === userId
      );
      setSubmissions(userRows);
      console.log(`Loaded ${userRows.length} submissions from SQLite`);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      operationLock.current = false;
    }
  }, [getAll, userId]);

  /**
   * Safe deletion that waits for locks
   */
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
      
      if (online) {
        console.log("Fetching remote submissions...");
        
        // First, try to sync any pending local changes
        await syncPendingSubmissions(getAll, update, t, userId);
        
        // Then refresh from remote
        await refresh(`surveySubmissions-${userId}`, forceSync);
        
        // Finally, reload from SQLite
        // Release lock temporarily for the load operation
        operationLock.current = false;
        await loadFromSQLite();
      }
    } catch (error) {
      console.error("Error during sync:", error);
    } finally {
      operationLock.current = false;
      setIsRefreshing(false);
    }
  }, [refresh, loadFromSQLite, forceSync, userId, getAll, update, t]);

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
    syncRemoteToLocal();
  }, [forceSync, userId]);

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
      
      // Refresh from remote
      await refresh(`surveySubmissions-${userId}`, true);
      
      // Reload from SQLite
      await loadFromSQLite();
      
      console.log("Manual sync complete");
      return syncResult;
    } catch (error) {
      console.error("Error during manual sync:", error);
      return { synced: 0, failed: 0, errors: [error instanceof Error ? error.message : "Unknown error"] };
    } finally {
      setIsRefreshing(false);
    }
  }, [getAll, update, refresh, loadFromSQLite, userId, t, isRefreshing]);

  return {
    submissions,
    isLoading: syncStatus[`surveySubmissions-${userId}`]?.isLoading || false,
    isRefreshing,
    error: syncStatus[`surveySubmissions-${userId}`]?.error || null,
    lastSyncTime: syncStatus[`surveySubmissions-${userId}`]?.lastSyncTime || null,
    isOffline,
    refresh: manualSync,
    safeDeleteAll, // Expose safe delete function if needed
  };
};