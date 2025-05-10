import { FormField, ISurveySubmission } from "~/types";
import { Realm } from "@realm/react";
import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import { RealmContext } from "~/providers/RealContextProvider";
import { useState, useCallback, useEffect, useRef } from "react";
import { SurveySubmission } from "~/models/surveys/survey-submission";
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
      "enrollment_date"
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
    console.error("Error fetching survey submissions from remote:", error);
    throw error;
  }
}

export function useGetRemoteSurveySubmissions(forceSync: boolean = false) {
  const realm = useRealm();
  const [surveySubmissions, setSurveySubmissions] = useState<
    ISurveySubmission[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Prevent excessive API calls with a ref to track if we're already fetching
  const isFetchingRef = useRef(false);
  // Track last fetch time to enforce minimum interval between fetches
  const lastFetchTimeRef = useRef<number>(0);
  // Minimum time between API calls in milliseconds (5 seconds)
  const MIN_FETCH_INTERVAL = 5000;

  const fetchAndSaveSubmissions = useCallback(async () => {
    // Skip if already fetching or if it's too soon since last fetch
    const now = Date.now();
    if (
      isFetchingRef.current ||
      now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL
    ) {
      console.log(
        "Skipping fetch: " +
          (isFetchingRef.current
            ? "Already fetching"
            : "Too soon since last fetch")
      );
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      // Update last fetch time
      lastFetchTimeRef.current = now;

      console.log("Starting API fetch for survey submissions...");
      // Fetch submissions from the remote API
      const remoteSubmissions = await fetchSurveySubmissionsFromRemote();
      console.log(`Transformed ${remoteSubmissions.length} survey submissions`);

      // Keep track of processed IDs to prevent duplicates
      const processedIds = new Set<string>();
      let newCount = 0;
      let updatedCount = 0;
      let duplicateCount = 0;

      // Save to Realm database
      realm.write(() => {
        remoteSubmissions.forEach((submission) => {
          // Generate a unique ID for each response based on response ID
          const uniqueId = submission.id.toString();

          // Skip if already processed in this batch (handles duplicates in API response)
          if (processedIds.has(uniqueId)) {
            console.log(`Skipping duplicate in API response: ${uniqueId}`);
            duplicateCount++;
            return;
          }

          processedIds.add(uniqueId);

          // Check if the submission already exists
          const existingSubmission =
            realm.objectForPrimaryKey<ISurveySubmission>(
              "SurveySubmission",
              submission.id
            );

          if (existingSubmission) {
            // Update existing submission without changing the id
            const { id, ...submissionWithoutId } = submission;
            Object.assign(existingSubmission, submissionWithoutId);
            updatedCount++;
          } else {
            // Create new submission
            realm.create("SurveySubmission", submission);
            newCount++;
          }
        });
      });

      console.log(
        `Survey sync results: ${newCount} new, ${updatedCount} updated, ${duplicateCount} duplicates skipped`
      );

      // Get the latest count
      const totalInDatabase =
        realm.objects<ISurveySubmission>("SurveySubmission").length;
      console.log(`Total survey submissions in database: ${totalInDatabase}`);

      // Update state
      setSurveySubmissions(remoteSubmissions as ISurveySubmission[]);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error("Error in fetchAndSaveSubmissions:", err);
      setError(err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [realm]);

  // Initial fetch - use useEffect with proper control
  useEffect(() => {
    let isMounted = true;

    const doFetch = async () => {
      // Only fetch if component is still mounted and we need to fetch (force or no last sync)
      if (isMounted && (forceSync || !lastSyncTime)) {
        await fetchAndSaveSubmissions();
      }
    };

    doFetch();

    // Cleanup function to prevent state updates if unmounted
    return () => {
      isMounted = false;
    };
  }, [forceSync]); // Remove fetchAndSaveSubmissions from deps to prevent loops

  const refresh = useCallback(() => {
    return fetchAndSaveSubmissions();
  }, [fetchAndSaveSubmissions]);

  return {
    surveySubmissions,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}

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
    console.log(
      "saveSurveySubmissionToAPI received data:",
      JSON.stringify(formData, null, 2)
    );
    console.log("API URL:", apiUrl);
    console.log("Fields:", JSON.stringify(fields, null, 2));

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

    console.log("Prepared location data:", JSON.stringify(location, null, 2));

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
      id: formData.id || null,
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
        // Prepare data for API
        const apiData = {
          ...formData,
          ...(sanitizedFormData.form_data || {}),
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
            submission = createSurveySubmission(sanitizedFormData, fields, realm);
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
        submission = createTemporarySurveySubmission(realm, sanitizedFormData, fields);
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

      if (response.data?.result?.id) {
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

export const useGetAllSurveySubmissions = () => {
  const surveySubmissions = useQuery<ISurveySubmission>("SurveySubmission");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Set loading to false once the query has been executed
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [surveySubmissions, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setIsLoading(true);
  }, []);

  return {
    surveySubmissions: surveySubmissions.map((submission) => ({
      ...submission,
      answers: Object.fromEntries(
        Object.entries(submission.answers).map(([key, value]) => [
          key,
          value?.toString() ?? "",
        ])
      ),
    })),
    isLoading,
    error: null,
    refresh,
  };
};
