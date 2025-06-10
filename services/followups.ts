import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { FollowUps } from "~/models/followups/follow-up";
import { isOnline } from "./network";
import { useAuth } from "~/lib/hooks/useAuth";
import { useMemo } from "react";
import { filterDataByUserId } from "./filterData";
import { SyncType } from "~/types";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

const { useQuery, useRealm } = RealmContext;

interface IFollowUpsResponse {
  message: string;
  data: Array<{
    id: number;
    followup_date: string;
    status: string;
    comment: string;
    project_module_id: number;
    project_id: number;
    source_module_id: number;
    survey_id: number;
    survey_result_id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    user: {
      id: number;
      name: string;
    };
    survey: {
      name: string;
      id: number;
      name_kin: string;
    };
    survey_result: {
      id: number;
      _id: string;
    };
  }>;
}

export async function fetchFollowUpsFromRemote() {
  const res = await baseInstance.get<IFollowUpsResponse>("/get-all-followups");
  
  // Create a map of existing IDs from the response to prevent duplicates
  const uniqueFollowUps = res.data.data.reduce((acc, followup) => {
    // Only add if we haven't seen this ID before
    if (!acc.has(followup.id)) {
      acc.set(followup.id, followup);
    }
    return acc;
  }, new Map());

  return Array.from(uniqueFollowUps.values()).map(followup => ({
    id: followup.id,
    followup_date: followup.followup_date,
    status: followup.status,
    comment: followup.comment,
    form_data: {
        project_module_id: followup.project_module_id,
        project_id: followup.project_id,
        source_module_id: followup.source_module_id,
        survey_id: followup.survey_id,
        survey_result_id: followup.survey_result_id,
        user_id: followup.user_id,
    },
    user: followup.user,
    survey: followup.survey,
    survey_result: followup.survey_result,
    created_at: followup.created_at,
    updated_at: followup.updated_at,
    sync_data: {
      sync_status: true,
      sync_reason: "Synced from server",
      sync_attempts: 1,
      sync_type: SyncType.follow_ups,
      last_sync_attempt: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      created_by_user_id: followup.user.id,
    },
  }));
}

export function useGetAllFollowUps(forceSync: boolean = false) {
  const realm = useRealm();
  const storedFollowUps = useQuery(FollowUps);
  const { user } = useAuth({});

  // Filter followups by current user
  const userFilteredFollowUps = useMemo(() => {
    if (!user || !user.id) return storedFollowUps;
    return filterDataByUserId(storedFollowUps, user.id);
  }, [storedFollowUps, user]);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "followups",
      fetchFn: fetchFollowUpsFromRemote,
      model: FollowUps,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
      transformData: (data: any[]) => {
        if (!data || data.length === 0) {
          console.log("No followups data to transform");
          return [];
        }

        return data.map((followup) => ({
          ...followup,
          sync_data: {
            sync_status: true,
            sync_reason: "Fetched from server",
            sync_attempts: 0,
            sync_type: SyncType.follow_ups,
            last_sync_attempt: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          },
        }));
      },
    },
  ]);

  return {
    followups: userFilteredFollowUps,
    isLoading: syncStatus.followups?.isLoading || false,
    error: syncStatus.followups?.error || null,
    lastSyncTime: syncStatus.followups?.lastSyncTime || null,
    refresh: () => refresh("followups", forceSync),
  };
}

function getNextAvailableId(realm: Realm): number {
  try {
    const followups = realm.objects<FollowUps>(FollowUps);
    if (followups.length > 0) {
      const maxId = Math.max(...followups.map((f) => f.id));
      return maxId + 1;
    }
    return 1;
  } catch (error) {
    console.log("Error getting next ID, using default:", error);
    return 1;
  }
}

function createTemporaryFollowup(
  realm: Realm,
  followupData: Record<string, any>
): FollowUps {
  // We'll keep the same ID format but mark it as temporary
  const localId = getNextAvailableId(realm);

  // Add sync data using values from sanitized data if available
  const syncData = {
    sync_status: followupData.sync_data?.sync_status ?? false,
    sync_type: followupData.sync_data?.sync_type ?? SyncType.follow_ups,
    sync_reason: "Created offline",
    sync_attempts: followupData.sync_data?.sync_attempts ?? 0,
    last_sync_attempt: followupData.sync_data?.last_sync_attempt ?? new Date().toISOString(),
    submitted_at: followupData.sync_data?.submitted_at ?? new Date().toISOString(),
    created_by_user_id: followupData.sync_data?.created_by_user_id,
  };

  let response: FollowUps;
  
  if (realm.isInTransaction) {
    response = createFollowupWithMeta(realm, {
      ...followupData,
      id: localId,
      sync_data: syncData,
    });
  } else {
    realm.write(() => {
      response = createFollowupWithMeta(realm, {
        ...followupData,
        id: localId,
        sync_data: syncData,
      });
    });
  }
  return response!;
}

function createFollowupWithMeta(
  realm: Realm,
  followupData: Record<string, any>
): FollowUps {
  try {
    const id = followupData.id || getNextAvailableId(realm);

    const formData = {
      project_module_id: followupData.project_module_id || null,
      project_id: followupData.project_id || null,
      source_module_id: followupData.source_module_id || null,
      survey_id: followupData.survey_id || null,
      survey_result_id: followupData.survey_result_id || null,
      user_id: followupData.user_id || null,
    };

    const syncData = followupData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      created_by_user_id: followupData.user.id,
      sync_type: SyncType.follow_ups,
    };

    const followup = {
      id,
      followup_date: followupData.followup_date,
      status: followupData.status,
      comment: followupData.comment,
      form_data: formData,
      user: followupData.user,
      survey: followupData.survey,
      survey_result: followupData.survey_result,
      created_at: followupData.created_at || new Date().toISOString(),
      updated_at: followupData.updated_at || new Date().toISOString(),
      sync_data: syncData,
    };

    let result;
    
    // Handle transaction
    const createFollowupInRealm = () => {
      return realm.create(FollowUps, followup, Realm.UpdateMode.Modified);
    };

    if (realm.isInTransaction) {
      result = createFollowupInRealm();
    } else {
      realm.write(() => {
        result = createFollowupInRealm();
      });
    }

    if (!result) {
      throw new Error("Failed to create followup object");
    }
    return result;
  } catch (error) {
    console.log("Error creating followup with meta:", error);
    throw error;
  }
}

export const saveFollowupToAPI = async (
  realm: Realm,
  followupData: Record<string, any>,
  t: TFunction,
  apiUrl: string = "/followups"
): Promise<void> => {
  try {
    console.log(
      "saveFollowupToAPI received data:",
      JSON.stringify(followupData, null, 2)
    );

    // Check for duplicates first
    const existingFollowups = realm.objects<FollowUps>(FollowUps);
    const isDuplicate = existingFollowups.some(
      (followup) =>
        followup.followup_date === followupData.followup_date &&
        followup.survey_result?.id === followupData.survey_result_id &&
        followup.survey?.id === followupData.survey_id
    );

    if (isDuplicate) {
      Toast.show({
        type: "error",
        text1: t("Alerts.error.title"),
        text2: t("Alerts.error.duplicate.followup"),
        position: "top",
        visibilityTime: 4000,
      });
      return;
    }

    // Format the date from object to yyyy-mm-dd
    let formattedDate: string;
    if (typeof followupData.followup_date === 'object' && followupData.followup_date !== null) {
      const { year, month, day } = followupData.followup_date;
      formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else if (typeof followupData.followup_date === 'string') {
      formattedDate = followupData.followup_date.includes('T') 
        ? followupData.followup_date.split('T')[0]
        : followupData.followup_date;
    } else {
      throw new Error("Invalid followup_date format");
    }

    // Prepare form data
    const formData = {
      project_module_id: followupData.project_module_id,
      project_id: followupData.project_id,
      source_module_id: followupData.source_module_id,
      survey_id: followupData.survey_id,
      survey_result_id: followupData.survey_result_id,
      user_id: followupData.user_id,
    };

    // Prepare sync data
    const syncData = followupData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      created_by_user_id: followupData.user_id,
      sync_type: SyncType.follow_ups,
    };

    const sanitizedFollowupData = {
      ...followupData,
      followup_date: formattedDate,
      form_data: formData,
      sync_data: syncData,
    };

    const isConnected = isOnline();
    console.log("Network connection status:", isConnected);

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        Toast.show({
          type: "info",
          text1: t("Alerts.saving.followup"),
          text2: t("Alerts.submitting.server"),
          position: "top",
          visibilityTime: 2000,
        });

        console.log("Attempting to send data to API");
        
        const apiData = {
          followup_date: formattedDate,
          status: followupData.status,
          comment: followupData.comment,
          project_module_id: followupData.project_module_id,
          survey_result_id: followupData.survey_result_id,
          project_id: followupData.project_id,
          module_id: followupData.source_module_id,
          survey_id: followupData.survey_id,
        };

        console.log(
          "Data being sent to API:",
          JSON.stringify(apiData, null, 2)
        );

        // Send to API
        baseInstance
          .post(apiUrl, apiData)
          .then((response) => {
            if (response.data?.data) {
              console.log("API returned data:", response.data.data);

              const completeData = {
                ...response.data.data,
                user: followupData.user,
                survey: followupData.survey,
                survey_result: followupData.survey_result,
                sync_data: {
                  sync_status: true,
                  sync_reason: "Successfully synced",
                  sync_attempts: 1,
                  last_sync_attempt: new Date().toISOString(),
                  submitted_at: new Date().toISOString(),
                  created_by_user_id: followupData.user.id,
                  sync_type: SyncType.follow_ups,
                },
              };

              console.log(
                "Complete data for Realm:",
                JSON.stringify(completeData, null, 2)
              );

              try {
                realm.write(() => {
                  realm.create(FollowUps, completeData, Realm.UpdateMode.Modified);
                });
                
                Toast.show({
                  type: "success",
                  text1: t("Alerts.success.title"),
                  text2: t("Alerts.success.followup"),
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
                createTemporaryFollowup(realm, sanitizedFollowupData);
                Toast.show({
                  type: "info",
                  text1: t("Alerts.info.saved_locally"),
                  text2: t("Alerts.info.api_invalid"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving temporary follow-up:", error);
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
            console.log("Error submitting follow-up to API:", error);
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
              createTemporaryFollowup(realm, sanitizedFollowupData);
              Toast.show({
                type: "info",
                text1: t("Alerts.info.saved_locally"),
                text2: t("Alerts.submitting.offline"),
                position: "top",
                visibilityTime: 3000,
              });
              router.push("/(history)/history");
            } catch (error: any) {
              console.error("Error saving temporary follow-up:", error);
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
        createTemporaryFollowup(realm, sanitizedFollowupData);
        Toast.show({
          type: "info",
          text1: t("Alerts.info.offline_mode"),
          text2: t("Alerts.info.will_sync"),
          position: "top",
          visibilityTime: 3000,
        });
        router.push("/(history)/history");
      } catch (error: any) {
        console.error("Error saving temporary follow-up:", error);
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
    console.log("Error in saveFollowupToAPI:", error);
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

export const syncTemporaryFollowups = async (
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

  // Find all followups that need syncing AND were created by the current user
  const followupsToSync = realm
    .objects<FollowUps>(FollowUps)
    .filtered(
      "sync_data.sync_status == false AND sync_data.created_by_user_id == $0",
      userId
    );

  console.log(`Found ${followupsToSync.length} followups to sync for current user`);

  if (followupsToSync.length === 0) {
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

  for (const followup of followupsToSync) {
    try {
      // Format the date
      let formattedDate = followup.followup_date;
      if (typeof followup.followup_date === 'object' && followup.followup_date !== null) {
        const { year, month, day } = followup.followup_date as any;
        formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (typeof followup.followup_date === 'string' && followup.followup_date.includes('T')) {
        formattedDate = followup.followup_date.split('T')[0];
      }

      const apiData = {
        followup_date: formattedDate,
        status: followup.status,
        comment: followup.comment,
        project_module_id: followup.form_data?.project_module_id,
        survey_result_id: followup.form_data?.survey_result_id,
        project_id: followup.form_data?.project_id,
        module_id: followup.form_data?.source_module_id,
        survey_id: followup.form_data?.survey_id,
      };

      const response = await baseInstance.post(apiUrl, apiData);

      if (response.data?.data) {
        const updatedData = {
          ...response.data.data,
          user: followup.user,
          survey: followup.survey,
          survey_result: followup.survey_result,
          sync_data: {
            sync_status: true,
            sync_reason: "Successfully synced",
            sync_attempts: (followup.sync_data?.sync_attempts ? Number(followup.sync_data.sync_attempts) : 0) + 1,
            last_sync_attempt: new Date().toISOString(),
            submitted_at: followup.sync_data?.submitted_at || new Date().toISOString(),
            sync_type: SyncType.follow_ups,
          },
        };

        realm.write(() => {
          realm.create(FollowUps, updatedData, Realm.UpdateMode.Modified);
        });
        successCount++;
      }
    } catch (error: any) {
      failureCount++;
      console.error("Error syncing Followup to API:", error);

      realm.write(() => {
        if (followup.sync_data) {
          followup.sync_data.sync_status = false;
          followup.sync_data.sync_type = SyncType.follow_ups;
          followup.sync_data.sync_reason = `Failed: ${error?.message || "Unknown error"}`;
          followup.sync_data.sync_attempts = (followup.sync_data.sync_attempts ? Number(followup.sync_data.sync_attempts) : 0) + 1;
          followup.sync_data.last_sync_attempt = new Date().toISOString();
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

// Function to get followups by survey result ID
export function useGetFollowUpsBySurveyResultId(surveyResultId: string, surveyId: string) {
  const followups = useQuery(FollowUps);
  const filteredFollowups = followups.filter(followup => 
    followup.survey_result?.id === Number(surveyResultId) && followup.survey?.id === Number(surveyId)
  );
  
  return { followups: filteredFollowups };
}

// Function to get notification by ID
export function useGetFollowUpById(id: number) {
  const followups = useQuery(FollowUps);
  
  const followup = followups.find(followup => 
    followup.id === id
  );
  
  return { followup };
} 