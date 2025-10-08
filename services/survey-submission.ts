import { FormField, ISurveySubmission, SyncType } from "~/types";
import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "~/lib/hooks/useAuth";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { useSQLite } from "~/providers/RealContextProvider";

// Helper to generate IDs
const generateId = (): number => {
  return Date.now();
};

// Helper to get next available ID from SQLite
const getNextAvailableId = async (sqlite: ReturnType<typeof useSQLite>): Promise<number> => {
  try {
    const submissions = await sqlite.getAll<any>('SurveySubmissions');
    if (submissions.length > 0) {
      const maxId = Math.max(...submissions.map((s) => s.id));
      console.log("Generated next ID:", maxId + 1);
      return maxId + 1;
    }
    console.log("No existing survey submissions, starting with ID 1");
    return 1;
  } catch (error) {
    console.log("Error getting next ID, using timestamp:", error);
    return generateId();
  }
};

export const createSurveySubmission = async (
  sqlite: ReturnType<typeof useSQLite>,
  formData: Record<string, any>,
  fields: FormField[]
) => {
  try {
    let answers;
    
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

    const submission = {
      _id: formData.id?.toString() || generateId().toString(),
      id: formData.id || (await getNextAvailableId(sqlite)),
      answers: JSON.stringify(answers),
      form_data: JSON.stringify({
        time_spent_filling_the_form: formData.time_spent_filling_the_form,
        user_id: formData.user_id,
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
      location: JSON.stringify({
        province: formData.province,
        district: formData.district,
        sector: formData.sector,
        cell: formData.cell,
        village: formData.village,
      }),
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      created_by_user_id: formData.user_id || null,
      sync_type: SyncType.survey_submissions,
    };

    const result = await sqlite.create('SurveySubmissions', submission);
    return result;
  } catch (error) {
    console.log("Error creating survey submission:", error);
    throw error;
  }
};

function createTemporarySurveySubmission(
  sqlite: ReturnType<typeof useSQLite>,
  formData: Record<string, any>,
  fields: FormField[] = []
) {
  return createSurveySubmission(
    sqlite,
    {
      ...formData,
      sync_status: false,
      sync_reason: "Created offline",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
      sync_type: SyncType.survey_submissions,
    },
    fields
  );
}

export const saveSurveySubmissionToAPI = async (
  sqlite: ReturnType<typeof useSQLite>,
  formData: Record<string, any>,
  apiUrl: string,
  t: TFunction,
  fields: FormField[] = []
): Promise<void> => {
  try {
    console.log("saveSurveySubmissionToAPI received data:", JSON.stringify(formData, null, 2));

    // Check for duplicates if needed
    if (formData.source_module_id && formData.source_module_id !== 22) {
      const existingSubmissions = await sqlite.getAll<any>(
        'SurveySubmissions',
        'survey_id = ? AND source_module_id = ? AND izucode = ? AND family = ?',
        [formData.survey_id, formData.source_module_id, formData.izucode, formData.family]
      );

      if (existingSubmissions.length > 0) {
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

    const location = typeof formData.location === "object"
      ? formData.location
      : {
          province: formData.province,
          district: formData.district,
          sector: formData.sector,
          cell: formData.cell,
          village: formData.village,
        };

    const formDataObj = {
      time_spent_filling_the_form: formData.time_spent_filling_the_form || null,
      user_id: formData.user_id || null,
      table_name: formData.table_name || null,
      project_module_id: formData.project_module_id || null,
      source_module_id: formData.source_module_id || null,
      project_id: formData.project_id || null,
      survey_id: formData.survey_id || null,
      post_data: formData.post_data || null,
      izucode: formData.izucode || null,
      family: formData.family || null,
      form_status: "followup",
      cohort: formData.cohorts || null,
    };

    const sanitizedFormData = {
      ...formData,
      id: formData.id || (await getNextAvailableId(sqlite)),
      form_data: formDataObj,
      location,
    };

    const isConnected = isOnline();
    console.log("Network connection status:", isConnected);

    if (isConnected) {
      try {
        Toast.show({
          type: "info",
          text1: t("Alerts.saving.survey"),
          text2: t("Alerts.submitting.server"),
          position: "top",
          visibilityTime: 2000,
        });

        const apiData = {
          ...formData,
          ...sanitizedFormData.form_data,
          ...sanitizedFormData.location,
        };

        console.log("Data being sent to API:", JSON.stringify(apiData, null, 2));

        baseInstance
          .post(apiUrl, apiData)
          .then(async (response) => {
            if (response.data?.result?.id) {
              console.log("API returned data:", response.data.result);

              const completeData = {
                ...sanitizedFormData,
                id: response.data.result.id,
                ...response.data.result,
                sync_status: true,
                sync_reason: "Successfully synced",
                sync_attempts: 1,
                last_sync_attempt: new Date().toISOString(),
                submitted_at: new Date().toISOString(),
                sync_type: SyncType.survey_submissions,
                created_by_user_id: formData.user_id || null,
              };

              try {
                await createSurveySubmission(sqlite, completeData, fields);

                Toast.show({
                  type: "success",
                  text1: t("Alerts.success.title"),
                  text2: t("Alerts.success.survey"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving to SQLite:", error);
                Toast.show({
                  type: "error",
                  text1: t("Alerts.error.title"),
                  text2: t("Alerts.error.save_failed.local"),
                  position: "top",
                  visibilityTime: 4000,
                });
              }
            } else {
              console.log("API did not return data, saving locally");
              try {
                await createTemporarySurveySubmission(sqlite, sanitizedFormData, fields);
                Toast.show({
                  type: "info",
                  text1: t("Alerts.info.saved_locally"),
                  text2: t("Alerts.info.api_invalid"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving temporary survey:", error);
                Toast.show({
                  type: "error",
                  text1: t("Alerts.error.title"),
                  text2: t("Alerts.error.save_failed.local"),
                  position: "top",
                  visibilityTime: 4000,
                });
              }
            }
          })
          .catch(async (error: any) => {
            console.log("Error submitting survey to API:", error);
            Toast.show({
              type: "error",
              text1: t("Alerts.error.title"),
              text2: t("Alerts.error.save_failed.server"),
              position: "top",
              visibilityTime: 4000,
            });

            try {
              await createTemporarySurveySubmission(sqlite, sanitizedFormData, fields);
              Toast.show({
                type: "info",
                text1: t("Alerts.info.saved_locally"),
                text2: t("Alerts.submitting.offline"),
                position: "top",
                visibilityTime: 3000,
              });
              router.push("/(history)/history");
            } catch (error: any) {
              console.error("Error saving temporary survey:", error);
              Toast.show({
                type: "error",
                text1: t("Alerts.error.title"),
                text2: t("Alerts.error.save_failed.local"),
                position: "top",
                visibilityTime: 4000,
              });
            }
          });
      } catch (error: any) {
        console.error("Error in API submission block:", error);
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.submission.process"),
          position: "top",
          visibilityTime: 4000,
        });
      }
    } else {
      try {
        await createTemporarySurveySubmission(sqlite, sanitizedFormData, fields);
        Toast.show({
          type: "info",
          text1: t("Alerts.info.offline_mode"),
          text2: t("Alerts.info.will_sync"),
          position: "top",
          visibilityTime: 3000,
        });
        router.push("/(history)/history");
      } catch (error: any) {
        console.error("Error saving temporary survey:", error);
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.save_failed.local"),
          position: "top",
          visibilityTime: 4000,
        });
      }
    }
  } catch (error: any) {
    console.log("Error in saveSurveySubmissionToAPI:", error);
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title"),
      text2: t("Alerts.error.submission.unexpected"),
      position: "top",
      visibilityTime: 4000,
    });
  }
};

export const syncPendingSubmissions = async (
  sqlite: ReturnType<typeof useSQLite>,
  t: TFunction,
  userId?: number
): Promise<void> => {
  if (!isOnline()) {
    Toast.show({
      type: "error",
      text1: t("Alerts.error.network.title"),
      text2: t("Alerts.error.network.offline"),
      position: "top",
      visibilityTime: 4000,
    });
    return;
  }

  if (!userId) {
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title"),
      text2: t("Alerts.error.sync.no_user"),
      position: "top",
      visibilityTime: 4000,
    });
    return;
  }

  const submissionsToSync = await sqlite.getAll<any>(
    'SurveySubmissions',
    'sync_status = ? AND created_by_user_id = ?',
    [false, userId]
  );

  console.log(`Found ${submissionsToSync.length} submissions to sync for current user`);

  if (submissionsToSync.length === 0) {
    Toast.show({
      type: "info",
      text1: t("Alerts.info.title"),
      text2: t("Alerts.info.no_pending"),
      position: "top",
      visibilityTime: 4000,
    });
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const submission of submissionsToSync) {
    try {
      const answers = JSON.parse(submission.answers || '{}');
      const formData = JSON.parse(submission.form_data || '{}');
      const location = JSON.parse(submission.location || '{}');

      const apiData = {
        ...answers,
        ...formData,
        ...location,
        id: submission.id,
      };

      console.log("Syncing submission to API:", JSON.stringify(apiData, null, 2));

      const response = await baseInstance.post("/sendVisitData", apiData);

      if (response.data.result.id) {
        await sqlite.update('SurveySubmissions', submission._id, {
          sync_status: true,
          sync_reason: "Successfully synced",
          sync_attempts: (submission.sync_attempts || 0) + 1,
          last_sync_attempt: new Date().toISOString(),
        });

        console.log(`Successfully synced submission ${submission.id}`);
        successCount++;
      }
    } catch (error: any) {
      failureCount++;
      console.log("Error syncing submission:", error);

      await sqlite.update('SurveySubmissions', submission._id, {
        sync_status: false,
        sync_reason: `Failed: ${error?.message || "Unknown error"}`,
        sync_attempts: (submission.sync_attempts || 0) + 1,
        last_sync_attempt: new Date().toISOString(),
      });
    }
  }

  if (successCount > 0 && failureCount === 0) {
    Toast.show({
      type: "success",
      text1: t("Alerts.success.title"),
      text2: t("Alerts.success.sync").replace("{count}", successCount.toString()),
      position: "top",
      visibilityTime: 4000,
    });
  } else if (successCount > 0 && failureCount > 0) {
    Toast.show({
      type: "info",
      text1: t("Alerts.info.title"),
      text2: t("Alerts.info.partial_success")
        .replace("{success}", successCount.toString())
        .replace("{failed}", failureCount.toString()),
      position: "top",
      visibilityTime: 4000,
    });
  } else if (failureCount > 0) {
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title"),
      text2: t("Alerts.error.sync.failed").replace("{count}", failureCount.toString()),
      position: "top",
      visibilityTime: 4000,
    });
  }
};

export const transformApiSurveySubmissions = (apiResponses: any[]) => {
  return apiResponses.map((response) => {
    const jsonData = typeof response.json === "string" ? JSON.parse(response.json) : response.json;

    const metadataFields = [
      "table_name", "project_module_id", "source_module_id", "project_id",
      "survey_id", "post_data", "cohorts", "province", "district", "sector",
      "cell", "village", "izucode", "family", "province_name", "district_name",
      "sector_name", "cell_name", "village_name", "izu_name", "familyID",
      "hh_head_fullname", "enrollment_date",
    ];

    const answers: Record<string, any> = {};
    Object.keys(jsonData).forEach((key) => {
      if (!metadataFields.includes(key)) {
        answers[key] = jsonData[key];
      }
    });

    return {
      _id: response.id.toString(),
      id: response.id,
      answers: JSON.stringify(answers),
      form_data: JSON.stringify({
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
      }),
      location: JSON.stringify({
        province: jsonData.province || response.province || null,
        district: jsonData.district || response.district || null,
        sector: jsonData.sector || response.sector || null,
        cell: jsonData.cell || response.cell || null,
        village: jsonData.village || response.village || null,
      }),
      sync_status: true,
      sync_reason: "Success, comes from the API",
      sync_attempts: 1,
      last_sync_attempt: new Date(response.updated_at || response.created_at).toISOString(),
      submitted_at: new Date(response.recorded_on || response.created_at).toISOString(),
      sync_type: SyncType.survey_submissions,
      created_by_user_id: response.user_id || null,
    };
  });
};

export async function fetchSurveySubmissionsFromRemote() {
  try {
    const res = await baseInstance.get("/responses");
    console.log(`Received ${res.data.responses.length} survey submissions from API`);
    return transformApiSurveySubmissions(res.data.responses);
  } catch (error) {
    console.log("Error fetching survey submissions from remote:", error);
    throw error;
  }
}

// FIXED VERSION - All hooks called unconditionally at top level
export const useGetAllSurveySubmissions = () => {
  // All hooks MUST be called unconditionally at the top
  const { user } = useAuth({}); 
  const sqlite = useSQLite();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // Wrap loadSubmissions in useCallback to prevent unnecessary recreations
  const loadSubmissions = useCallback(async () => {
    // Only proceed if sqlite is ready
    if (!sqlite.isReady) {
      return;
    }

    try {
      setIsLoading(true);
      
      if (user?.id) {
        const data = await sqlite.getAll<any>(
          'SurveySubmissions',
          'created_by_user_id = ?',
          [user.id]
        );
        
        // Parse JSON fields
        const parsed = data.map(sub => ({
          ...sub,
          answers: JSON.parse(sub.answers || '{}'),
          form_data: JSON.parse(sub.form_data || '{}'),
          location: JSON.parse(sub.location || '{}'),
        }));
        
        setSubmissions(parsed);
      } else {
        const data = await sqlite.getAll<any>('SurveySubmissions');
        const parsed = data.map(sub => ({
          ...sub,
          answers: JSON.parse(sub.answers || '{}'),
          form_data: JSON.parse(sub.form_data || '{}'),
          location: JSON.parse(sub.location || '{}'),
        }));
        setSubmissions(parsed);
      }
    } catch (err) {
      setError(err);
      console.error('Error loading submissions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sqlite, user?.id]); // Include all dependencies

  // Effect runs when dependencies change
  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]); // Only depend on the memoized function

  return {
    submissions,
    isLoading,
    error,
    refresh: loadSubmissions,
  };
};