import { useEffect, useState, useCallback, useRef } from "react";
import { useSQLite } from "~/providers/RealContextProvider";
import { isOnline } from "./network";

// ===================== TYPES =====================
export interface SyncConfig<T = any> {
  key: string;
  fetchFn: () => Promise<any>;
  tableName: string;
  transformData?: (data: any) => T[];
  schema?: Record<string, string>;
  staleTime?: number;
  forceSync?: boolean;
  autoMigrate?: boolean;
  priority?: number; // lower number = higher priority,
  customMerge?: (remoteData: T[], getAll: (table: string) => Promise<T[]>, create: any, update: any) => Promise<void>;
}

export type SyncState = {
  isLoading: boolean;
  error: Error | null;
  lastSyncTime: Date | null;
  migrationApplied?: boolean;
};

interface SyncStatus {
  [key: string]: SyncState;
}

// ===================== OPERATION QUEUE =====================
class OperationQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private isReady = false;

  setReady(ready: boolean) {
    this.isReady = ready;
    if (ready && !this.isProcessing) this.processQueue();
  }

  add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      if (this.isReady && !this.isProcessing) this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || !this.isReady || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (!operation) continue;
      try {
        await operation();
        await new Promise(res => setTimeout(res, 100)); // small delay between ops
      } catch (err) {
        console.error("[OperationQueue] Error executing operation:", err);
      }
    }

    this.isProcessing = false;
  }

  clear() {
    this.queue = [];
    this.isProcessing = false;
  }
}

const operationQueue = new OperationQueue();

// ===================== SCHEMA HELPERS =====================
async function getTableColumns(db: any, tableName: string) {
  try {
    const result = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
    return result.map((col: any) => col.name);
  } catch (err) {
    console.error(`[DataSync] Error getting columns for ${tableName}:`, err);
    return [];
  }
}

async function addMissingColumns(db: any, tableName: string, schema: Record<string, string>) {
  const existing = await getTableColumns(db, tableName);
  const missing = Object.keys(schema).filter(col => !existing.includes(col));

  for (const col of missing) {
    const type = schema[col];
    try {
      await new Promise(res => setTimeout(res, 50));
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${type};`);
      console.log(`[DataSync] Added column ${col} ${type}`);
    } catch (err) {
      console.error(`[DataSync] Failed to add column ${col}:`, err);
    }
  }

  return missing;
}

function ensureSchemaCompliance<T>(records: T[], schema?: Record<string, string>): T[] {
  if (!schema || records.length === 0) return records;

  return records.map(record => {
    const r = { ...record } as any;
    for (const col of Object.keys(schema)) {
      if (!(col in r)) {
        const type = schema[col].toUpperCase();
        if (type.includes("INTEGER") || type.includes("REAL")) r[col] = 0;
        else if (type.includes("TEXT")) r[col] = "";
        else r[col] = null;
      }
    }
    return r;
  });
}

// ===================== HOOK =====================
export function useDataSync<T = any>(configs: SyncConfig<T>[]) {
  const { deleteAll, batchCreate, db, isReady } = useSQLite();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({});
  const syncStatusRef = useRef(syncStatus);
  const configsRef = useRef(configs);
  const initializedRef = useRef(false);

  // update refs
  syncStatusRef.current = syncStatus;
  configsRef.current = configs;

  // mark queue ready
  useEffect(() => {
    operationQueue.setReady(isReady);
  }, [isReady]);

  // ===================== REFRESH =====================
  const refresh = useCallback(
    async (key: string, force: boolean = false) => {
      return operationQueue.add(async () => {
        const cfg = configsRef.current.find(c => c.key === key);
        if (!cfg) return;

        const { fetchFn, tableName, transformData, staleTime, forceSync, schema, autoMigrate = true } = cfg;
        const effectiveForce = force || forceSync;
        const lastSyncTime = syncStatusRef.current[key]?.lastSyncTime;
        const now = Date.now();

        // skip if not stale
        if (!effectiveForce && staleTime && lastSyncTime && now - lastSyncTime.getTime() < staleTime) {
          console.log(`[DataSync] Skipping ${key}, still fresh`);
          return;
        }

        setSyncStatus(prev => ({
          ...prev,
          [key]: { isLoading: true, error: null, lastSyncTime: prev[key]?.lastSyncTime || null, migrationApplied: false }
        }));

        try {
          let migrationApplied = false;

          // Offline-safe: only apply schema locally
          if (schema && autoMigrate && db) {
            const added = await addMissingColumns(db, tableName, schema);
            migrationApplied = added.length > 0;
          }

          // Offline-safe fetch
          let remoteData: any[] = [];
          if (isOnline()) {
            remoteData = transformData ? transformData(await fetchFn()) : await fetchFn();
          } else {
            console.log(`[DataSync] Offline, skipping fetch for ${key}`);
          }

          let records = schema ? ensureSchemaCompliance(remoteData, schema) : remoteData;

          // Only write to DB if online
          if (isOnline() && records.length > 0) {
            await deleteAll(tableName);
            await batchCreate(tableName, records);
          }

          setSyncStatus(prev => ({
            ...prev,
            [key]: { isLoading: false, error: null, lastSyncTime: new Date(), migrationApplied }
          }));

          console.log(`[DataSync] ✅ ${key} synced ${records.length} records${migrationApplied ? " (schema updated)" : ""}`);
        } catch (err: any) {
          console.error(`[DataSync] ❌ Error syncing ${key}:`, err);
          setSyncStatus(prev => ({
            ...prev,
            [key]: { isLoading: false, error: err instanceof Error ? err : new Error(String(err)), lastSyncTime: prev[key]?.lastSyncTime || null }
          }));
        }
      });
    },
    [deleteAll, batchCreate, db]
  );

  // ===================== INITIAL SYNC =====================
  useEffect(() => {
    if (!isReady || initializedRef.current) return;
    let mounted = true;

    const syncAll = async () => {
      const sortedConfigs = [...configsRef.current].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
      for (const cfg of sortedConfigs) {
        if (!mounted) break;
        await refresh(cfg.key, cfg.forceSync);
      }
      if (mounted) initializedRef.current = true;
    };

    syncAll();
    return () => { mounted = false; };
  }, [isReady, refresh]);

  return { syncStatus, refresh };
}

// ===================== RESET =====================
export function resetDataSync() {
  operationQueue.clear();
}
