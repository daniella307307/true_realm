import { FormField, ISurveySubmission } from "~/types";
import { Realm } from "@realm/react";
import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import { RealmContext } from "~/providers/RealContextProvider";
import { useState, useCallback, useEffect, useRef } from "react";
const { useRealm, useQuery } = RealmContext;

export const createSurveySubmission = (
  formData: Record<string, any>,
  fields: FormField[]
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
            return [field.key, value ? new Date(value).toISOString() : null];
          default:
            return [field.key, value ?? null];
        }
      })
  );

  // Create structured submission according to new interface
  return {
    _id: new Realm.BSON.ObjectId(),
    answers,
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
    },
    location: {
      province: formData.province,
      district: formData.district,
      sector: formData.sector,
      cell: formData.cell,
      village: formData.village,
    },
    sync_data: {
      sync_status: false,
      sync_reason: "pending",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
    },
  };
};

// Transform API response survey submissions to the ISurveySubmission format
export const transformApiSurveySubmissions = (apiResponses: any[]) => {
  return apiResponses.map(response => {
    // Parse the JSON field to extract data
    const jsonData = typeof response.json === 'string' ? JSON.parse(response.json) : response.json;
    
    // Extract answers from jsonData by removing metadata fields
    const metadataFields = [
      '_id', 'Time_spent_filling_the_form', 'userId', 'table_name', 'project_module_id', 
      'source_module_id', 'project_id', 'survey_id', 'post_data', 'izucode', 'family',
      'province', 'district', 'sector', 'cell', 'village', 'submittedAt',
      'province_name', 'district_name', 'sector_name', 'cell_name', 'village_name',
      'izu_name', 'familyID', 'hh_head_fullname', 'enrollment_date'
    ];
    
    const answers: Record<string, any> = {};
    Object.keys(jsonData).forEach(key => {
      if (!metadataFields.includes(key)) {
        answers[key] = jsonData[key];
      }
    });
    
    // Create the transformed submission
    return {
      _id: new Realm.BSON.ObjectId(jsonData._id || new Realm.BSON.ObjectId().toString()),
      answers,
      form_data: {
        time_spent_filling_the_form: jsonData.Time_spent_filling_the_form || null,
        user_id: jsonData.userId || response.user_id || null,
        table_name: jsonData.table_name || null,
        project_module_id: jsonData.project_module_id || response.project_module_id || null,
        source_module_id: jsonData.source_module_id || response.module_id || null,
        project_id: jsonData.project_id || response.project_id || null,
        survey_id: jsonData.survey_id || response.survey_id || null,
        post_data: jsonData.post_data || null,
        izucode: jsonData.izucode || null,
        family: jsonData.family || response.families_id || null,
        form_status: "followup",
        cohort: response.cohort || null,
      },
      location: {
        province: jsonData.province || null,
        district: jsonData.district || null,
        sector: jsonData.sector || null,
        cell: jsonData.cell || null,
        village: jsonData.village || null,
      },
      sync_data: {
        sync_status: true, // Since this comes from the API, it's already synced
        sync_reason: "Success, comes from the API",
        sync_attempts: 1,
        last_sync_attempt: new Date(),
        submitted_at: new Date(jsonData.submittedAt || response.created_at || new Date()),
      },
    };
  });
};

export async function fetchSurveySubmissionsFromRemote() {
  try {
    const res = await baseInstance.get('/responses');
    console.log(`Received ${res.data.responses.length} survey submissions from API`);
    
    // Transform the API response data to match our Realm model
    return transformApiSurveySubmissions(res.data.responses);
  } catch (error) {
    console.error('Error fetching survey submissions from remote:', error);
    throw error;
  }
}

export function useGetRemoteSurveySubmissions(forceSync: boolean = false) {
  const realm = useRealm();
  const [surveySubmissions, setSurveySubmissions] = useState<ISurveySubmission[]>([]);
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
    if (isFetchingRef.current || (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL)) {
      console.log('Skipping fetch: ' + (isFetchingRef.current ? 'Already fetching' : 'Too soon since last fetch'));
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      // Update last fetch time
      lastFetchTimeRef.current = now;
      
      console.log('Starting API fetch for survey submissions...');
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
        remoteSubmissions.forEach(submission => {
          // Generate a unique ID for each response based on MongoDB _id and response ID
          const uniqueId = submission._id.toString();
          
          // Skip if already processed in this batch (handles duplicates in API response)
          if (processedIds.has(uniqueId)) {
            console.log(`Skipping duplicate in API response: ${uniqueId}`);
            duplicateCount++;
            return;
          }
          
          processedIds.add(uniqueId);
          
          // Check if the submission already exists
          const existingSubmission = realm.objectForPrimaryKey<ISurveySubmission>(
            'SurveySubmission', 
            submission._id
          );
          
          if (existingSubmission) {
            // Update existing submission without changing the _id
            const { _id, ...submissionWithoutId } = submission;
            Object.assign(existingSubmission, submissionWithoutId);
            updatedCount++;
          } else {
            // Create new submission
            realm.create('SurveySubmission', submission);
            newCount++;
          }
        });
      });
      
      console.log(`Survey sync results: ${newCount} new, ${updatedCount} updated, ${duplicateCount} duplicates skipped`);
      
      // Get the latest count
      const totalInDatabase = realm.objects<ISurveySubmission>("SurveySubmission").length;
      console.log(`Total survey submissions in database: ${totalInDatabase}`);
      
      // Update state
      setSurveySubmissions(remoteSubmissions);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Error in fetchAndSaveSubmissions:', err);
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

export const saveSurveySubmission = async (
  realm: Realm,
  formData: Record<string, any>,
  fields: FormField[]
) => {
  try {
    const submission = createSurveySubmission(formData, fields);
    const isConnected = isOnline();
    let result;

    // If online, first try to submit to API
    if (isConnected) {
      try {
        // Prepare data for API submission - flatten the structure
        const apiSubmission = {
          ...submission.answers,
          _id: submission._id,
          Time_spent_filling_the_form:
            submission.form_data?.time_spent_filling_the_form,
          userId: submission.form_data?.user_id,
          table_name: submission.form_data?.table_name,
          project_module_id: submission.form_data?.project_module_id,
          source_module_id: submission.form_data?.source_module_id,
          project_id: submission.form_data?.project_id,
          survey_id: submission.form_data?.survey_id,
          post_data: submission.form_data?.post_data,
          izucode: submission.form_data?.izucode,
          family: submission.form_data?.family,
          province: submission.location?.province,
          district: submission.location?.district,
          sector: submission.location?.sector,
          cell: submission.location?.cell,
          village: submission.location?.village,
          submittedAt: submission.sync_data?.submitted_at,
        };

        const response = await baseInstance.post(
          formData.post_data,
          apiSubmission
        );
        console.log("response data:", JSON.stringify(response.data, null, 2));

        if (response.data.result) {
          console.log("API submission successful and has result object");
          realm.write(() => {
            // Update sync data to reflect successful sync
            const syncedSubmission = {
              ...submission,
              sync_data: {
                ...submission.sync_data,
                sync_status: true,
                sync_reason: "Success",
                sync_attempts: 1,
                last_sync_attempt: new Date(),
              },
              form_data: {
                ...submission.form_data,
                form_status: "followup",
              },
            };
            // console.log("Submission with sync status:", syncedSubmission);
            result = realm.create("SurveySubmission", syncedSubmission);
          });
          console.log("Submission saved to realm.", response.data);
          return result;
        }
      } catch (error: any) {
        console.log(`Sync status changed to saved ${submission._id}`);
        if (error.response?.status === 400) {
          // Handle 400 error specifically
          realm.write(() => {
            const syncedSubmission = {
              ...submission,
              sync_data: {
                ...submission.sync_data,
                sync_status: true,
                sync_reason: "Already, accepted",
                sync_attempts: 1,
                last_sync_attempt: new Date(),
              },
              form_data: {
                ...submission.form_data,
                form_status: "followup",
              },
            };
            result = realm.create("SurveySubmission", syncedSubmission);
          });
          console.log("Submission saved to offline realm.", error.response);
          console.log("Advanced error:", error.response.data);
          return result;
        }
        console.log("Error submitting to API:", error);
      }
    }

    // Save offline if online submission failed or device is offline
    let offlineResult;
    realm.write(() => {
      // Create with pending sync status
      offlineResult = realm.create("SurveySubmission", submission);
    });

    return offlineResult;
  } catch (error) {
    console.error("Error saving survey submission:", error);
    throw error;
  }
};

const syncWithRemote = async (
  submission: ISurveySubmission,
  apiUrl: string,
  realm: Realm
) => {
  try {
    let result;
    // Prepare data for API submission
    const apiSubmission = {
      ...submission.answers,
      _id: submission._id,
      Time_spent_filling_the_form:
        submission.form_data?.time_spent_filling_the_form,
      userId: submission.form_data?.user_id,
      table_name: submission.form_data?.table_name,
      project_module_id: submission.form_data?.project_module_id,
      source_module_id: submission.form_data?.source_module_id,
      project_id: submission.form_data?.project_id,
      survey_id: submission.form_data?.survey_id,
      post_data: submission.form_data?.post_data,
      izucode: submission.form_data?.izucode,
      family: submission.form_data?.family,
      province: submission.location?.province,
      district: submission.location?.district,
      sector: submission.location?.sector,
      cell: submission.location?.cell,
      village: submission.location?.village,
      submittedAt: submission.sync_data?.submitted_at,
    };

    // console.log("Syncing submission with remote server:", apiSubmission);

    const response = await baseInstance.post(apiUrl, apiSubmission);
    console.log("Response data: ", JSON.stringify(response.data, null, 2));

    if (response.data.result) {
      console.log("API submission successful and has result object");
      realm.write(() => {
        // Update sync data to reflect successful sync
        if (submission.sync_data) {
          submission.sync_data.sync_status = true;
          submission.sync_data.sync_reason = "Success";
          submission.sync_data.sync_attempts =
            (submission.sync_data.sync_attempts || 0) + 1;
          submission.sync_data.last_sync_attempt = new Date();
        }

        if (submission.form_data) {
          submission.form_data.form_status = "followup";
        }
      });
      console.log("Submission updated in realm.");
      return submission;
    }
  } catch (error: any) {
    console.log("Error syncing with remote server:", error);
    // When status is 400, update sync status to failed
    if (error.response?.status === 400) {
      if (error.response.data.isSaved === true) {
        console.log("Submission already exists in the database");
        // Update the submission in the realm
        realm.write(() => {
          if (submission.sync_data) {
            submission.sync_data.sync_status = true;
            submission.sync_data.sync_reason = "Already, accepted";
            submission.sync_data.sync_attempts =
              (submission.sync_data.sync_attempts || 0) + 1;
            submission.sync_data.last_sync_attempt = new Date();
          }

          if (submission.form_data) {
            submission.form_data.form_status = "followup";
          }
        });
        console.log("Submission updated in offline realm as already accepted");
      } else {
        realm.write(() => {
          if (submission.sync_data) {
            submission.sync_data.sync_status = false;
            submission.sync_data.sync_reason = "Rejected by the server";
            submission.sync_data.sync_attempts =
              (submission.sync_data.sync_attempts || 0) + 1;
            submission.sync_data.last_sync_attempt = new Date();
          }

          if (submission.form_data) {
            submission.form_data.form_status = "followup";
          }
        });
        console.log("Submission rejected by the server and offline");
      }
      return submission;
    } else if (error.message === "Network Error") {
      console.log("Network error for submission", submission._id);
      // Update sync status to network error
      realm.write(() => {
        if (submission.sync_data) {
          submission.sync_data.sync_status = false;
          submission.sync_data.sync_reason = "Network Error";
          submission.sync_data.sync_attempts =
            (submission.sync_data.sync_attempts || 0) + 1;
          submission.sync_data.last_sync_attempt = new Date();
        }
      });
      console.log("Submission updated in offline realm with network error");
      return submission;
    } else {
      console.log("Other error type:", error);
      // Update sync status to other error
      realm.write(() => {
        if (submission.sync_data) {
          submission.sync_data.sync_status = false;
          submission.sync_data.sync_reason = "Other error";
          submission.sync_data.sync_attempts =
            (submission.sync_data.sync_attempts || 0) + 1;
          submission.sync_data.last_sync_attempt = new Date();
        }
      });
      console.log("Submission updated in offline realm with other error");
      return submission;
    }
  }
};

export const syncPendingSubmissions = async (realm: Realm) => {
  const pendingSubmissions = realm
    .objects<ISurveySubmission>("SurveySubmission")
    .filtered("sync_data.sync_status == false");

  for (const submission of pendingSubmissions) {
    await syncWithRemote(submission, "/sendVisitData", realm);
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
