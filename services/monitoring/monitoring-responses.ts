import { MonitoringResponses } from "../../models/monitoring/monitoringresponses";
import { RealmContext } from "../../providers/RealContextProvider";
import { baseInstance } from "../../utils/axios";
import { Realm } from "@realm/react";
import { useDataSync } from "../dataSync";
import { isOnline } from "../network";
import { useAuth } from "../../lib/hooks/useAuth";
import { useMemo } from "react";
import { filterDataByUserId } from "../filterData";
import { Izu } from "~/models/izus/izu";
import { SyncType } from "../../types";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { TFunction } from "i18next";

const { useQuery, useRealm } = RealmContext;

export async function fetchMonitoringResponsesFromRemote() {
  const res = await baseInstance.get<{
    performances: any[];
  }>("/get-performances");

  // Create a map of existing IDs from the response to prevent duplicates
  const uniquePerformances = res.data.performances.reduce(
    (acc, performance) => {
      // Only add if we haven't seen this ID before
      if (!acc.has(performance.id)) {
        acc.set(performance.id, performance);
      }
      return acc;
    },
    new Map()
  );

  return {
    monitoring_responses: Array.from(uniquePerformances.values()) || [],
  };
}

export function useGetMonitoringResponses(forceSync: boolean = false) {
  const realm = useRealm();
  const storedResponses = useQuery(MonitoringResponses);
  const { user } = useAuth({});

  // Filter responses by the current user
  const userFilteredResponses = useMemo(() => {
    if (!user || !user.id) return storedResponses;
    return filterDataByUserId(storedResponses, user.id);
  }, [storedResponses, user]);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "monitoring_responses",
      fetchFn: fetchMonitoringResponsesFromRemote,
      model: MonitoringResponses,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
      transformData: (data: { monitoring_responses: any[] }) => {
        if (
          !data.monitoring_responses ||
          data.monitoring_responses.length === 0
        ) {
          console.log("No monitoring responses data to transform");
          return [];
        }

        return data.monitoring_responses.map((response) => {
          // Handle score_data parsing
          let parsedScoreData = {};
          if (response.score_data) {
            try {
              // If score_data is a string, parse it
              parsedScoreData =
                typeof response.score_data === "string"
                  ? JSON.parse(response.score_data)
                  : response.score_data;
            } catch (error) {
              console.log("Error parsing score_data:", error);
              parsedScoreData = {};
            }
          }

          return {
            ...response,
            score_data: parsedScoreData,
            sync_data: {
              sync_status: true,
              sync_reason: "Fetched from server",
              sync_attempts: 0,
              sync_type: SyncType.monitoring_responses,
              last_sync_attempt: new Date().toISOString(),
              submitted_at: new Date().toISOString(),
              created_by_user_id: user.id,
            },
          };
        });
      },
    },
  ]);

  // console.log("stored Monitoring Responses: ", JSON.stringify(storedResponses, null, 2));

  return {
    responses: userFilteredResponses,
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
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
      created_by_user_id: responseData.user_id || null,
      sync_type: SyncType.monitoring_responses,
    };

    // Parse score_data if it's a string
    let parsedScoreData = {};
    if (responseData.score_data) {
      try {
        parsedScoreData = typeof responseData.score_data === 'string'
          ? JSON.parse(responseData.score_data)
          : responseData.score_data;
      } catch (error) {
        console.log("Error parsing score_data:", error);
        parsedScoreData = {};
      }
    }

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
      score_data: parsedScoreData,
      json:
        typeof responseData.json === "string"
          ? responseData.json
          : JSON.stringify(responseData.response || {}),
      sync_data: syncData,
    };

    let result;
    
    // Handle transaction
    const createResponseInRealm = () => {
      return realm.create(MonitoringResponses, response, Realm.UpdateMode.Modified);
    };

    if (realm.isInTransaction) {
      result = createResponseInRealm();
    } else {
      realm.write(() => {
        result = createResponseInRealm();
      });
    }

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

  // Add sync data using values from sanitized data if available
  const syncData = {
    sync_status: responseData.sync_data?.sync_status ?? false,
    sync_type: responseData.sync_data?.sync_type ?? SyncType.monitoring_responses,
    sync_reason: "Created offline",
    sync_attempts: responseData.sync_data?.sync_attempts ?? 0,
    last_sync_attempt: responseData.sync_data?.last_sync_attempt ?? new Date().toISOString(),
    submitted_at: responseData.sync_data?.submitted_at ?? new Date().toISOString(),
    created_by_user_id: responseData.sync_data?.created_by_user_id,
  };

  let response: MonitoringResponses;
  
  if (realm.isInTransaction) {
    response = createMonitoringResponse(realm, {
      ...responseData,
      id: localId,
      sync_data: syncData,
    });
  } else {
    realm.write(() => {
      response = createMonitoringResponse(realm, {
        ...responseData,
        id: localId,
        sync_data: syncData,
      });
    });
  }
  return response!;
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
      sync_type: SyncType.monitoring_responses,
      sync_attempts:
        (tempResponse.sync_data?.sync_attempts
          ? Number(tempResponse.sync_data.sync_attempts)
          : 0) + 1,
      last_sync_attempt: new Date().toISOString(),
      submitted_at:
        tempResponse.sync_data?.submitted_at || new Date().toISOString(),
      created_by_user_id: apiData.user_id,
    },
  };

  return createMonitoringResponse(realm, updatedResponse);
}

export const saveMonitoringResponseToAPI = async (
  realm: Realm,
  responseData: Record<string, any>,
  apiUrl: string,
  t: TFunction
): Promise<void> => {
  try {
    console.log(
      "saveMonitoringResponseToAPI received data:",
      JSON.stringify(responseData, null, 2)
    );

    // Check for duplicates first
    const existingResponses = realm.objects<MonitoringResponses>(MonitoringResponses);
    console.log("Family ID", responseData.family_id);
    console.log("Form ID", responseData.form_id);
    const isDuplicate = existingResponses.some(
      (response) =>
        response.family_id === responseData.family_id &&
        response.form_id === responseData.form_id
    );

    if (isDuplicate) {
      Toast.show({
        type: "error",
        text1: t("Alerts.error.title"),
        text2: t("Alerts.error.duplicate.monitoring"),
        position: "top",
        visibilityTime: 4000,
      });
      return;
    }

    // Get the logged in user's ID for created_by_user_id
    const loggedInCreatorId = responseData.created_by_user_id;

    // Get the selected IZU's ID for user_id
    const izus = realm.objects<Izu>(Izu);
    const izusArray = Array.from(izus);
    const izusById = izusArray.find(
      (izu) => izu.izucode === responseData.izucode
    );
    const izusId = izusById?.id;

    // Format response data
    const sanitizedResponseData = {
      family_id: responseData.family || responseData.family_id,
      module_id: responseData.module_id,
      form_id: responseData.form_id,
      project_id: responseData.project_id,
      date_recorded: responseData.date_recorded,
      type: responseData.type || "1",
      cohort: responseData.cohort,
      user_id: izusId, // This is the selected IZU's ID
      score_data: typeof responseData.score_data === 'string' 
        ? JSON.parse(responseData.score_data)
        : responseData.score_data || {},
      json: responseData.json,
      sync_data: {
        sync_status: false,
        sync_type: SyncType.monitoring_responses,
        sync_reason: "New record",
        sync_attempts: 0,
        last_sync_attempt: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        created_by_user_id: loggedInCreatorId, // This is the logged in user's ID
      },
    };

    const isConnected = isOnline();
    console.log("Network connection status:", isConnected);

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        Toast.show({
          type: "info",
          text1: t("Alerts.saving.monitoring"),
          text2: t("Alerts.submitting.server"),
          position: "top",
          visibilityTime: 2000,
        });

        console.log("Attempting to send data to API");

        // Prepare data for API
        const apiData = {
          family_id: sanitizedResponseData.family_id,
          module_id: sanitizedResponseData.module_id,
          form_id: sanitizedResponseData.form_id,
          project_id: sanitizedResponseData.project_id,
          date_recorded: sanitizedResponseData.date_recorded,
          type: sanitizedResponseData.type,
          cohort: sanitizedResponseData.cohort,
          user_id: sanitizedResponseData.user_id,
          score_data: typeof sanitizedResponseData.score_data === 'string'
            ? JSON.parse(sanitizedResponseData.score_data)
            : sanitizedResponseData.score_data,
          response:
            typeof responseData.response === "object"
              ? responseData.response
              : JSON.parse(sanitizedResponseData.json),
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
                ...sanitizedResponseData,
                id: response.data.result.id,
                family_id: response.data.result.family_id,
                json: response.data.result.json || sanitizedResponseData.json,
                score_data: typeof response.data.result.score_data === 'string' 
                  ? JSON.parse(response.data.result.score_data)
                  : response.data.result.score_data,
                sync_data: {
                  sync_status: true,
                  sync_reason: "Successfully synced",
                  sync_type: SyncType.monitoring_responses,
                  sync_attempts: 1,
                  last_sync_attempt: new Date().toISOString(),
                  submitted_at: new Date().toISOString(),
                  created_by_user_id: loggedInCreatorId,
                },
                ...response.data.result,
              };

              console.log(
                "Complete data for Realm:",
                JSON.stringify(completeData, null, 2)
              );

              try {
                createMonitoringResponse(realm, completeData);
                Toast.show({
                  type: "success",
                  text1: t("Alerts.success.title"),
                  text2: t("Alerts.success.monitoring"),
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
                createTemporaryMonitoringResponse(realm, sanitizedResponseData);
                Toast.show({
                  type: "info",
                  text1: t("Alerts.info.saved_locally"),
                  text2: t("Alerts.info.api_invalid"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving temporary response:", error);
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
            console.log("Error submitting monitoring response to API:", error);
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
              createTemporaryMonitoringResponse(realm, sanitizedResponseData);
              Toast.show({
                type: "info",
                text1: t("Alerts.info.saved_locally"),
                text2: t("Alerts.submitting.offline"),
                position: "top",
                visibilityTime: 3000,
              });
              router.push("/(history)/history");
            } catch (error: any) {
              console.error("Error saving temporary response:", error);
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
        createTemporaryMonitoringResponse(realm, sanitizedResponseData);
        Toast.show({
          type: "info",
          text1: t("Alerts.info.offline_mode"),
          text2: t("Alerts.info.will_sync"),
          position: "top",
          visibilityTime: 3000,
        });
        router.push("/(history)/history");
      } catch (error: any) {
        console.error("Error saving temporary response:", error);
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
    console.log("Error in saveMonitoringResponseToAPI:", error);
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

// Function to sync temporary monitoring responses with the server
export const syncTemporaryMonitoringResponses = async (
  realm: Realm,
  apiUrl: string,
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

  // Find all monitoring responses that need syncing AND were created by the current user
  const responsesToSync = realm
    .objects<MonitoringResponses>(MonitoringResponses)
    .filtered(
      "sync_data.sync_status == false AND sync_data.created_by_user_id == $0",
      userId
    );

  console.log(
    `Found ${responsesToSync.length} monitoring responses to sync for current user`
  );

  if (responsesToSync.length === 0) {
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

      console.log(
        "Syncing monitoring response to API:",
        JSON.stringify(apiData, null, 2)
      );
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
            sync_type: SyncType.monitoring_responses,
            sync_attempts: 1,
            last_sync_attempt: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            created_by_user_id: apiResponse.data.result.user_id,
          },
        });
        console.log(
          `Successfully synced monitoring response ${response.id} to server, updated with id: ${apiResponse.data.result.id}`
        );
        successCount++;
      }
    } catch (error: any) {
      failureCount++;
      console.error("Error syncing monitoring response to API:", error);
      // Update sync data to record the failure
      realm.write(() => {
        if (response.sync_data) {
          response.sync_data.sync_status = false;
          response.sync_data.sync_type = SyncType.monitoring_responses;
          response.sync_data.sync_reason = `Failed: ${error?.message || "Unknown error"}`;
          response.sync_data.sync_attempts = (response.sync_data.sync_attempts ? Number(response.sync_data.sync_attempts) : 0) + 1;
          response.sync_data.last_sync_attempt = new Date().toISOString();
        }
      });
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

export function useGetIzuStatisticsByMonitoringResponse(
  userId: number | null,
  forceSync: boolean = false
) {
  // console.log("Izu ID:", izuId);
  // Find monitoring responses for this IZU
  const monitoringResponses = useQuery(MonitoringResponses).filtered(
    "user_id == $0",
    userId
  );

  // Convert to array for easier consumption and sort by date (most recent first)
  const monitoringResponsesArray = monitoringResponses
    ? Array.from(monitoringResponses)
        .map((response) => ({
          id: response.id,
          family_id: response.family_id,
          date_recorded: response.date_recorded,
          type: response.type,
          cohort: response.cohort,
          form_id: response.form_id,
          score_data: response.score_data as unknown as {
            total: number;
            possible: number;
            percentage: number;
            fields_count: number;
            details: Record<string, any>;
          },
        }))
        .sort((a, b) => {
          // Sort by date, most recent first
          return (
            new Date(b.date_recorded).getTime() -
            new Date(a.date_recorded).getTime()
          );
        })
    : [];

  // console.log("Monitoring responses array:", JSON.stringify(monitoringResponsesArray, null, 2));
  return {
    monitoringResponses: monitoringResponsesArray,
  };
}
