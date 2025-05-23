import { FormField, ISurveySubmission } from "~/types";
import { Realm } from "@realm/react";
import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import { RealmContext } from "~/providers/RealContextProvider";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { filterDataByUserId } from "./filterData";
import { useAuth } from "~/lib/hooks/useAuth";
import { useDataSync } from "./dataSync";
const { useRealm, useQuery } = RealmContext;

export const createSurveySubmission = (
  formData: Record<string, any>,
  fields: FormField[],
  realm: Realm
) => {
  const answers = Object.fromEntries(
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

  // Create structured submission according to new interface
  const submission = {
    id: getNextAvailableId(realm),
    answers: answers as { [key: string]: string | number | boolean | null },
    form_data: {
      time_spent_filling_the_form: formData.timeSpentFormatted,
      user_id: formData.userId,
      table_name: formData.table_name,
      project_module_id: formData.project_module_id,
      source_module_id: formData.source_module_id,
      project_id: formData.project_id,
      survey_id: formData.survey_id,
      post_data: formData.post_data,
      izucode: formData.izucode,
      family: formData.family,
      form_status: "followup",
      cohort: formData.cohort,
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
      sync_reason: "pending",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
    } as { [key: string]: string | number | boolean | null | Date },
  };

  return realm.create<SurveySubmission>(SurveySubmission, submission);
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
    sync_status: false,
    sync_reason: "Created offline",
    sync_attempts: 0,
    last_sync_attempt: new Date(),
    submitted_at: new Date(),
  } as { [key: string]: string | number | boolean | null | Date };

  return createSurveySubmission(
    {
      ...formData,
      id: localId,
      sync_data: syncData,
    },
    fields,
    realm
  );
}

export const saveSurveySubmissionToAPI = async (
  realm: Realm,
  formData: Record<string, any>,
  apiUrl: string,
  fields: FormField[] = []
): Promise<SurveySubmission> => {
  try {
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
      time_spent_filling_the_form: formData.timeSpentFormatted || null,
      user_id: formData.userId || null,
      table_name: formData.table_name || null,
      project_module_id: formData.project_module_id || null,
      source_module_id: formData.source_module_id || null,
      project_id: formData.project_id || null,
      survey_id: formData.survey_id || null,
      post_data: formData.post_data || null,
      izucode: formData.izucode || null,
      family: formData.family || null,
      form_status: "followup",
      cohort: formData.cohort || null,
    };

    // Prepare sync data
    const syncData = formData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
    };

    const sanitizedFormData = {
      ...formData,
      id: formData.id || getNextAvailableId(realm),
      sync_data: syncData,
      form_data: formDataObj,
      location,
    };

    console.log(
      "Sanitized form data:",
      JSON.stringify(sanitizedFormData, null, 2)
    );

    const isConnected = isOnline();
    console.log("Network connection status:", isConnected);

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        console.log("Attempting to send data to API");
        // Prepare data for API - exclude the fields that should be standardized
        const { userId, timeSpentFormatted, ...formDataWithoutDuplicates } =
          formData;

        // Combine the form data without duplicates and the standardized form data
        const apiData = {
          ...formDataWithoutDuplicates,
          ...sanitizedFormData.form_data,
          ...sanitizedFormData.location,
        };

        console.log(
          "Data being sent to API:",
          JSON.stringify(apiData, null, 2)
        );

        // Send to API
        const response = await baseInstance.post(apiUrl, apiData);
        console.log(
          "Survey submission API response:",
          JSON.stringify(response.data, null, 2)
        );

        let submission: SurveySubmission;

        // Wrap all Realm operations in a write transaction
        realm.write(() => {
          if (response.data?.result?.id) {
            console.log("API returned ID:", response.data.result.id);

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
              },
            };

            console.log(
              "Complete data for Realm:",
              JSON.stringify(completeData, null, 2)
            );

            submission = createSurveySubmission(completeData, fields, realm);
          } else {
            console.log("API did not return an ID, creating with local ID");
            submission = createSurveySubmission(
              sanitizedFormData,
              fields,
              realm
            );
          }
        });

        return submission!;
      } catch (error: any) {
        console.log("Error submitting survey to API:", error);
        console.log("Error response:", error.response?.data);
        console.log(
          "Error details:",
          JSON.stringify(error, Object.getOwnPropertyNames(error))
        );
        console.log("Falling back to offline mode due to API error");

        let submission: SurveySubmission;
        realm.write(() => {
          submission = createTemporarySurveySubmission(
            realm,
            sanitizedFormData,
            fields
          );
        });
        return submission!;
      }
    } else {
      console.log("Offline mode - creating temporary survey submission record");
      let submission: SurveySubmission;
      realm.write(() => {
        submission = createTemporarySurveySubmission(
          realm,
          sanitizedFormData,
          fields
        );
      });
      return submission!;
    }
  } catch (error) {
    console.log("Error saving survey submission to API:", error);
    console.log(
      "Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    throw error;
  }
};

export const syncPendingSubmissions = async (realm: Realm) => {
  if (!isOnline()) {
    console.log("Cannot sync pending submissions - offline");
    return;
  }

  const pendingSubmissions = realm
    .objects<SurveySubmission>(SurveySubmission)
    .filtered("sync_data.sync_status == false");

  console.log(`Found ${pendingSubmissions.length} submissions to sync`);

  for (const submission of pendingSubmissions) {
    try {
      const locationData = submission.location || {};

      const apiData = {
        id: submission.id,
        ...submission.answers,
        ...locationData,
        ...(submission.form_data || {}),
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
      }
    } catch (error: any) {
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
    return filterDataByUserId(allLocalSubmissions, user.id);
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
