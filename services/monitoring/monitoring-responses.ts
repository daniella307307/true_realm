import { MonitoringResponses } from "~/models/monitoring/monitoringresponses";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { Realm } from "@realm/react";
import { useDataSync } from "../dataSync";
import { isOnline } from "../network";
import { useAuth } from "~/lib/hooks/useAuth";

const { useQuery, useRealm } = RealmContext;

export async function fetchMonitoringResponsesFromRemote() {
  const res = await baseInstance.get<{
    monitoring_responses: any[];
  }>("/monitoring/responses");
  return {
    monitoring_responses: res.data.monitoring_responses || [],
  };
}

export function useGetMonitoringResponses(forceSync: boolean = false) {
  const realm = useRealm();
  const storedResponses = useQuery(MonitoringResponses);
  const { user } = useAuth({});

  const { syncStatus, refresh } = useDataSync([
    {
      key: "monitoring_responses",
      fetchFn: fetchMonitoringResponsesFromRemote,
      model: MonitoringResponses,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
      transformData: (data: { monitoring_responses: any[] }) => {
        if (!data.monitoring_responses || data.monitoring_responses.length === 0) {
          console.log("No monitoring responses data to transform");
          return [];
        }

        return data.monitoring_responses.map((response) => ({
          ...response,
          sync_data: {
            sync_status: true,
            sync_reason: "Fetched from server",
            sync_attempts: 0,
            last_sync_attempt: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          },
        }));
      },
    },
  ]);

  return {
    responses: storedResponses,
    isLoading: syncStatus.monitoring_responses?.isLoading || false,
    error: syncStatus.monitoring_responses?.error || null,
    lastSyncTime: syncStatus.monitoring_responses?.lastSyncTime || null,
    refresh: () => refresh("monitoring_responses", forceSync),
  };
}

// Function to get all locally created monitoring responses
export function useGetAllLocallyCreatedMonitoringResponses() {
  const storedResponses = useQuery(MonitoringResponses);

  return {
    locallyCreatedResponses: storedResponses.filter(
      (response) =>
        response.sync_data?.sync_status === true ||
        response.sync_data?.sync_status === false
    ),
    isLoading: false,
    error: null,
    lastSyncTime: null,
    refresh: () => {},
  };
}

function getNextAvailableId(realm: Realm): number {
  try {
    const responses = realm.objects<MonitoringResponses>(MonitoringResponses);
    if (responses.length > 0) {
      return Math.max(...responses.map((r) => r.id)) + 1;
    }
    return 1; // Start with 1 if no records exist
  } catch (error) {
    console.log("Error getting next ID, using default:", error);
    return 1;
  }
}

export const createMonitoringResponse = (
  realm: Realm,
  responseData: Record<string, any>
): MonitoringResponses => {
  try {
    // Generate or use provided ID
    const id =
      typeof responseData.id === "number"
        ? responseData.id
        : getNextAvailableId(realm);

    const syncData = responseData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    };

    const response = {
      id,
      family_id: responseData.family_id,
      module_id: responseData.module_id,
      form_id: responseData.form_id,
      project_id: responseData.project_id,
      date_recorded: responseData.date_recorded,
      type: responseData.type,
      cohort: responseData.cohort,
      user_id: responseData.user_id || null,
      score_data: responseData.score_data || {},
      json: typeof responseData.json === 'string' 
        ? responseData.json 
        : JSON.stringify(responseData.response || {}),
      sync_data: syncData,
    };

    console.log("Creating monitoring response with data:", JSON.stringify(response, null, 2));

    let result;
    realm.write(() => {
      result = realm.create(MonitoringResponses, response, Realm.UpdateMode.Modified);
    });
    if (!result) {
      throw new Error("Failed to create monitoring response object");
    }
    return result;
  } catch (error) {
    console.log("Error creating monitoring response:", error);
    throw error;
  }
};

function createTemporaryMonitoringResponse(
  realm: Realm,
  responseData: Record<string, any>
): MonitoringResponses {
  // We'll keep the same ID format but mark it as temporary
  const localId = getNextAvailableId(realm);

  // Add sync data marking this as needing to be synced
  const syncData = {
    sync_status: false,
    sync_reason: "Created offline",
    sync_attempts: 0,
    last_sync_attempt: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
  };

  return createMonitoringResponse(
    realm,
    {
      ...responseData,
      id: localId,
      sync_data: syncData,
    }
  );
}

// Function to replace a temporary response with the official one from API
function replaceTemporaryMonitoringResponse(
  realm: Realm,
  tempResponse: MonitoringResponses,
  apiData: Record<string, any>
): MonitoringResponses {
  // We'll update the existing record with API data, keeping the same local ID
  const updatedResponse = {
    ...apiData,
    id: tempResponse.id, // Keep the same local ID
    sync_data: {
      sync_status: true,
      sync_reason: "Synced with server",
      sync_attempts:
        (tempResponse.sync_data?.sync_attempts
          ? Number(tempResponse.sync_data.sync_attempts)
          : 0) + 1,
      last_sync_attempt: new Date().toISOString(),
      submitted_at:
        tempResponse.sync_data?.submitted_at || new Date().toISOString(),
    },
  };

  return createMonitoringResponse(realm, updatedResponse);
}

export const saveMonitoringResponseToAPI = async (
  realm: Realm,
  responseData: Record<string, any>,
  apiUrl: string = "/sendMonitoringData"
): Promise<MonitoringResponses> => {
  try {
    console.log(
      "saveMonitoringResponseToAPI received data:",
      JSON.stringify(responseData, null, 2)
    );

    // Format response data
    const sanitizedResponseData = {
      family_id: responseData.family || responseData.family_id,
      module_id: responseData.module_id,
      form_id: responseData.form_id,
      project_id: responseData.project_id,
      date_recorded: responseData.date_recorded,
      type: responseData.type || "1",
      cohort: responseData.cohort,
      user_id: responseData.user_id || null,
      score_data: responseData.score_data || {},
      json: typeof responseData.response === 'object' 
        ? JSON.stringify(responseData.response) 
        : responseData.json || "{}",
      sync_data: {
        sync_status: false,
        sync_reason: "New record",
        sync_attempts: 0,
        last_sync_attempt: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      },
    };

    const isConnected = isOnline();

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        // Prepare data for API 
        const apiData = {
          family_id: sanitizedResponseData.family_id,
          module_id: sanitizedResponseData.module_id,
          form_id: sanitizedResponseData.form_id,
          project_id: sanitizedResponseData.project_id,
          date_recorded: sanitizedResponseData.date_recorded,
          type: sanitizedResponseData.type,
          cohort: sanitizedResponseData.cohort,
          score_data: sanitizedResponseData.score_data,
          response: typeof responseData.response === 'object' 
            ? responseData.response 
            : JSON.parse(sanitizedResponseData.json),
        };

        // Send to API
        const response = await baseInstance.post(apiUrl, apiData);
        console.log(
          "Monitoring response API submission response:",
          JSON.stringify(response.data, null, 2)
        );

        // Create the monitoring response object with the API data but keep local ID
        if (response.data?.result?.id) {
          const completeData = {
            ...sanitizedResponseData,
            id: response.data.result.id,
            family_id: response.data.result.family_id,
            json: response.data.result.json || sanitizedResponseData.json,
            sync_data: {
              sync_status: true,
              sync_reason: "Successfully synced",
              sync_attempts: 1,
              last_sync_attempt: new Date().toISOString(),
              submitted_at: new Date().toISOString(),
            },
            // Include any other fields returned from the API
            ...response.data.result,
          };

          return createMonitoringResponse(realm, completeData);
        } else {
          // If API didn't return an ID, create with locally generated ID
          return createMonitoringResponse(realm, sanitizedResponseData);
        }
      } catch (apiError) {
        console.log("Error submitting monitoring response to API:", apiError);
        // Fall back to offline approach if API submission fails
        return createTemporaryMonitoringResponse(realm, sanitizedResponseData);
      }
    } else {
      // Offline mode - create with locally generated ID
      // These will be marked for sync later
      console.log("Offline mode - creating temporary monitoring response record");
      return createTemporaryMonitoringResponse(realm, sanitizedResponseData);
    }
  } catch (error) {
    console.log("Error in saveMonitoringResponseToAPI:", error);
    throw error;
  }
};

// Function to sync temporary monitoring responses with the server
export const syncTemporaryMonitoringResponses = async (
  realm: Realm,
  apiUrl: string = "/monitoring/responses"
): Promise<void> => {
  if (!isOnline()) {
    console.log("Cannot sync temporary monitoring responses - offline");
    return;
  }

  // Find all monitoring responses that need syncing
  const responsesToSync = realm
    .objects<MonitoringResponses>(MonitoringResponses)
    .filtered("sync_data.sync_status == false");

  for (const response of responsesToSync) {
    try {
      // Extract data to send to API
      const responseJson = response.json || "{}";
      const parsedJson = JSON.parse(responseJson);

      const apiData = {
        family_id: response.family_id,
        module_id: response.module_id,
        form_id: response.form_id,
        project_id: response.project_id,
        date_recorded: response.date_recorded,
        type: response.type,
        cohort: response.cohort,
        score_data: response.score_data || {},
        response: parsedJson,
      };

      console.log("Syncing monitoring response to API:", JSON.stringify(apiData, null, 2));
      console.log("API URL:", apiUrl);
      
      // Submit to API
      const apiResponse = await baseInstance.post(apiUrl, apiData);

      if (apiResponse.data?.result?.id) {
        // Update the record with API data
        replaceTemporaryMonitoringResponse(realm, response, {
          ...apiData,
          id: apiResponse.data.result.id,
          json: apiResponse.data.result.json || responseJson,
          user_id: apiResponse.data.result.user_id || response.user_id,
          ...apiResponse.data.result,
          sync_data: {
            sync_status: true,
            sync_reason: "Successfully synced",
            sync_attempts: 1,
            last_sync_attempt: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          },
        });
        console.log(
          `Successfully synced monitoring response ${response.id} to server, updated with id: ${apiResponse.data.result.id}`
        );
      }
    } catch (error: any) {
      // Update sync data to record the failure
      realm.write(() => {
        if (response.sync_data) {
          response.sync_data.sync_status = false;
          response.sync_data.sync_reason = `Failed: ${
            error?.message || "Unknown error"
          }`;
          response.sync_data.sync_attempts =
            Number(response.sync_data.sync_attempts || 0) + 1;
          response.sync_data.last_sync_attempt = new Date().toISOString();
        }
      });
      console.log(`Failed to sync monitoring response ${response.id}:`, error);
      // Continue with other records - this one will be tried again next sync
    }
  }
}; 