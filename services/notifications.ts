import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { Notifications } from "~/models/notifications/notifications";
import { showMultipleNotifications } from "./notificationService";

const { useQuery, useRealm } = RealmContext;

interface INotificationResponse {
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
      json: string;
    };
  }>;
}

export async function fetchNotificationsFromRemote() {
  const res = await baseInstance.get<INotificationResponse>(
    "/get-user-notifications"
  );

  // console.log("The notifications are", JSON.stringify(res.data, null, 2));
  
  // Map the response data to match our Realm model
  const notifications = res.data.data.map(notification => ({
    id: notification.id,
    followup_date: notification.followup_date,
    status: notification.status,
    comment: notification.comment,
    form_data: {
        project_module_id: notification.project_module_id,
        project_id: notification.project_id,
        source_module_id: notification.source_module_id,
        survey_id: notification.survey_id,
        survey_result_id: notification.survey_result_id,
        user_id: notification.user_id,
    },
    user: notification.user,
    survey: notification.survey,
    survey_result: notification.survey_result,
    created_at: notification.created_at,
    updated_at: notification.updated_at,
  }));

  // Show notifications for unresolved items
  await showMultipleNotifications(notifications);

  return notifications;
}

export function useGetNotifications(forceSync: boolean = false) {
  const storedNotifications = useQuery(Notifications);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "notifications",
      fetchFn: fetchNotificationsFromRemote,
      model: Notifications,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  return {
    notifications: storedNotifications,
    isLoading: syncStatus.notifications?.isLoading || false,
    error: syncStatus.notifications?.error || null,
    lastSyncTime: syncStatus.notifications?.lastSyncTime || null,
    refresh: () => refresh("notifications", forceSync),
  };
}

// Function to get notification by ID
export function useGetNotificationById(id: string | number) {
  const realm = useRealm();
  const notifications = useQuery(Notifications);
  
  const notification = notifications.find(notification => 
    notification.id.toString() === (typeof id === 'number' ? id : parseInt(id)).toString()
  );
  
  return { notification };
} 