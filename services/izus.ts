import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSQLite } from "~/providers/RealContextProvider";
import { useAuth } from "~/lib/hooks/useAuth";
import { baseInstance } from "~/utils/axios";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Izus, SyncType, FormField } from "~/types";
import { isOnline } from "./network";

// Helper to generate unique IDs
const generateId = (): number => Date.now();

/**
 * Pure utility function to filter Izus by user ID
 */
async function filterIzusByUserId(
  userId: number,
  getByQuery: (table: string, query: string, params: any[]) => Promise<any[]>,
  getAll: (table: string) => Promise<any[]>
): Promise<Izus[]> {
  if (!userId) {
    return [];
  }

  try {
    return await getByQuery("Izu", "user_id = ?", [userId]);
  } catch {
    try {
      return await getByQuery("Izu", "form_data_user_id = ?", [userId]);
    } catch (error: any) {
      console.error("Could not filter Izus by user ID:", error.message);
      return await getAll("Izu");
    }
  }
}


export async function fetchIzusFromRemote(): Promise<Izus[]> {
  const res = await baseInstance.get<{ izus: Izus[] }>("/users");
  return res.data.izus;
}


function transformIzuForStorage(izu: any, userId?: number): any {
  return {
    _id: izu.id?.toString() || generateId().toString(),
    id: izu.id || generateId(),
    ...izu,
    form_data: typeof izu.form_data === 'string' 
      ? izu.form_data 
      : JSON.stringify({
          ...izu.form_data,
          user_id: userId || izu.form_data?.user_id || null,
        }),
    location: typeof izu.location === 'string'
      ? izu.location
      : JSON.stringify(izu.location || {}),
    meta: typeof izu.meta === 'string'
      ? izu.meta
      : JSON.stringify(izu.meta || {}),
    sync_data: typeof izu.sync_data === 'string'
      ? izu.sync_data
      : JSON.stringify({
          sync_status: izu.sync_data?.sync_status ?? true,
          sync_reason: izu.sync_data?.sync_reason ?? "Synced from API",
          sync_attempts: izu.sync_data?.sync_attempts ?? 0,
          last_sync_attempt: new Date().toISOString(),
        }),
    sync_type: SyncType.izus,
    created_by_user_id: userId || izu.created_by_user_id || null,
  };
}


export function useGetIzus(forceSync: boolean = false, loggedInIzu?: Izus) {
  const { getAll, batchCreate, getByQuery, isReady } = useSQLite();
  const { user } = useAuth({});
  const [izus, setIzus] = useState<Izus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const initialLoadDone = useRef(false);

  const load = useCallback(async () => {
    if (!isReady) return;

    try {
      setIsLoading(true);
      setError(null);
      
      let localIzus = await getAll<Izus>("Izu");

      // // Sync from remote if needed
      // if ((!localIzus.length || forceSync) && isOnline()) {
      //   try {
      //     const remoteIzus = await fetchIzusFromRemote();
          
      //     // Transform all Izus for storage
      //     const transformedIzus = remoteIzus.map(izu => 
      //       transformIzuForStorage(izu, user?.id)
      //     );
          
      //     // Batch create all at once
      //     if (transformedIzus.length > 0) {
      //       await batchCreate("Izu", transformedIzus);
      //       localIzus = transformedIzus;
      //     }
      //   } catch (syncError) {
      //     console.error("Failed to sync Izus from remote:", syncError);
      //   }
      // }

      // Filter by user if logged in
      if (user?.id && localIzus.length > 0) {
        localIzus = await filterIzusByUserId(user.id, getByQuery, getAll);
      }

      // Parse JSON fields for display
      const parsedIzus = localIzus.map(izu => ({
        ...izu,
        form_data: typeof izu.form_data === 'string' 
          ? JSON.parse(izu.form_data) 
          : izu.form_data,
        location: typeof izu.location === 'string'
          ? JSON.parse(izu.location)
          : izu.location,
        meta: typeof izu.meta === 'string'
          ? JSON.parse(izu.meta)
          : izu.meta,
        sync_data: typeof izu.sync_data === 'string'
          ? JSON.parse(izu.sync_data)
          : izu.sync_data,
      }));

      setIzus(parsedIzus);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading Izus:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [isReady, getAll, batchCreate, getByQuery, user?.id, forceSync]);

  useEffect(() => {
    if (!initialLoadDone.current || forceSync) {
      load();
      initialLoadDone.current = true;
    }
  }, [load, forceSync]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const filteredIzus = useMemo(() => {
    if (!loggedInIzu) return izus;

    const position = Number(loggedInIzu.position);
    if (isNaN(position)) return izus;

    return izus.filter((izu) => {
      const izuPos = Number(izu.position);
      if (isNaN(izuPos)) return false;

      if (position === 7 && loggedInIzu.location?.cell) {
        return (
          (izuPos === 7 || izuPos === 8) &&
          izu.location?.cell === loggedInIzu.location.cell
        );
      }

      if (position === 13 && loggedInIzu.location?.sector) {
        return (
          (izuPos === 7 || izuPos === 8) &&
          izu.location?.sector === loggedInIzu.location.sector
        );
      }

      if (
        position === 8 &&
        loggedInIzu.location?.village &&
        loggedInIzu.izucode
      ) {
        return (
          izuPos === 8 &&
          izu.location?.village === loggedInIzu.location.village &&
          izu.izucode === loggedInIzu.izucode
        );
      }

      return true;
    });
  }, [izus, loggedInIzu]);

  return { izus: filteredIzus, isLoading, error, refresh };
}

// ---------------- HELPER: EXTRACT META ----------------
function extractMeta(izuData: Record<string, any>, extraFields: FormField[]) {
  return Object.fromEntries(
    extraFields
      .filter((f) => f.key && f.key !== "submit")
      .map((f) => [f.key, izuData[f.key] ?? null])
  );
}

// ---------------- SAVE IZU TO API ----------------
export function useSaveIzu() {
  const { user } = useAuth({});
  const { batchCreate } = useSQLite();
  const { t } = useTranslation();

  const saveIzu = useCallback(
    async (
      izuData: Record<string, any>,
      apiUrl: string,
      extraFields: FormField[] = []
    ) => {
      if (!user?.id) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.sync.no_user"),
        });
        return;
      }

      const meta = extraFields.length ? extractMeta(izuData, extraFields) : izuData;
      const formData = { ...izuData.form_data, user_id: user.id };

      try {
        if (isOnline()) {
          Toast.show({
            type: "info",
            text1: t("Alerts.saving.izu"),
            text2: t("Alerts.submitting.server"),
            position: "top",
            visibilityTime: 2000,
          });

          const apiPayload = {
            ...formData,
            ...meta,
          };

          const res = await baseInstance.post(apiUrl, apiPayload);
          
          if (res.data?.result?.id) {
            // Server accepted - save with server ID
            const savedIzu = transformIzuForStorage({
              ...izuData,
              id: res.data.result.id,
              form_data: formData,
              meta,
              sync_data: {
                sync_status: true,
                sync_reason: "Successfully synced",
                sync_attempts: 1,
                last_sync_attempt: new Date().toISOString(),
              },
            }, user.id);

            await batchCreate("Izu", [savedIzu]);
            
            Toast.show({
              type: "success",
              text1: t("Alerts.success.title"),
              text2: t("Alerts.success.izu"),
              position: "top",
              visibilityTime: 3000,
            });
            router.push("/(history)/history");
            return;
          }
        }

        // Offline or API didn't return ID - save locally
        const localIzu = transformIzuForStorage({
          ...izuData,
          form_data: formData,
          meta,
          sync_data: {
            sync_status: false,
            sync_reason: isOnline() ? "API error" : "Created offline",
            sync_attempts: 0,
            last_sync_attempt: new Date().toISOString(),
          },
        }, user.id);

        await batchCreate("Izu", [localIzu]);
        
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: t("Alerts.info.saved_locally"),
          position: "top",
          visibilityTime: 3000,
        });
        router.push("/(history)/history");
      } catch (error) {
        console.error("Error saving IZU:", error);
        
        // Save locally on error
        try {
          const localIzu = transformIzuForStorage({
            ...izuData,
            form_data: formData,
            meta,
            sync_data: {
              sync_status: false,
              sync_reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              sync_attempts: 0,
              last_sync_attempt: new Date().toISOString(),
            },
          }, user.id);

          await batchCreate("Izus", [localIzu]);
          
          Toast.show({
            type: "info",
            text1: t("Alerts.info.title"),
            text2: t("Alerts.info.saved_locally"),
            position: "top",
            visibilityTime: 3000,
          });
          router.push("/(history)/history");
        } catch (saveError) {
          Toast.show({
            type: "error",
            text1: t("Alerts.error.title"),
            text2: t("Alerts.error.save_failed.local"),
            position: "top",
            visibilityTime: 4000,
          });
        }
      }
    },
    [user?.id, batchCreate, t]
  );

  return { saveIzu };
}

// ---------------- SYNC LOCAL IZUS ----------------
export function useSyncIzus() {
  const { user } = useAuth({});
  const { getByQuery, update } = useSQLite();
  const { t } = useTranslation();

  const syncTemporaryIzus = useCallback(
    async (apiUrl: string) => {
      if (!user?.id) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.sync.no_user"),
        });
        return;
      }

      if (!isOnline()) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.network.title"),
          text2: t("Alerts.error.network.offline"),
        });
        return;
      }

      try {
        const pendingIzus = await getByQuery(
          "Izu",
          "created_by_user_id = ?",
          [user.id]
        );

        // Filter out already synced ones
        const unsynced = pendingIzus.filter(izu => {
          const syncData = typeof izu.sync_data === 'string' 
            ? JSON.parse(izu.sync_data) 
            : izu.sync_data;
          return !syncData?.sync_status;
        });

        if (unsynced.length === 0) {
          Toast.show({
            type: "info",
            text1: t("Alerts.info.title"),
            text2: t("Alerts.info.no_pending"),
            position: "top",
            visibilityTime: 3000,
          });
          return;
        }

        let successCount = 0;
        let failureCount = 0;

        for (const izu of unsynced) {
          try {
            const formData = typeof izu.form_data === 'string'
              ? JSON.parse(izu.form_data)
              : izu.form_data;
            const meta = typeof izu.meta === 'string'
              ? JSON.parse(izu.meta)
              : izu.meta;

            const res = await baseInstance.post(apiUrl, {
              ...formData,
              ...meta,
            });

            if (res.data?.result?.id) {
              // Update with server ID and sync status
              await update("Izu", izu._id, {
                id: res.data.result.id,
                sync_data: JSON.stringify({
                  sync_status: true,
                  sync_reason: "Successfully synced",
                  sync_attempts: (izu.sync_attempts || 0) + 1,
                  last_sync_attempt: new Date().toISOString(),
                }),
              });
              successCount++;
            }
          } catch (err) {
            console.error("Failed to sync IZU:", err);
            failureCount++;

            // Update sync attempts
            const oldSyncData = typeof izu.sync_data === 'string'
              ? JSON.parse(izu.sync_data)
              : izu.sync_data;

            await update("Izu", izu._id, {
              sync_data: JSON.stringify({
                ...oldSyncData,
                sync_attempts: (oldSyncData.sync_attempts || 0) + 1,
                sync_reason: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                last_sync_attempt: new Date().toISOString(),
              }),
            });
          }
        }

        if (successCount > 0 && failureCount === 0) {
          Toast.show({
            type: "success",
            text1: t("Alerts.success.title"),
            text2: t("Alerts.success.sync").replace("{count}", successCount.toString()),
            position: "top",
            visibilityTime: 4000,
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
          });
        } else if (failureCount > 0) {
          Toast.show({
            type: "error",
            text1: t("Alerts.error.title"),
            text2: t("Alerts.error.sync.failed").replace("{count}", failureCount.toString()),
            position: "top",
            visibilityTime: 4000,
          });
        }
      } catch (error) {
        console.error("Error syncing Izus:", error);
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.sync.failed"),
        });
      }
    },
    [user?.id, getByQuery, update, t]
  );

  return { syncTemporaryIzus };
}

// ---------------- GET ALL LOCALLY CREATED IZUS ----------------
export function useGetAllLocallyCreatedIzus() {
  const { getByQuery, isReady } = useSQLite();
  const { user } = useAuth({});
  const [localIzus, setLocalIzus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadLocalIzus = useCallback(async () => {
    if (!isReady || !user?.id) {
      setLocalIzus([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const allUserIzus = await getByQuery(
        "Izu",
        "created_by_user_id = ?",
        [user.id]
      );

      // Filter for unsynced only
      const pendingIzus = allUserIzus
        .map(izu => ({
          ...izu,
          sync_data: typeof izu.sync_data === 'string'
            ? JSON.parse(izu.sync_data)
            : izu.sync_data,
          form_data: typeof izu.form_data === 'string'
            ? JSON.parse(izu.form_data)
            : izu.form_data,
          location: typeof izu.location === 'string'
            ? JSON.parse(izu.location)
            : izu.location,
          meta: typeof izu.meta === 'string'
            ? JSON.parse(izu.meta)
            : izu.meta,
        }))
        .filter(izu => !izu.sync_data?.sync_status);

      setLocalIzus(pendingIzus);
    } catch (err: any) {
      console.error("Failed to fetch locally created IZUs:", err);
      setError(err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load locally created IZUs",
      });
    } finally {
      setLoading(false);
    }
  }, [isReady, user?.id, getByQuery]);

  useEffect(() => {
    loadLocalIzus();
  }, [loadLocalIzus]);

  const refreshIzus = useCallback(async () => {
    setRefreshing(true);
    await loadLocalIzus();
    setRefreshing(false);
  }, [loadLocalIzus]);

  return { localIzus, loading, refreshing, error, refresh: refreshIzus };
}