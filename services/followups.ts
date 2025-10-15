import { useEffect, useState, useCallback, useRef } from "react";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { useSQLite } from "~/providers/RealContextProvider";
import { ISurveySubmission } from "~/types";
import { baseInstance } from "~/utils/axios";

// FollowUp interface matching your SQLite table
export interface IFollowUp {
  id?: number;
  followup_date: string;
  status: string;
  comment: string;
  form_data?: any;       // store object
  sync_data?: any;       // store object
  user?: any;            // store object
  survey?: any;          // store object
  survey_result?: any;   // store object
  created_at?: string;
  updated_at?: string;
  survey_result_id?: number; // ID of the related survey result
  project_module_id?: number; // ID of the related project module
  project_id?: number; // ID of the related project
  source_module_id?: number; // ID of the source module
  survey_id?: string; // ID of the related survey
}

// Convert API response to SQLite row
function followUpToSQLiteRow(followup: IFollowUp) {
  return {
    id: followup.id,
    followup_date: followup.followup_date,
    status: followup.status,
    comment: followup.comment,
    form_data: followup.form_data ? JSON.stringify(followup.form_data) : null,
    sync_data: followup.sync_data ? JSON.stringify(followup.sync_data) : null,
    user: followup.user ? JSON.stringify(followup.user) : null,
    survey: followup.survey ? JSON.stringify(followup.survey) : null,
    survey_result: followup.survey_result ? JSON.stringify(followup.survey_result) : null,
    created_at: followup.created_at || new Date().toISOString(),
    updated_at: followup.updated_at || new Date().toISOString(),
  };
}

// Convert SQLite row back to IFollowUp
function sqliteRowToFollowUp(row: any): IFollowUp {
  return {
    id: row.id,
    followup_date: row.followup_date,
    status: row.status,
    comment: row.comment,
    form_data: row.form_data ? JSON.parse(row.form_data) : null,
    sync_data: row.sync_data ? JSON.parse(row.sync_data) : null,
    user: row.user ? JSON.parse(row.user) : null,
    survey: row.survey ? JSON.parse(row.survey) : null,
    survey_result: row.survey_result ? JSON.parse(row.survey_result) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Fetch follow-ups from remote API
async function fetchFollowUpsFromRemote(): Promise<IFollowUp[]> {
  const res = await baseInstance.get<{ data: IFollowUp[] }>("/get-all-followups");
  return res.data.data || [];
}

export async function saveFollowupToAPI(followup: IFollowUp, t: unknown): Promise<IFollowUp> {
  const res = await baseInstance.post<{ data: IFollowUp }>("/save-followup", followup);
  return res.data.data;
}

// FIXED: Separate hook for getting follow-ups by survey result ID
export function useGetFollowUpsBySurveyResultId(p0: string, p1: string) {
  const { query } = useSQLite();
  
  const getFollowUpsBySurveyResultId = useCallback(
    async (survey: SurveySubmission): Promise<IFollowUp[]> => {
      const rows = await query(
        "SELECT * FROM FollowUps WHERE json_extract(survey_result, '$.id') = ? ORDER BY followup_date DESC",
        [survey._id]
      );
      return rows.map(sqliteRowToFollowUp);
    },
    [query]
  );

  return { getFollowUpsBySurveyResultId };
}

// FIXED: Main hook for getting all follow-ups
export function useGetAllFollowUps(forceSync: boolean = false) {
  const { getAll, batchCreate, deleteAll } = useSQLite();
  const [followUps, setFollowUps] = useState<IFollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Use ref to track if initial load happened
  const initialLoadDone = useRef(false);

  const isStale = useCallback(() => {
    if (!lastSyncTime) return true;
    const staleTime = 5 * 60 * 1000; // 5 minutes
    return Date.now() - lastSyncTime.getTime() > staleTime;
  }, [lastSyncTime]);

  const loadFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await getAll("FollowUps");
      setFollowUps(rows.map(sqliteRowToFollowUp));
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading follow-ups:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [getAll]);

  const syncFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const remoteData = await fetchFollowUpsFromRemote();
      await deleteAll("FollowUps"); // Clear existing data

      if (remoteData.length > 0) {
        const sqliteRows = remoteData.map(followUpToSQLiteRow);
        await batchCreate("FollowUps", sqliteRows);
      }

      setFollowUps(remoteData);
      setLastSyncTime(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error("Error syncing follow-ups:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [deleteAll, batchCreate]);

  const refresh = useCallback(
    async (forceFetch: boolean = true) => {
      if (forceFetch) {
        await syncFollowUps();
      } else {
        await loadFollowUps();
      }
    },
    [syncFollowUps, loadFollowUps]
  );

  // FIXED: Proper dependency array and initialization logic
  useEffect(() => {
    // Prevent running on every render
    if (initialLoadDone.current && !forceSync) {
      return;
    }

    const initialize = async () => {
      await loadFollowUps();
      
      // Check if sync is needed after loading
      if (forceSync || isStale() || followUps.length === 0) {
        await syncFollowUps();
      }
      
      initialLoadDone.current = true;
    };

    initialize();
  }, [forceSync, loadFollowUps, syncFollowUps, isStale, followUps.length]);

  return {
    followUps,
    isLoading,
    error,
    lastSyncTime,
    refresh,
    // FIXED: Don't return hooks - users should call useGetFollowUpsBySurveyResultId separately
  };
}

// ALTERNATIVE: Combined hook if you need both functionalities together
export function useFollowUps(forceSync: boolean = false) {
  const { query, getAll, batchCreate, deleteAll } = useSQLite();
  const [followUps, setFollowUps] = useState<IFollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const initialLoadDone = useRef(false);

  const isStale = useCallback(() => {
    if (!lastSyncTime) return true;
    const staleTime = 5 * 60 * 1000; // 5 minutes
    return Date.now() - lastSyncTime.getTime() > staleTime;
  }, [lastSyncTime]);

  const loadFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await getAll("FollowUps");
      setFollowUps(rows.map(sqliteRowToFollowUp));
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading follow-ups:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [getAll]);

  const syncFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const remoteData = await fetchFollowUpsFromRemote();
      await deleteAll("FollowUps");

      if (remoteData.length > 0) {
        const sqliteRows = remoteData.map(followUpToSQLiteRow);
        await batchCreate("FollowUps", sqliteRows);
      }

      setFollowUps(remoteData);
      setLastSyncTime(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error("Error syncing follow-ups:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [deleteAll, batchCreate]);

  const refresh = useCallback(
    async (forceFetch: boolean = true) => {
      if (forceFetch) {
        await syncFollowUps();
      } else {
        await loadFollowUps();
      }
    },
    [syncFollowUps, loadFollowUps]
  );

  // Get follow-ups by survey result ID
  const getFollowUpsBySurveyResultId = useCallback(
    async (survey: SurveySubmission): Promise<IFollowUp[]> => {
      const rows = await query(
        "SELECT * FROM FollowUps WHERE json_extract(survey_result, '$.id') = ? ORDER BY followup_date DESC",
        [survey._id]
      );
      return rows.map(sqliteRowToFollowUp);
    },
    [query]
  );

  useEffect(() => {
    if (initialLoadDone.current && !forceSync) {
      return;
    }

    const initialize = async () => {
      await loadFollowUps();
      
      if (forceSync || isStale() || followUps.length === 0) {
        await syncFollowUps();
      }
      
      initialLoadDone.current = true;
    };

    initialize();
  }, [forceSync, loadFollowUps, syncFollowUps, isStale, followUps.length]);

  return {
    followUps,
    isLoading,
    error,
    lastSyncTime,
    refresh,
    getFollowUpsBySurveyResultId, // Now it's a function, not a hook
    saveFollowupToAPI, // Helper function
  };
}


