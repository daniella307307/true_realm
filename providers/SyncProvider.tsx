import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getPendingChangesCount, syncAllPendingChanges } from '~/services/survey-submission';

interface SyncContextType {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  triggerManualSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: React.ReactNode;
  getAll: any;
  update: any;
  create: any;
  query: any;
  t?: any;
  userId?: number;
  syncIntervalMs?: number; 
  enabled?: boolean;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({
  children,
  getAll,
  update,
  create,
  query,
  t,
  userId,
  syncIntervalMs = 30000,
  enabled = true,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const isNowOnline = state.isConnected ?? false;
      
      setIsOnline(isNowOnline);
      
      // If we just came back online, trigger sync
      if (wasOffline && isNowOnline && enabled && userId) {
        console.log('Network reconnected - triggering auto-sync');
        performSync();
      }
    });

    return () => unsubscribe();
  }, [isOnline, enabled, userId]);

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';
      
      appStateRef.current = nextAppState;
      
      // If app came to foreground, trigger sync
      if (wasInBackground && isNowActive && enabled && userId && isOnline) {
        console.log('App became active - triggering auto-sync');
        performSync();
      }
    });

    return () => subscription.remove();
  }, [enabled, userId, isOnline]);

  // Periodic sync
  useEffect(() => {
    if (!enabled || !userId || !isOnline) {
      return;
    }

    // Initial sync
    performSync();
    syncIntervalRef.current = setInterval(() => {
      performSync();
    }, syncIntervalMs);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [enabled, userId, isOnline, syncIntervalMs]);

  // Check pending changes count
  const checkPendingChanges = async () => {
    if (!userId || !query) return;

    try {
      const result = await getPendingChangesCount(query, userId);
      setPendingChanges(result.total);
      return result;
    } catch (error) {
      console.error('Error checking pending changes:', error);
      return null;
    }
  };

  // Perform the sync
  const performSync = async () => {
    if (isSyncing || !userId || !isOnline || !enabled) {
      return;
    }

    try {
      setIsSyncing(true);

      // Check if there are pending changes
      const pendingCount = await checkPendingChanges();
      
      if (!pendingCount || pendingCount.total === 0) {
        console.log('No pending changes to sync');
        return;
      }

      console.log(
        `Auto-sync: Found ${pendingCount.total} pending changes (${pendingCount.newSubmissions} new, ${pendingCount.modifiedSubmissions} modified)`
      );

      // Perform the sync
      const result = await syncAllPendingChanges(
        getAll,
        update,
        create,
        query,
        t,
        userId
      );

      setLastSyncTime(new Date());
      
      // Refresh pending changes count
      await checkPendingChanges();

      console.log('Auto-sync completed:', result);
    } catch (error) {
      console.error('Error during auto-sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual sync trigger
  const triggerManualSync = async () => {
    console.log('Manual sync triggered');
    await performSync();
  };

  const value: SyncContextType = {
    isSyncing,
    lastSyncTime,
    pendingChanges,
    triggerManualSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

// Hook to use sync context
export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
