import { useEffect, useMemo, useState } from "react";

import { Realm } from "@realm/react";
import { RealmContext } from "~/providers/RealContextProvider";

import { useNetworkStatus } from "./network";

const { useRealm } = RealmContext;

export type SyncConfig = {
  key: string;
  fetchFn: () => Promise<any>;
  model: any;
  transformData?: (data: any) => any;
  staleTime?: number; // Time in milliseconds before data is considered stale
  forceSync?: boolean; // Whether to force sync from remote
};

export type SyncStatus = {
  isLoading: boolean;
  error: Error | null;
  lastSyncTime: Date | null;
};

export function useDataSync(configs: SyncConfig[]) {
  const realm = useRealm();
  const { isConnected } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});

  const syncData = async (config: SyncConfig) => {
    const { key, fetchFn, model, transformData, forceSync } = config;

    if (!forceSync) {
      console.log(`Not forcing sync for ${key}, using local data`);
      return;
    }

    if (!isConnected) {
      console.log(`No internet connection for ${key}, cannot force sync`);
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      [key]: { ...prev[key], isLoading: true, error: null },
    }));

    try {
      const data = await fetchFn();
      const transformedData = transformData ? transformData(data) : data;

      if (!realm || realm.isClosed) {
        throw new Error("Realm is closed");
      }

      realm.write(() => {
        if (Array.isArray(transformedData)) {
          if (transformedData.length === 0) {
            console.log(`Received empty array for ${key}, this is valid`);
          } else {
            transformedData.forEach((item) => {
              try {
                realm.create(model, item, Realm.UpdateMode.Modified);
              } catch (error) {
                console.error(`Error creating ${key} item:`, error);
              }
            });
          }
        } else {
          realm.create(model, transformedData, Realm.UpdateMode.Modified);
        }
      });

      setSyncStatus((prev) => ({
        ...prev,
        [key]: {
          isLoading: false,
          error: null,
          lastSyncTime: new Date(),
        },
      }));
    } catch (error) {
      console.log(`Error syncing ${key}:`, error);
      setSyncStatus((prev) => ({
        ...prev,
        [key]: {
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
          lastSyncTime: prev[key]?.lastSyncTime || null,
        },
      }));
    }
  };

  // Initial sync only happens when app starts and has internet
  useEffect(() => {
    if (isConnected) {
      configs.forEach((config) => {
        if (!config.forceSync) {
          // Only sync if not forcing
          syncData(config);
        }
      });
    }
  }, [isConnected]);

  return {
    syncStatus,
    refresh: (key: string, forceSync: boolean = false) => {
      const config = configs.find((c) => c.key === key);
      if (config) {
        syncData({ ...config, forceSync });
      }
    },
  };
}
