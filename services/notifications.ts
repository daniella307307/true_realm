import { useSQLite } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { showMultipleNotifications } from "./notificationService";
import { useEffect, useState, useCallback } from "react";
import { isOnline } from "./network";

// ===============================
// API CALL
// ===============================
export interface INotification {
  id: number;
  followup_date: string;
  status: string;
  comment: string;
  form_data: {
    project_module_id: number;
    project_id: number;
    source_module_id: number;
    survey_id: number;
    survey_result_id: number;
    user_id: number;
  };
  user: { id: number; name: string };
  survey: { id: number; name: string; name_kin: string };
  survey_result: { id: number; _id: string; json: string };
  created_at: string;
  updated_at: string;
}

export async function fetchNotificationsFromRemote(): Promise<INotification[]> {
  const res = await baseInstance.get("/get-user-notifications");

  const notifications = res.data.data.map((n: any) => ({
    id: n.id,
    followup_date: n.followup_date,
    status: n.status,
    comment: n.comment,
    form_data: {
      project_module_id: n.project_module_id,
      project_id: n.project_id,
      source_module_id: n.source_module_id,
      survey_id: n.survey_id,
      survey_result_id: n.survey_result_id,
      user_id: n.user_id,
    },
    user: n.user,
    survey: n.survey,
    survey_result: n.survey_result,
    created_at: n.created_at,
    updated_at: n.updated_at,
  }));

  // Show notifications immediately for unresolved items
  await showMultipleNotifications(notifications);

  return notifications;
}

// ===============================
// SQLITE SYNC
// ===============================
const transformNotificationsToSQLite = (notifications: INotification[]) =>
  notifications.map(n => ({
    _id: n.id.toString(),
    ...n,
    user: JSON.stringify(n.user || {}),
    survey: JSON.stringify(n.survey || {}),
    survey_result: JSON.stringify(n.survey_result || {}),
    form_data: JSON.stringify(n.form_data || {}),
  }));

export const syncNotificationsToSQLite = async (sqlite: ReturnType<typeof useSQLite>) => {
  if (!isOnline()) return;

  try {
    const notifications = await fetchNotificationsFromRemote();
    const transformed = transformNotificationsToSQLite(notifications);

    await sqlite.deleteAll("Notifications");
    if (transformed.length > 0) await sqlite.batchCreate("Notifications", transformed);
  } catch (err) {
    console.error("Failed to sync notifications:", err);
  }
};

// ===============================
// HOOKS
// ===============================

export function useGetNotifications(forceSync = false) {
  const sqlite = useSQLite();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const loadFromSQLite = useCallback(async () => {
    const rows = await sqlite.getAll<any>("Notifications");
    return rows.map(n => ({
      ...n,
      user: JSON.parse(n.user || "{}"),
      survey: JSON.parse(n.survey || "{}"),
      survey_result: JSON.parse(n.survey_result || "{}"),
      form_data: JSON.parse(n.form_data || "{}"),
    }));
  }, [sqlite]);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load from SQLite first
      const localData = await loadFromSQLite();
      setNotifications(localData);

      // Sync if online
      if (forceSync && isOnline()) {
        await syncNotificationsToSQLite(sqlite);
        const updated = await loadFromSQLite();
        setNotifications(updated);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [loadFromSQLite, sqlite, forceSync]);

  useEffect(() => {
    if (sqlite.isReady) loadNotifications();
  }, [sqlite.isReady, loadNotifications]);

  const refresh = useCallback(() => loadNotifications(), [loadNotifications]);

  return { notifications, isLoading, error, lastSyncTime, refresh };
}

export function useGetNotificationById(id: string | number, forceSync = false) {
  const { notifications, refresh } = useGetNotifications(forceSync);
  const [notification, setNotification] = useState<INotification | null>(null);

  useEffect(() => {
    const found = notifications.find(n => n.id.toString() === id.toString()) || null;
    setNotification(found);
  }, [id, notifications]);

  return { notification, refresh };
}
