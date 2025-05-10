import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { FollowUps } from "~/models/followups/follow-up";
import { isOnline } from "./network";
import { useMainStore } from "~/lib/store/main";

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
  
  return res.data.data.map(followup => ({
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
      last_sync_attempt: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    },
  }));
}

export function useGetAllFollowUps(forceSync: boolean = false) {
  const storedFollowUps = useQuery(FollowUps);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "followups",
      fetchFn: fetchFollowUpsFromRemote,
      model: FollowUps,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  return {
    followups: storedFollowUps,
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
  const localId = getNextAvailableId(realm);

  const syncData = {
    sync_status: false,
    sync_reason: "Created offline",
    sync_attempts: 0,
    last_sync_attempt: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
  };

  return createFollowupWithMeta(realm, {
    ...followupData,
    id: localId,
    sync_data: syncData,
  });
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
    };

    let result: FollowUps | undefined;
    realm.write(() => {
      result = realm.create<FollowUps>(FollowUps, {
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
      });
    });

    return result!;
  } catch (error) {
    console.log("Error creating Followup with meta:", error);
    throw error;
  }
}

export const saveFollowupToAPI = async (
  realm: Realm,
  followupData: Record<string, any>
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const isConnected = isOnline();
    
    if (isConnected) {
      try {
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

        const requestData = {
          followup_date: formattedDate,
          status: followupData.status,
          comment: followupData.comment,
          project_module_id: followupData.project_module_id,
          survey_result_id: followupData.survey_result_id,
          project_id: followupData.project_id,
          module_id: followupData.source_module_id,
          survey_id: followupData.survey_id,
        };

        const response = await baseInstance.post("/followups", requestData);

        if (response.data?.data) {
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
            },
          };

          realm.write(() => {
            realm.create(FollowUps, completeData);
          });

          return {
            success: true,
            message: "Follow-up created successfully",
            data: completeData
          };
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error: any) {
        console.error("Error submitting Followup to API:", error);
        // Create temporary followup for offline storage
        const tempFollowup = createTemporaryFollowup(realm, followupData);
        return {
          success: false,
          message: error?.response?.data?.message || "Failed to create follow-up",
          data: tempFollowup
        };
      }
    } else {
      // Create temporary followup for offline storage
      const tempFollowup = createTemporaryFollowup(realm, followupData);
      return {
        success: false,
        message: "Created offline - will sync when online",
        data: tempFollowup
      };
    }
  } catch (error) {
    console.error("Error saving Followup:", error);
    throw error;
  }
};

export const syncTemporaryFollowups = async (realm: Realm): Promise<void> => {
  if (!isOnline()) {
    console.log("Cannot sync temporary Followups - offline");
    return;
  }

  const followupsToSync = realm
    .objects<FollowUps>(FollowUps)
    .filtered("sync_data.sync_status == false");

  console.log(`Found ${followupsToSync.length} Followups to sync`);

  for (const followup of followupsToSync) {
    try {
      const apiData = {
        id: followup.id,
        followup_date: followup.followup_date,
        status: followup.status,
        comment: followup.comment,
        ...(followup.form_data || {}),
      };

      const response = await baseInstance.post("/followups", apiData);

      if (response.data?.result?.id) {
        const updatedData = {
          ...apiData,
          id: response.data.result.id,
          sync_data: {
            sync_status: true,
            sync_reason: "Successfully synced",
            sync_attempts: (followup.sync_data?.sync_attempts ? Number(followup.sync_data.sync_attempts) : 0) + 1,
            last_sync_attempt: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          },
        };

        if (!realm.isInTransaction) {
          realm.write(() => {
            const existingFollowup = realm.objectForPrimaryKey(FollowUps, followup.id);
            if (existingFollowup) {
              Object.assign(existingFollowup, updatedData);
            }
          });
        }
      }
    } catch (error: any) {
      console.log("Error syncing Followup to API:", error);

      if (!realm.isInTransaction) {
        realm.write(() => {
          const existingFollowup = realm.objectForPrimaryKey(FollowUps, followup.id);
          if (existingFollowup && existingFollowup.sync_data) {
            existingFollowup.sync_data.sync_status = false;
            existingFollowup.sync_data.sync_reason = `Failed: ${error?.message || "Unknown error"}`;
            existingFollowup.sync_data.sync_attempts = (existingFollowup.sync_data.sync_attempts ? Number(existingFollowup.sync_data.sync_attempts) : 0) + 1;
            existingFollowup.sync_data.last_sync_attempt = new Date().toISOString();
          }
        });
      }
    }
  }
};

// Function to get followups by survey result ID
export function useGetFollowUpsBySurveyResultId(surveyResultId: string, surveyId: string) {
  console.log("surveyResultId", surveyResultId);
  const followups = useQuery(FollowUps);
  const filteredFollowups = followups.filter(followup => 
    followup.survey_result?.id === Number(surveyResultId) && followup.survey?.id === Number(surveyId)
  );
  
  return { followups: filteredFollowups };
}

// Function to get notification by ID
export function useGetFollowUpById(id: number) {
  const realm = useRealm();
  const followups = useQuery(FollowUps);
  
  const followup = followups.find(followup => 
    followup.id === id
  );
  
  return { followup };
} 