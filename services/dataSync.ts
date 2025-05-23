import { useEffect, useMemo, useState, useCallback, useRef } from "react";

import { Realm } from "@realm/react";
import { RealmContext } from "~/providers/RealContextProvider";

import { useNetworkStatus, isOnline } from "./network";
import { useAuth } from "~/lib/hooks/useAuth";

const { useRealm } = RealmContext;

export type SyncState = {
  isLoading: boolean;
  error: Error | null;
  lastSyncTime: Date | null;
};

export type SyncStatus = {
  [key: string]: SyncState;
};

export type SyncConfig = {
  key: string;
  fetchFn: () => Promise<any>;
  model: any;
  transformData?: (data: any) => any;
  staleTime?: number; // Time in milliseconds before data is considered stale
  forceSync?: boolean; // Whether to force sync from remote
  filterByUser?: boolean; // Add a flag to indicate if data should be filtered by user
};

export function useDataSync(configs: SyncConfig[]) {
  const realm = useRealm();
  const { user } = useAuth({}); // Get the current user
  const { isConnected } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({});
  const isSyncingRef = useRef<{ [key: string]: boolean }>({});
  const lastSyncTimeRef = useRef<{ [key: string]: number }>({});

  // Minimum time between API calls in milliseconds (30 seconds)
  const MIN_SYNC_INTERVAL = 30000;

  const syncData = useCallback(
    async (config: SyncConfig) => {
      const { key, fetchFn, model, transformData, forceSync, filterByUser = true } = config;

      // Skip if already syncing
      if (isSyncingRef.current[key]) {
        return;
      }

      // Check if we need to sync based on stale time and the last sync time
      const now = Date.now();
      const lastSync = lastSyncTimeRef.current[key] || 0;
      const timeSinceLastSync = now - lastSync;

      if (timeSinceLastSync < MIN_SYNC_INTERVAL && !config.forceSync) {
        return;
      }

      try {
        isSyncingRef.current[key] = true;
        setSyncStatus((prevStatus) => ({
          ...prevStatus,
          [key]: {
            ...(prevStatus[key] || {}),
            isLoading: true,
            error: null,
          },
        }));

        // Only sync if online
        if (!isOnline()) {
          throw new Error("No network connection");
        }

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

        // Filter data by user ID when needed
        if (filterByUser && user?.id) {
          const userId = user.id;
          const currentUserId = userId;
          
          // When a new user logs in, filter out data from other users that is stored locally
          // This only happens after syncing with the remote server
          realm.write(() => {
            // Get all objects of this model
            const allObjects = realm.objects(model);
            
            // For each object, check if it belongs to another user
            // Schema-specific filtering - look for either user_id or form_data.user_id
            allObjects.forEach((obj: any) => {
              // Determine ownership based on object structure
              let objUserId = null;
              
              // Check different paths where user ID might be stored
              if (obj.form_data && obj.form_data.user_id) {
                objUserId = obj.form_data.user_id;
              } else if (obj.user_id) {
                objUserId = obj.user_id;
              }
              
              // If this object belongs to another user and was created locally, delete it
              if (objUserId !== null && 
                  objUserId !== currentUserId && 
                  obj.sync_data && 
                  obj.sync_data.sync_status === false) {
                realm.delete(obj);
              }
            });
          });
        }

        // Update sync status
        setSyncStatus((prevStatus) => ({
          ...prevStatus,
          [key]: {
            isLoading: false,
            error: null,
            lastSyncTime: new Date(),
          },
        }));

        lastSyncTimeRef.current[key] = now;
      } catch (error) {
        console.log(`Error syncing ${key}:`, error);
        setSyncStatus((prevStatus) => ({
          ...prevStatus,
          [key]: {
            ...(prevStatus[key] || {}),
            isLoading: false,
            error: error as Error,
          },
        }));
      } finally {
        isSyncingRef.current[key] = false;
      }
    },
    [realm, user]
  );

  // Sync all the configured data sources
  const syncAll = useCallback(
    (forceSync = false) => {
      return Promise.all(
        configs.map((config) => syncData({ ...config, forceSync }))
      );
    },
    [configs, syncData]
  );

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

  // Initial sync on component mount
  useEffect(() => {
    syncAll();
  }, []);

  // Function to refresh a specific data source
  const refresh = useCallback(
    (key: string, forceSync = true) => {
      const config = configs.find((c) => c.key === key);
      if (config) {
        return syncData({ ...config, forceSync });
      }
      return Promise.resolve();
    },
    [configs, syncData]
  );

  return {
    syncStatus,
    syncAll,
    refresh,
  };
}
