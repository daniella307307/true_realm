import { FormField, ISurveySubmission, SyncType } from "~/types";
import { Realm } from "@realm/react";
import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import { RealmContext } from "~/providers/RealContextProvider";
import { useMemo } from "react";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { filterDataByUserId } from "./filterData";
import { useAuth } from "~/lib/hooks/useAuth";
import { useDataSync } from "./dataSync";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
const { useRealm, useQuery } = RealmContext;

export const createSurveySubmission = (
  formData: Record<string, any>,
  fields: FormField[],
  realm: Realm
) => {
  try {
    let answers;
    
    // If field definitions are provided, use them to extract specific fields
    if (fields.length > 0) {
      answers = Object.fromEntries(
        fields
          .filter((field) => field.key !== "submit")
          .map((field) => {
            const value = formData[field.key];

            // Handle different field types
            switch (field.type) {
              case "switch":
                return [field.key, value ? true : false];
              case "number":
                return [field.key, Number(value)];
              case "date":
              case "datetime":
                return [field.key, value ? new Date(value) : null];
              default:
                return [field.key, value ?? null];
            }
          })
      );
    } else {
      // If no field definitions are provided, return the formData as-is for answers
      // This preserves all form field answers just like families
      answers = formData;
    }

    // Create structured submission according to new interface
    const submission = {
      id: formData.id || getNextAvailableId(realm),
      answers: answers as { [key: string]: string | number | boolean | null },
      form_data: {
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
      } as { [key: string]: string | number | boolean | null },
      location: {
        province: formData.province,
        district: formData.district,
        sector: formData.sector,
        cell: formData.cell,
        village: formData.village,
      } as { [key: string]: string | number | boolean | null },
      sync_data: {
        sync_status: false,
        sync_reason: "New record",
        sync_attempts: 0,
        last_sync_attempt: new Date(),
        submitted_at: new Date(),
        created_by_user_id: formData.user_id || null,
        sync_type: SyncType.survey_submissions,
      } as { [key: string]: string | number | boolean | null | Date },
    };

    let result;
    
    // Handle transaction
    const createSubmissionInRealm = () => {
      return realm.create(SurveySubmission, submission, Realm.UpdateMode.Modified);
    };

    if (realm.isInTransaction) {
      result = createSubmissionInRealm();
    } else {
      realm.write(() => {
        result = createSubmissionInRealm();
      });
    }

    if (!result) {
      throw new Error("Failed to create survey submission object");
    }
    return result;
  } catch (error) {
    console.log("Error creating survey submission:", error);
    throw error;
  }
};

// Transform API response survey submissions to the ISurveySubmission format

function getNextAvailableId(realm: Realm): number {
  try {
    const surveySubmissions = realm.objects<SurveySubmission>(SurveySubmission);
    if (surveySubmissions.length > 0) {
      const maxId = Math.max(...surveySubmissions.map((i) => i.id));
      console.log("Generated next ID:", maxId + 1);
      return maxId + 1;
    }
    console.log("No existing SurveySubmissions, starting with ID 1");
    return 1; // Start with 1 if no records exist
  } catch (error) {
    console.log("Error getting next ID, using default:", error);
    return 1;
  }
}

function createTemporarySurveySubmission(
  realm: Realm,
  formData: Record<string, any>,
  fields: FormField[] = []
): SurveySubmission {
  const localId = getNextAvailableId(realm);

  const syncData = {
    sync_status: formData.sync_data?.sync_status ?? false,
    sync_reason: "Created offline",
    sync_attempts: formData.sync_data?.sync_attempts ?? 0,
    last_sync_attempt: formData.sync_data?.last_sync_attempt ?? new Date(),
    submitted_at: formData.sync_data?.submitted_at ?? new Date(),
    sync_type: SyncType.survey_submissions,
    created_by_user_id: formData.sync_data?.created_by_user_id || null,
  } as { [key: string]: string | number | boolean | null | Date };

  let submission: SurveySubmission;
  
  if (realm.isInTransaction) {
    submission = createSurveySubmission(
      {
        ...formData,
        id: localId,
        sync_data: syncData,
      },
      fields,
      realm
    );
  } else {
    realm.write(() => {
      submission = createSurveySubmission(
        {
          ...formData,
          id: localId,
          sync_data: syncData,
        },
        fields,
        realm
      );
    });
  }
  return submission!;
}

export const saveSurveySubmissionToAPI = async (
  realm: Realm,
  formData: Record<string, any>,
  apiUrl: string,
  t: TFunction,
  fields: FormField[] = []
): Promise<void> => {
  try {
    console.log(
      "saveSurveySubmissionToAPI received data:",
      JSON.stringify(formData, null, 2)
    );

    // Only check for duplicates if the form is under a module (has source_module_id) 
    // AND source_module_id is not 22 (direct forms that can have multiple submissions)
    if (formData.source_module_id && formData.source_module_id !== 22) {
      const existingSubmissions = realm.objects<SurveySubmission>(SurveySubmission);
      const isDuplicate = existingSubmissions.some(
        (submission) =>
          submission.form_data?.survey_id === formData.survey_id &&
          submission.form_data?.source_module_id === formData.source_module_id &&
          submission.form_data?.izucode === formData.izucode &&
          submission.form_data?.family === formData.family
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

    // Prepare location data
    const location =
      typeof formData.location === "object"
        ? formData.location
        : {
            province: formData.province,
            district: formData.district,
            sector: formData.sector,
            cell: formData.cell,
            village: formData.village,
          };

    // Prepare form data
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

    // Prepare sync data
    const syncData = formData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
      sync_type: SyncType.survey_submissions,
      created_by_user_id: formData.user_id || null,
    };

    const sanitizedFormData = {
      ...formData,
      id: formData.id || getNextAvailableId(realm),
      sync_data: syncData,
      form_data: formDataObj,
      location,
    };

    const isConnected = isOnline();
    console.log("Network connection status:", isConnected);

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        Toast.show({
          type: "info",
          text1: t("Alerts.saving.survey"),
          text2: t("Alerts.submitting.server"),
          position: "top",
          visibilityTime: 2000,
        });

        console.log("Attempting to send data to API");

        // Combine all form data including the original fields and standardized data
        const apiData = {
          ...formData, // Include all original form fields
          ...sanitizedFormData.form_data, // Include standardized form data
          ...sanitizedFormData.location, // Include location data
        };

        console.log(
          "Data being sent to API:",
          JSON.stringify(apiData, null, 2)
        );

        // Send to API
        baseInstance
          .post(apiUrl, apiData)
          .then((response) => {
            if (response.data?.result?.id) {
              console.log("API returned data:", response.data.result);

              const completeData = {
                ...sanitizedFormData,
                id: response.data.result.id,
                ...response.data.result,
                sync_data: {
                  sync_status: true,
                  sync_reason: "Successfully synced",
                  sync_attempts: 1,
                  last_sync_attempt: new Date(),
                  submitted_at: new Date(),
                  sync_type: SyncType.survey_submissions,
                  created_by_user_id: formData.user_id || null,
                },
              };

              console.log(
                "Complete data for Realm:",
                JSON.stringify(completeData, null, 2)
              );

              try {
                realm.write(() => {
                  realm.create(SurveySubmission, completeData, Realm.UpdateMode.Modified);
                });

                Toast.show({
                  type: "success",
                  text1: t("Alerts.success.title"),
                  text2: t("Alerts.success.survey"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving to Realm:", error);
                Toast.show({
                  type: "error",
                  text1: t("Alerts.error.title"),
                  text2: t("Alerts.error.save_failed.local"),
                  position: "top",
                  visibilityTime: 4000,
                });
              }
            } else {
              // If API didn't return data, save locally
              console.log("API did not return data, saving locally");
              try {
                createTemporarySurveySubmission(realm, sanitizedFormData, fields);
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
          .catch((error: any) => {
            console.log("Error submitting survey to API:", error);
            console.log("Error response:", error.response?.data);
            console.log(
              "Error details:",
              JSON.stringify(error, Object.getOwnPropertyNames(error))
            );

            Toast.show({
              type: "error",
              text1: t("Alerts.error.title"),
              text2: t("Alerts.error.save_failed.server"),
              position: "top",
              visibilityTime: 4000,
            });

            // Fall back to offline approach if API submission fails
            try {
              createTemporarySurveySubmission(realm, sanitizedFormData, fields);
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
      // Offline mode - create with locally generated ID
      try {
        createTemporarySurveySubmission(realm, sanitizedFormData, fields);
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
    console.log(
      "Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );

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
  realm: Realm,
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
      autoHide: true,
      topOffset: 50,
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
      autoHide: true,
      topOffset: 50,
    });
    return;
  }

  // Find all submissions that need syncing AND were created by the current user
  const submissionsToSync = realm
    .objects<SurveySubmission>(SurveySubmission)
    .filtered(
      "sync_data.sync_status == false AND sync_data.created_by_user_id == $0",
      userId
    );

  console.log(
    `Found ${submissionsToSync.length} submissions to sync for current user`
  );

  if (submissionsToSync.length === 0) {
    Toast.show({
      type: "info",
      text1: t("Alerts.info.title"),
      text2: t("Alerts.info.no_pending"),
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const submission of submissionsToSync) {
    try {
      const locationData = submission.location || {};

      const apiData = {
        ...submission.answers, // Include all form field answers (this is the key part!)
        ...submission.form_data, // Include form metadata
        ...locationData, // Include location data at top level
        id: submission.id,
      };

      console.log(
        "Syncing submission to API:",
        JSON.stringify(apiData, null, 2)
      );

      const response = await baseInstance.post("/sendVisitData", apiData);

      if (response.data.result.id) {
        const updatedData = {
          ...apiData,
          id: response.data.result.id,
          ...response.data.result,
          sync_data: {
            sync_status: true,
            sync_reason: "Successfully synced",
            sync_attempts:
              (typeof submission.sync_data?.sync_attempts === "number"
                ? submission.sync_data.sync_attempts
                : 0) + 1,
            last_sync_attempt: new Date(),
            submitted_at: new Date(),
            sync_type: SyncType.survey_submissions,
          },
        };

        if (!realm.isInTransaction) {
          realm.write(() => {
            const existingSubmission = realm.objectForPrimaryKey(
              SurveySubmission,
              submission.id
            );
            if (existingSubmission) {
              if (updatedData.sync_data) {
                existingSubmission.sync_data = updatedData.sync_data;
              }
              if (updatedData.answers) {
                existingSubmission.answers = updatedData.answers;
              }
              if (updatedData.form_data) {
                existingSubmission.form_data = updatedData.form_data;
              }
              if (updatedData.location) {
                existingSubmission.location = updatedData.location;
              }
            }
          });
        }

        console.log(
          `Successfully synced submission ${submission.id} to server, updated with server id: ${response.data.result.id}`,
          submission
        );
        successCount++;
      }
    } catch (error: any) {
      failureCount++;
      console.log("Advanced error", error.response?.data);
      console.log("Error syncing submission to API:", error);

      if (!realm.isInTransaction) {
        realm.write(() => {
          const existingSubmission = realm.objectForPrimaryKey(
            SurveySubmission,
            submission.id
          );
          if (existingSubmission && existingSubmission.sync_data) {
            existingSubmission.sync_data.sync_status = false;
            existingSubmission.sync_data.sync_type =
              SyncType.survey_submissions;
            existingSubmission.sync_data.sync_reason = `Failed: ${
              error?.message || "Unknown error"
            }`;
            existingSubmission.sync_data.sync_attempts =
              (typeof existingSubmission.sync_data.sync_attempts === "number"
                ? existingSubmission.sync_data.sync_attempts
                : 0) + 1;
            existingSubmission.sync_data.last_sync_attempt = new Date();
          }
        });
      }

      console.log(`Failed to sync submission ${submission.id}:`, error);
    }
  }

  // Show final status toast
  if (successCount > 0 && failureCount === 0) {
    Toast.show({
      type: "success",
      text1: t("Alerts.success.title"),
      text2: t("Alerts.success.sync").replace("{count}", successCount.toString()),
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
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
      autoHide: true,
      topOffset: 50,
    });
  } else if (failureCount > 0) {
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title"),
      text2: t("Alerts.error.sync.failed").replace("{count}", failureCount.toString()),
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
  }
};

export const transformApiSurveySubmissions = (apiResponses: any[]) => {
  return apiResponses.map((response) => {
    // Parse the JSON field to extract data
    const jsonData =
      typeof response.json === "string"
        ? JSON.parse(response.json)
        : response.json;

    // Extract answers from jsonData by removing metadata fields
    const metadataFields = [
      "table_name",
      "project_module_id",
      "source_module_id",
      "project_id",
      "survey_id",
      "post_data",
      "cohorts",
      "province",
      "district",
      "sector",
      "cell",
      "village",
      "izucode",
      "family",
      "province_name",
      "district_name",
      "sector_name",
      "cell_name",
      "village_name",
      "izu_name",
      "familyID",
      "hh_head_fullname",
      "enrollment_date",
    ];

    const answers: Record<string, any> = {};
    Object.keys(jsonData).forEach((key) => {
      if (!metadataFields.includes(key)) {
        answers[key] = jsonData[key];
      }
    });

    // Create the transformed submission
    return {
      id: response.id,
      answers,
      form_data: {
        time_spent_filling_the_form: null,
        user_id: response.user_id || null,
        table_name: jsonData.table_name || null,
        project_module_id:
          jsonData.project_module_id || response.project_module_id || null,
        source_module_id:
          jsonData.source_module_id || response.module_id || null,
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
        sync_reason: "Success, comes from the API",
        sync_attempts: 1,
        last_sync_attempt: new Date(response.updated_at || response.created_at),
        submitted_at: new Date(response.recorded_on || response.created_at),
        sync_type: SyncType.survey_submissions,
        created_by_user_id: response.user_id || null,
      },
    };
  });
};

export async function fetchSurveySubmissionsFromRemote() {
  try {
    const res = await baseInstance.get("/responses");
    console.log(
      `Received ${res.data.responses.length} survey submissions from API`
    );

    // Transform the API response data to match our Realm model
    return transformApiSurveySubmissions(res.data.responses);
  } catch (error) {
    console.log("Error fetching survey submissions from remote:", error);
    throw error;
  }
}

export const useGetAllSurveySubmissions = (forceSync: boolean = false) => {
  const { user } = useAuth({});
  const allLocalSubmissions = useQuery<SurveySubmission>(SurveySubmission);

  // Filter submissions by current user
  const userSubmissions = useMemo(() => {
    if (!user || !user.id) return allLocalSubmissions;
  }, [allLocalSubmissions, user]);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "surveySubmissions",
      fetchFn: fetchSurveySubmissionsFromRemote,
      model: SurveySubmission,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  return {
    submissions: userSubmissions,
    isLoading: syncStatus.surveySubmissions?.isLoading || false,
    error: syncStatus.surveySubmissions?.error || null,
    lastSyncTime: syncStatus.surveySubmissions?.lastSyncTime || null,
    refresh: () => refresh("surveySubmissions", forceSync),
  };
};