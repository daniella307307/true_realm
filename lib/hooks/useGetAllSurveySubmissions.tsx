import { useState, useEffect, useCallback } from "react";
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
  transformApiSurveySubmissions
} from "~/services/survey-submission";

/**
 * Hook to get all survey submissions with auto-sync
 */
export const useGetAllSurveySubmissions = (forceSync: boolean = false) => {
  const { user } = useAuth({});
  const { getAll, update, create } = useSQLite();
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const userId = user?.id || user?.json?.id;

  const { syncStatus, refresh } = useDataSync([
    {
      key: `surveySubmissions-${userId}`,
      fetchFn: async () => fetchSurveySubmissionsFromRemote(userId),
      tableName: "SurveySubmissions",
      transformData: transformApiSurveySubmissions,
      staleTime: 5 * 60 * 1000,
      forceSync,
    },
  ]);

  const loadFromSQLite = useCallback(async () => {
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
    }
  }, [getAll, userId]);

  useEffect(() => {
    loadFromSQLite();
  }, [loadFromSQLite]);

  useEffect(() => {
    const trySync = async () => {
      const online = await isOnline();
      setIsOffline(!online);
      
      if (online) {
        await refresh(`surveySubmissions-${userId}`, forceSync);
        await loadFromSQLite();
      }
    };

    trySync();
  }, [refresh, loadFromSQLite, forceSync, userId]);

  const manualSync = useCallback(async () => {
    const online = await isOnline();
    if (!online) {
      console.warn("Cannot sync while offline");
      return { synced: 0, failed: 0, errors: [] };
    }

    console.log("Manual sync triggered...");
    
    const syncResult = await syncPendingSubmissions(getAll, update, t, userId);
    await refresh(`surveySubmissions-${userId}`, true);
    await loadFromSQLite();
    
    console.log(`Manual sync complete`);
    return syncResult;
  }, [getAll, update, refresh, loadFromSQLite, userId, t]);

  return {
    submissions,
    isLoading: syncStatus[`surveySubmissions-${userId}`]?.isLoading || false,
    error: syncStatus[`surveySubmissions-${userId}`]?.error || null,
    lastSyncTime: syncStatus[`surveySubmissions-${userId}`]?.lastSyncTime || null,
    isOffline,
    refresh: manualSync,
  };
};