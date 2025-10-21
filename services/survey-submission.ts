import { FormField, ISurveySubmission, SyncType } from "~/types";
import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import { useSQLite } from "~/providers/RealContextProvider";
import { useMemo, useCallback, useState, useEffect } from "react";
import { useAuth } from "~/lib/hooks/useAuth";
import { useDataSync } from "./dataSync";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";


export interface SurveySubmission {
  _id?: string; // Local SQLite ID
  id?: number; // Remote server ID
  answers: { [key: string]: string | number | boolean | null };
  form_data: { [key: string]: string | number | boolean | null };
  location: { [key: string]: string | number | boolean | null };
  sync_data: { [key: string]: string | number | boolean | null | Date };
  created_by_user_id?: number;
  sync_status?: boolean | number | null;
  sync_reason?: string;
  sync_attempts?: number;
  sync_type?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export const CREATE_SURVEY_SUBMISSIONS_TABLE = `

  CREATE TABLE IF NOT EXISTS SurveySubmissions (
    _id TEXT PRIMARY KEY,
    id INTEGER,
    answers TEXT,
    form_data TEXT,
    location TEXT,
    table_name TEXT,
    name TEXT,
    name_kin TEXT,
    slug TEXT,
    json2 TEXT,
    post_data TEXT,
    loads TEXT,
    time_spent TEXT,
    user_id INTEGER,
    is_primary BOOLEAN,
    project_module_id INTEGER,
    source_module_id INTEGER,
    project_id INTEGER,
    survey_status INTEGER,
    fetch_data TEXT,
    prev_id TEXT,
    order_list INTEGER,
    survey_id INTEGER,
    sync_data TEXT,
    created_by_user_id INTEGER,
    sync_status BOOLEAN,
    sync_reason TEXT,
    sync_attempts INTEGER,
    sync_type TEXT,
    created_at TEXT,
    updated_at TEXT
  );


  CREATE INDEX IF NOT EXISTS idx_survey_user ON SurveySubmissions(created_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_survey_sync ON SurveySubmissions(sync_status);
  CREATE INDEX IF NOT EXISTS idx_survey_remote_id ON SurveySubmissions(id);
`;
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse JSON from SQLite TEXT fields
 */
function safeParseJSON(data: any): any {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return {};
    }
  }
  return data;
}

/**
 * Clean undefined values and convert to null
 */
function cleanObject(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj || {}).map(([k, v]) => [k, v === undefined ? null : v])
  );
}

/**
 * Generate unique local ID
 */
function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert SQLite row to SurveySubmission object
 */
function parseSQLiteRow(row: any): SurveySubmission {
  return {
    _id: row._id,
    id: row.id,
    answers: safeParseJSON(row.answers),
    form_data: safeParseJSON(row.form_data),
    location: safeParseJSON(row.location),
    sync_data: safeParseJSON(row.sync_data),
    created_by_user_id: row.created_by_user_id,
    sync_status: row.sync_status,
    sync_reason: row.sync_reason,
    sync_attempts: row.sync_attempts || 0,
    sync_type: row.sync_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert SurveySubmission to SQLite row
 */
function toSQLiteRow(submission: SurveySubmission): Record<string, any> {
  return {
    _id: submission._id,
    id: submission.id || null,
    answers: JSON.stringify(submission.answers || {}),
    form_data: JSON.stringify(submission.form_data || {}),
    location: JSON.stringify(submission.location || {}),
    sync_data: JSON.stringify(submission.sync_data || {}),
    created_by_user_id: submission.created_by_user_id,
    sync_status: submission.sync_status ? 1 : 0,
    sync_reason: submission.sync_reason || null,
    sync_attempts: submission.sync_attempts || 0,
    sync_type: submission.sync_type || null,
    created_at: submission.created_at || new Date().toISOString(),
    updated_at: submission.updated_at || new Date().toISOString(),
  };
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Create a survey submission structure from form data
 */
export const createSurveySubmission = (
  formData: Record<string, any>,
  fields: FormField[],
  userId: number
): SurveySubmission => {
  try {
    let answers;
    
    // Extract answers from form fields
    if (fields.length > 0) {
      answers = Object.fromEntries(
        fields
          .filter((field) => field.key !== "submit")
          .map((field) => {
            const value = formData[field.key];

            switch (field.type) {
              case "switch":
                return [field.key, value ? true : false];
              case "number":
                return [field.key, Number(value)];
              case "date":
              case "datetime":
                return [field.key, value ? new Date(value).toISOString() : null];
              default:
                return [field.key, value ?? null];
            }
          })
      );
    } else {
      answers = formData;
    }

    const localId = generateLocalId();

    return {
      _id: localId,
      id: formData.id || null,
      answers: cleanObject(answers),
      form_data: cleanObject({
        time_spent_filling_the_form: formData.time_spent_filling_the_form,
        user_id: userId,
        table_name: formData.table_name,
        project_module_id: formData.project_module_id,
        source_module_id: formData.source_module_id,
        project_id: formData.project_id,
        survey_id: formData.survey_id,
        post_data: formData.post_data,
        izucode: formData.izucode,
        family: formData.family,
        form_status: "followup",
        cohorts: formData.cohort,
      }),
      location: cleanObject({
        province: formData.province,
        district: formData.district,
        sector: formData.sector,
        cell: formData.cell,
        village: formData.village,
      }),
      sync_data: cleanObject({
        sync_status: false,
        sync_reason: "New record",
        sync_attempts: 0,
        last_sync_attempt: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        created_by_user_id: userId,
        sync_type: SyncType.survey_submissions,
      }),
      created_by_user_id: userId,
      sync_status: 0,
      sync_reason: "Pending sync",
      sync_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error creating survey submission:", error);
    throw error;
  }
};

/**
 * Save survey submission to API
 */
export const saveSurveySubmissionToAPI = async (
  create: any,
  formData: Record<string, any>,
  apiUrl: string,
  t: TFunction,
  fields: FormField[] = [],
  userId: number
): Promise<void> => {
  try {
    console.log("Saving survey submission...", formData);

    // Check for duplicates if needed
    if (formData.source_module_id && formData.source_module_id !== 22) {
      const allSubmissions = await create.getAll("SurveySubmissions");
      const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
      
      const isDuplicate = parsedSubmissions.some(
        (submission) => {
          const fd = submission.form_data;
          return fd?.survey_id === formData.survey_id &&
                 fd?.source_module_id === formData.source_module_id &&
                 fd?.izucode === formData.izucode &&
                 fd?.family === formData.family;
        }
      );

      if (isDuplicate) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.duplicate.survey"),
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }
    }

    // Create submission object
    const submission = createSurveySubmission(formData, fields, userId);
    const isConnected = await isOnline();

    if (isConnected) {
      try {
        Toast.show({
          type: "info",
          text1: t("Alerts.saving.survey"),
          text2: t("Alerts.submitting.server"),
          position: "top",
          visibilityTime: 2000,
        });

        // Prepare API payload
        const apiData = {
          ...formData,
          ...submission.form_data,
          ...submission.location,
        };

        // Submit to API
        const response = await baseInstance.post(apiUrl, apiData);

        if (response.data?.result?.id) {
          // Update with server ID
          submission.id = response.data.result.id;
          submission.sync_status = 1;
          submission.sync_reason = "Successfully synced";
          submission.sync_attempts = 1;
          submission.sync_data = {
            ...submission.sync_data,
            sync_status: true,
            sync_reason: "Successfully synced",
          };

          await create("SurveySubmissions", toSQLiteRow(submission));

          Toast.show({
            type: "success",
            text1: t("Alerts.success.title"),
            text2: t("Alerts.success.survey"),
            position: "top",
            visibilityTime: 3000,
          });
          router.push("/(history)/realmDbViewer");
        } else {
          throw new Error("No ID returned from API");
        }
      } catch (error: any) {
        console.error("API submission failed:", error);
        
        // Save locally
        await create("SurveySubmissions", toSQLiteRow(submission));
        
        Toast.show({
          type: "info",
          text1: t("Alerts.info.saved_locally"),
          text2: t("Alerts.submitting.offline"),
          position: "top",
          visibilityTime: 3000,
        });
        router.push("/(history)/realmDbViewer");
      }
    } else {
      // Offline - save locally
      await create("SurveySubmissions", toSQLiteRow(submission));
      
      Toast.show({
        type: "info",
        text1: t("Alerts.info.offline_mode"),
        text2: t("Alerts.info.will_sync"),
        position: "top",
        visibilityTime: 3000,
      });
      router.push("/(history)/realmDbViewer");
    }
  } catch (error: any) {
    console.error("Error in saveSurveySubmissionToAPI:", error);
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title"),
      text2: t("Alerts.error.submission.unexpected"),
      position: "top",
      visibilityTime: 4000,
    });
  }
};

/**
 * Sync pending submissions to server - COMPATIBLE WITH SYNC PAGE
 * This version works with both useSQLite hook and direct query/update functions
 */
export const syncPendingSubmissions = async (
  getAll: any,
  update: any,
  t?: TFunction,
  userId?: number
): Promise<{ synced: number; failed: number; errors: string[] }> => {
  console.log("🔄 Starting sync of pending submissions...");
  
  try {
    const isConnected = await isOnline();
    if (!isConnected) {
      console.log("📴 Offline - skipping sync");
      if (t) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.network.title"),
          text2: t("Alerts.error.network.offline"),
          position: "top",
          visibilityTime: 4000,
        });
      }
      return { synced: 0, failed: 0, errors: [] };
    }

    // Get all submissions
    const allSubmissions = await getAll("SurveySubmissions");
    const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
    
    // Filter pending submissions
    let pendingSubmissions = parsedSubmissions.filter(
      (s: SurveySubmission) => !s.sync_status || s.sync_status === 0
    );

    // If userId provided, filter by user
    if (userId) {
      pendingSubmissions = pendingSubmissions.filter(
        (s: SurveySubmission) => s.created_by_user_id === userId
      );
    }
    
    console.log(`📊 Found ${pendingSubmissions.length} pending submissions to sync`);
    
    if (pendingSubmissions.length === 0) {
      if (t) {
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: t("Alerts.info.no_pending"),
          position: "top",
          visibilityTime: 4000,
        });
      }
      return { synced: 0, failed: 0, errors: [] };
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const submission of pendingSubmissions) {
      try {
        console.log(`🔄 Syncing submission ${submission._id}...`);

        // Prepare API payload
        const apiData = {
          ...submission.answers,
          ...submission.form_data,
          ...submission.location,
        };

        console.log("📤 Sending to API:", JSON.stringify(apiData, null, 2));

        const response = await baseInstance.post("/submissions", apiData);

        if (response.data?.result?.id) {
          // Update with server ID and mark as synced
          await update("SurveySubmissions", submission._id!, {
            id: response.data.result.id,
            sync_status: 1,
            sync_reason: "Successfully synced",
            sync_attempts: (submission.sync_attempts || 0) + 1,
            updated_at: new Date().toISOString(),
          });
          
          synced++;
          console.log(`✅ Synced submission ${submission._id} with server ID ${response.data.result.id}`);
        } else {
          throw new Error("No ID returned from API");
        }
      } catch (error: any) {
        failed++;
        const errorMsg = error?.response?.data?.message || error.message;
        errors.push(`${submission._id}: ${errorMsg}`);
        
        // Update failed attempt
        await update("SurveySubmissions", submission._id!, {
          sync_status: 0,
          sync_reason: `Failed: ${errorMsg}`,
          sync_attempts: (submission.sync_attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        });
        
        console.error(`❌ Failed to sync ${submission._id}:`, error?.response?.data || error.message);
      }
    }

    // Show results
    if (t) {
      if (synced > 0 && failed === 0) {
        Toast.show({
          type: "success",
          text1: t("Alerts.success.title"),
          text2: `${synced} ${t("Sync.submissionsSynced") || "submissions synced"}`,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (synced > 0 && failed > 0) {
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: `${synced} synced, ${failed} failed`,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (failed > 0) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: `${failed} ${t("Sync.submissionsFailed") || "submissions failed"}`,
          position: "top",
          visibilityTime: 4000,
        });
      }
    }

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed, errors };
  } catch (error) {
    console.error("❌ Error during sync:", error);
    return { 
      synced: 0, 
      failed: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error'] 
    };
  }
};

/**
 * Get pending submissions count for a user
 */
export const getPendingSubmissionsCount = async (
  query: any,
  userId: number
): Promise<number> => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM SurveySubmissions WHERE sync_status = 0 AND created_by_user_id = ?`,
      [userId]
    );
    return result[0]?.count || 0;
  } catch (error) {
    console.error("Error getting pending count:", error);
    return 0;
  }
};

/**
 * Fetch submissions from remote API
 */
export async function fetchSurveySubmissionsFromRemote(userId: number) {
  try {
    const res = await baseInstance.get("/forms");
    const submissions = Array.isArray(res.data?.data) ? res.data.data : [];
    
    // Filter by user
    const userSubmissions = submissions.filter(
      (s: any) => s.created_by_user_id === userId || s.form_data?.user_id === userId
    );
    
    console.log(`✅ Fetched ${userSubmissions.length} submissions for user ${userId}`);
    return userSubmissions;
  } catch (error) {
    console.error("❌ Failed to fetch submissions:", error);
    throw error;
  }
};

/**
 * Transform API response to our format
 */
export const transformApiSurveySubmissions = (apiResponses: any[]) => {
  return apiResponses.map((response) => {
    const jsonData = typeof response.json === "string" 
      ? JSON.parse(response.json) 
      : response.json;

    const metadataFields = [
      "table_name", "project_module_id", "source_module_id", "project_id",
      "survey_id", "post_data", "cohorts", "province", "district", "sector",
      "cell", "village", "izucode", "family", "province_name", "district_name",
      "sector_name", "cell_name", "village_name", "izu_name", "familyID",
      "hh_head_fullname", "enrollment_date"
    ];

    const answers: Record<string, any> = {};
    Object.keys(jsonData).forEach((key) => {
      if (!metadataFields.includes(key)) {
        answers[key] = jsonData[key];
      }
    });

    return {
      _id: `remote-${response.id}`,
      id: response.id,
      answers,
      form_data: {
        time_spent_filling_the_form: null,
        user_id: response.user_id || null,
        table_name: jsonData.table_name || null,
        project_module_id: jsonData.project_module_id || response.project_module_id || null,
        source_module_id: jsonData.source_module_id || response.module_id || null,
        project_id: jsonData.project_id || response.project_id || null,
        survey_id: jsonData.survey_id || response.curr_form_id || null,
        post_data: jsonData.post_data || null,
        izucode: jsonData.izucode || null,
        family: jsonData.family || response.families_id || null,
        form_status: "followup",
        cohort: jsonData.cohorts || response.cohort || null,
      },
      location: {
        province: jsonData.province || response.province || null,
        district: jsonData.district || response.district || null,
        sector: jsonData.sector || response.sector || null,
        cell: jsonData.cell || response.cell || null,
        village: jsonData.village || response.village || null,
      },
      sync_data: {
        sync_status: true,
        sync_reason: "From API",
        sync_attempts: 1,
        last_sync_attempt: new Date(response.updated_at || response.created_at).toISOString(),
        submitted_at: new Date(response.recorded_on || response.created_at).toISOString(),
        sync_type: SyncType.survey_submissions,
        created_by_user_id: response.user_id || null,
      },
      created_by_user_id: response.user_id,
      sync_status: 1,
      sync_reason: "From API",
      sync_attempts: 1,
      sync_type: SyncType.survey_submissions,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  });
};

// ============================================================================
// REACT HOOKS
// ============================================================================

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
      console.log(`📀 Loaded ${userRows.length} submissions from SQLite`);
    } catch (err) {
      console.error("❌ Failed to load submissions:", err);
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
      console.warn("📴 Cannot sync while offline");
      return { synced: 0, failed: 0, errors: [] };
    }

    console.log("🔄 Manual sync triggered...");
    
    const syncResult = await syncPendingSubmissions(getAll, update, t, userId);
    await refresh(`surveySubmissions-${userId}`, true);
    await loadFromSQLite();
    
    console.log(`✅ Manual sync complete`);
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