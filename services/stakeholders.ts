import { useEffect, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IStakeholder } from "~/models/stakeholders/stakeholder";
import { baseInstance } from "~/utils/axios";
import { useSQLite } from "~/providers/RealContextProvider";
import { useNetworkStatus } from "./network";

const STAKEHOLDERS_TABLE = "stakeholders";
const SYNC_KEY = "stakeholders_last_sync";
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export async function fetchStakeholdersFromRemote() {
  const res = await baseInstance.get<IStakeholder[]>("/get-stakeholders");
  return res.data;
}

export function useGetStakeholders(forceSync: boolean = false) {
  const { getAll, batchCreate, deleteAll, isReady } = useSQLite();
  const { isConnected } = useNetworkStatus();
  
  const [stakeholders, setStakeholders] = useState<IStakeholder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
  // Use ref to track the latest sync time without causing re-renders/dependency issues
  const lastSyncTimeRef = useRef<number | null>(null);

  // Load stakeholders from local database
  const loadLocalStakeholders = useCallback(async () => {
    if (!isReady) return;
    
    try {
      const data = await getAll<IStakeholder>(STAKEHOLDERS_TABLE);
      setStakeholders(data);
      
      // Get last sync time from AsyncStorage
      const storedSyncTime = await AsyncStorage.getItem(SYNC_KEY);
      if (storedSyncTime) {
        const syncTime = parseInt(storedSyncTime, 10);
        setLastSyncTime(syncTime);
        lastSyncTimeRef.current = syncTime;
      }
    } catch (err) {
      console.error("Error loading local stakeholders:", err);
      setError(err instanceof Error ? err : new Error("Failed to load stakeholders"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, getAll]);

  // Sync stakeholders from remote
  const syncStakeholders = useCallback(async (force: boolean = false) => {
    if (!isReady || !isConnected) return;

    const now = Date.now();
    const currentSyncTime = lastSyncTimeRef.current;
    const shouldSync = force || 
      !currentSyncTime || 
      (now - currentSyncTime) > STALE_TIME;

    if (!shouldSync) return;

    setIsLoading(true);
    setError(null);

    try {
      const remoteData = await fetchStakeholdersFromRemote();
      
      // Clear existing data and batch insert new data
      await deleteAll(STAKEHOLDERS_TABLE);
      await batchCreate(STAKEHOLDERS_TABLE, remoteData);
      
      setStakeholders(remoteData);
      setLastSyncTime(now);
      lastSyncTimeRef.current = now;
      await AsyncStorage.setItem(SYNC_KEY, now.toString());
    } catch (err) {
      console.error("Error syncing stakeholders:", err);
      setError(err instanceof Error ? err : new Error("Failed to sync stakeholders"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, isConnected, batchCreate, deleteAll]);

  // Initial load
  useEffect(() => {
    loadLocalStakeholders();
  }, [loadLocalStakeholders]);

  // Auto-sync on mount and when connection is restored
  useEffect(() => {
    if (isReady && isConnected) {
      syncStakeholders(forceSync);
    }
  }, [isReady, isConnected, forceSync, syncStakeholders]);

  const refresh = useCallback((force: boolean = true) => {
    return syncStakeholders(force);
  }, [syncStakeholders]);

  return {
    stakeholders,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}