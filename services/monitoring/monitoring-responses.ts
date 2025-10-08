import { useSQLite } from "../../providers/RealContextProvider";
import { baseInstance } from "../../utils/axios";
import { useDataSync } from "../dataSync";
import { isOnline } from "../network";
import { useAuth } from "../../lib/hooks/useAuth";
import { useMemo, useState } from "react";
import { useUserDataFilter } from "../filterData";
import { SyncType } from "../../types";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { TFunction } from "i18next";

const TABLE_NAME = "MonitoringResponses";

// Fetch from remote API
export async function fetchMonitoringResponsesFromRemote() {
  const res = await baseInstance.get<{ performances: any[] }>("/get-performances");
  
  const uniquePerformances = res.data.performances.reduce((acc, performance) => {
    if (!acc.has(performance.id)) acc.set(performance.id, performance);
    return acc;
  }, new Map());

  return { monitoring_responses: Array.from(uniquePerformances.values()) || [] };
}

// Hook: Get monitoring responses
export function useGetMonitoringResponses(forceSync: boolean = false) {
  const { getAll } = useSQLite();
  const { user } = useAuth({});
  const { filterDataByUserId } = useUserDataFilter();
  const [storedResponses, setStoredResponses] = useState<any[]>([]);
  const [userFilteredResponses, setUserFilteredResponses] = useState<any[]>([]);

  // Load stored responses
  useMemo(() => {
    getAll(TABLE_NAME).then(setStoredResponses);
  }, []);

  // Filter responses by user
  useMemo(() => {
    if (!user || !user?.id ) return setUserFilteredResponses(storedResponses);
    filterDataByUserId(TABLE_NAME, user.id).then(setUserFilteredResponses);
  }, [storedResponses, user]);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "monitoring_responses",
      fetchFn: fetchMonitoringResponsesFromRemote,
      tableName: TABLE_NAME,
      staleTime: 5 * 60 * 1000,
      forceSync,
      transformData: ({ monitoring_responses }) => {
        if (!monitoring_responses?.length) return [];
        return monitoring_responses.map((response) => {
          let parsedScoreData = {};
          if (response.score_data) {
            try {
              parsedScoreData = typeof response.score_data === "string"
                ? JSON.parse(response.score_data)
                : response.score_data;
            } catch {
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

  return {
    responses: userFilteredResponses,
    isLoading: syncStatus.monitoring_responses?.isLoading || false,
    error: syncStatus.monitoring_responses?.error || null,
    lastSyncTime: syncStatus.monitoring_responses?.lastSyncTime || null,
    refresh: () => refresh("monitoring_responses", forceSync),
  };
}

// Save monitoring response (offline-first)
export const saveMonitoringResponseToAPI = async (
  responseData: Record<string, any>,
  apiUrl: string,
  t: TFunction
) : Promise<void> => {
  const { create, getAll } = useSQLite();
  const isConnected = isOnline();
  const existingResponses = await getAll(TABLE_NAME, "created_by_user_id = ?", [responseData.created_by_user_id]);
   const isDuplicate = existingResponses.some(
      (response) =>
        response.family_id === responseData.family_id &&
        response.form_id === responseData.form_id && 
        response.module_id === responseData.module_id
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

  // Prepare sanitized data
  const sanitizedResponseData = {
      family_id: responseData.family || responseData.family_id,
      module_id: responseData.module_id,
      form_id: responseData.form_id,
      project_id: responseData.project_id,
      date_recorded: responseData.date_recorded,
      type: responseData.type || "1",
      cohort: responseData.cohort,
      user_id: responseData.user_id, // This is the selected IZU's ID
      score_data: typeof responseData.score_data === 'string' 
        ? JSON.parse(responseData.score_data)
        : responseData.score_data || {},
      json: responseData.response,
      sync_data: {
        sync_status: false,
        sync_type: SyncType.monitoring_responses,
        sync_reason: "New record",
        sync_attempts: 0,
        last_sync_attempt: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        created_by_user_id: responseData.created_by_user_id, // This is the logged in user's ID
      },
    };

  // Save locally first
  const localResponse: any = await create(TABLE_NAME, sanitizedResponseData);

  if (!isConnected) {
    Toast.show({
      type: "info",
      text1: t("Alerts.info.offline_mode"),
      text2: t("Alerts.info.will_sync"),
      position: "top",
    });
    router.push("/(history)/history");
    return;
  }

  try {
    Toast.show({
      type: "info",
      text1: t("Alerts.saving.monitoring"),
      text2: t("Alerts.submitting.server"),
      position: "top",
    });

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

    const apiResponse = await baseInstance.post(apiUrl, apiData);

     console.log("API response:", apiResponse.data);

    if (apiResponse.data?.result?.id) {
      await create(TABLE_NAME, {
        ...sanitizedResponseData,
        _id: localResponse._id, // preserve local ID
        id: apiResponse.data.result.id,
        sync_status: 1,
        sync_reason: "Successfully synced",
      });

      Toast.show({
        type: "success",
        text1: t("Alerts.success.title"),
        text2: t("Alerts.success.monitoring"),
        position: "top",
      });
      router.push("/(history)/history");
    }
  } catch (error) {
    console.error("API save error:", error);
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title"),
      text2: t("Alerts.error.save_failed.server"),
      position: "top",
    });
  }
};

// Sync temporary offline responses
export const syncTemporaryMonitoringResponses = async (
query: <T = any>(sql: string, params?: any[]) => Promise<T[]>, apiUrl: string, t: TFunction, userId: number) => {
  const { getAll, create } = useSQLite();
  if (!isOnline()) return;

  const offlineResponses = await getAll(TABLE_NAME, "sync_status = 0 AND created_by_user_id = ?", [userId]);

  for (const response of offlineResponses) {
    try {
      const apiResponse = await baseInstance.post(apiUrl, {
        ...response,
        score_data: response.score_data,
        response: response.json,
      });

      if (apiResponse.data?.result?.id) {
        await create(TABLE_NAME, {
          ...response,
          id: apiResponse.data.result.id,
          sync_status: 1,
          sync_reason: "Successfully synced",
        });
      }
    } catch (error) {
      console.error("Failed to sync:", response._id, error);
    }
  }
};
export async function useGetAllLocallyCreatedMonitoringResponses() {
  const { query } = useSQLite();
  const storedResponses = query<any>(`SELECT * FROM ${TABLE_NAME}`).then(responses => responses.map(r => ({ ...r, score_data: r.score_data, json: r.json })));

  if (!storedResponses) {
    return {
      locallyCreatedResponses: [],
      isLoading: false,
      error: null,
      lastSyncTime: null,
      refresh: () => {},
    };
  }
    

  return {
    locallyCreatedResponses:  (await storedResponses).filter(
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

// Hook for Izu statistics
export function useGetIzuStatisticsByMonitoringResponse(userId: number | null) {
  const { getAll } = useSQLite();
  const [responses, setResponses] = useState<any[]>([]);

  useMemo(() => {
    if (!userId) return;
    getAll(TABLE_NAME, "user_id = ?", [userId]).then((res) => {
      setResponses(res.map(r => ({ ...r, score_data: r.score_data, json: r.json })));
    });
  }, [userId]);

  return { monitoringResponses: responses };
}
