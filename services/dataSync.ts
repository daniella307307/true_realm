import { useEffect, useState, useCallback, useRef } from "react";
import { useSQLite } from "~/providers/RealContextProvider";

export interface SyncConfig<T = any> {
  key: string;
  fetchFn: () => Promise<any>;
  tableName: string;
  transformData?: (data: any) => T[];
  schema?: Record<string, string>;
  staleTime?: number;
  forceSync?: boolean;
  autoMigrate?: boolean;
  priority?: number; // Lower number = higher priority
}

interface SyncStatus {
  [key: string]: SyncState;
}

export type SyncState = {
  isLoading: boolean;
  error: Error | null;
  lastSyncTime: Date | null;
  migrationApplied?: boolean;
};

/**
 * Get existing columns from a table
 */
async function getTableColumns(
  db: any,
  tableName: string
): Promise<string[]> {
  try {
    const result = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
    return result.map((col: any) => col.name);
  } catch (error) {
    console.error(`[DataSync] Error getting columns for ${tableName}:`, error);
    return [];
  }
}

/**
 * Add missing columns to a table
 */
async function addMissingColumns(
  db: any,
  tableName: string,
  schema: Record<string, string>
): Promise<string[]> {
  const existingColumns = await getTableColumns(db, tableName);
  const schemaColumns = Object.keys(schema);
  const missingColumns = schemaColumns.filter(
    (col) => !existingColumns.includes(col)
  );

  if (missingColumns.length === 0) {
    console.log(`[DataSync] No missing columns for ${tableName}`);
    return [];
  }

  console.log(`[DataSync] Adding missing columns to ${tableName}:`, missingColumns);

  for (const column of missingColumns) {
    const columnType = schema[column];
    try {
      // Add delay between ALTER TABLE operations
      await new Promise(resolve => setTimeout(resolve, 50));
      await db.execAsync(
        `ALTER TABLE ${tableName} ADD COLUMN ${column} ${columnType};`
      );
      console.log(`[DataSync] ✅ Added column: ${column} ${columnType}`);
    } catch (error) {
      console.error(`[DataSync] ❌ Failed to add column ${column}:`, error);
    }
  }

  return missingColumns;
}

/**
 * Validate data against schema and add default values for missing columns
 */
function ensureSchemaCompliance<T>(
  records: T[],
  schema?: Record<string, string>
): T[] {
  if (!schema || records.length === 0) return records;

  return records.map((record) => {
    const compliantRecord = { ...record } as any;

    Object.keys(schema).forEach((column) => {
      if (!(column in compliantRecord)) {
        const type = schema[column].toUpperCase();
        
        if (type.includes('INTEGER') || type.includes('REAL')) {
          compliantRecord[column] = 0;
        } else if (type.includes('TEXT')) {
          compliantRecord[column] = '';
        } else if (type.includes('BLOB')) {
          compliantRecord[column] = null;
        } else {
          compliantRecord[column] = null;
        }
      }
    });

    return compliantRecord;
  });
}

// ============================================
// OPERATION QUEUE FOR SEQUENTIAL EXECUTION
// ============================================

class OperationQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private isReady = false;

  setReady(ready: boolean) {
    this.isReady = ready;
    if (ready && !this.isProcessing) {
      this.processQueue();
    }
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (this.isReady && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !this.isReady) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        try {
          await operation();
          // Add small delay between operations to prevent lock contention
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('[OperationQueue] Error executing operation:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  clear() {
    this.queue = [];
    this.isProcessing = false;
  }
}

// Global operation queue
const operationQueue = new OperationQueue();

export function useDataSync<T = any>(configs: SyncConfig<T>[]) {
  const { deleteAll, batchCreate, db, isReady } = useSQLite();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({});

  const syncStatusRef = useRef<SyncStatus>({});
  syncStatusRef.current = syncStatus;

  const configsRef = useRef<SyncConfig<T>[]>(configs);
  const hasInitializedRef = useRef(false);

  // Update queue ready state when db is ready
  useEffect(() => {
    operationQueue.setReady(isReady);
  }, [isReady]);

  const refresh = useCallback(
    async (key: string, force: boolean = false) => {
      // Wait for database to be ready
      if (!isReady) {
        console.log(`[DataSync] Database not ready, queueing ${key}`);
      }

      return operationQueue.add(async () => {
        const config = configsRef.current.find((c) => c.key === key);
        if (!config) return;

        const {
          fetchFn,
          tableName,
          transformData,
          staleTime,
          forceSync,
          schema,
          autoMigrate = true,
        } = config;

        const effectiveForce = force || forceSync;
        const lastSyncTime = syncStatusRef.current[key]?.lastSyncTime;
        const now = Date.now();

        // Stale check
        if (
          !effectiveForce &&
          staleTime &&
          lastSyncTime &&
          now - lastSyncTime.getTime() < staleTime
        ) {
          console.log(`[DataSync] Skipping ${key}, still fresh`);
          return;
        }

        // Set loading state
        setSyncStatus((prev) => ({
          ...prev,
          [key]: {
            isLoading: true,
            error: null,
            lastSyncTime: prev[key]?.lastSyncTime || null,
            migrationApplied: false,
          },
        }));

        try {
          // Step 1: Schema migration
          let migrationApplied = false;
          if (schema && autoMigrate && db) {
            try {
              const missingColumns = await addMissingColumns(db, tableName, schema);
              migrationApplied = missingColumns.length > 0;
            } catch (migrationError) {
              console.warn(`[DataSync] Migration failed for ${tableName}, continuing...`, migrationError);
            }
          }

          // Step 2: Fetch remote data
          const remoteData = await fetchFn();

          let records: T[] = transformData
            ? transformData(remoteData)
            : Array.isArray(remoteData?.data)
            ? remoteData.data
            : [];

          // Step 3: Ensure schema compliance
          if (schema) {
            records = ensureSchemaCompliance(records, schema);
          }

          // Step 4: Delete old data (with retry)
          try {
            await deleteAll(tableName);
          } catch (deleteError: any) {
            if (deleteError.message?.includes('NullPointerException')) {
              console.log(`[DataSync] Retrying deleteAll for ${tableName}...`);
              await new Promise(resolve => setTimeout(resolve, 200));
              await deleteAll(tableName);
            } else {
              throw deleteError;
            }
          }

          // Step 5: Insert new data (with retry)
          if (records.length > 0) {
            try {
              await batchCreate(tableName, records);
            } catch (insertError: any) {
              if (insertError.message?.includes('NullPointerException')) {
                console.log(`[DataSync] Retrying batchCreate for ${tableName}...`);
                await new Promise(resolve => setTimeout(resolve, 200));
                await batchCreate(tableName, records);
              } else {
                throw insertError;
              }
            }
          }

          setSyncStatus((prev) => ({
            ...prev,
            [key]: {
              isLoading: false,
              error: null,
              lastSyncTime: new Date(),
              migrationApplied,
            },
          }));

          console.log(
            `[DataSync] ✅ Synced ${records.length} records into ${tableName}` +
              (migrationApplied ? " (schema updated)" : "")
          );
        } catch (err: any) {
          console.error(`[DataSync] ❌ Error syncing ${key}:`, err);
          setSyncStatus((prev) => ({
            ...prev,
            [key]: {
              isLoading: false,
              error: err instanceof Error ? err : new Error(String(err)),
              lastSyncTime: prev[key]?.lastSyncTime || null,
              migrationApplied: false,
            },
          }));
        }
      });
    },
    [deleteAll, batchCreate, db, isReady]
  );

  // Update configsRef when configs change
  useEffect(() => {
    configsRef.current = configs;
  }, [configs]);

  // Initial sync - with priority sorting
  useEffect(() => {
    if (hasInitializedRef.current || !isReady) return;

    let isMounted = true;

    const syncAll = async () => {
      // Sort configs by priority (lower number = higher priority)
      const sortedConfigs = [...configsRef.current].sort(
        (a, b) => (a.priority ?? 999) - (b.priority ?? 999)
      );

      for (const cfg of sortedConfigs) {
        if (!isMounted) break;
        await refresh(cfg.key, cfg.forceSync);
      }

      if (isMounted) {
        hasInitializedRef.current = true;
      }
    };

    syncAll();

    return () => {
      isMounted = false;
    };
  }, [refresh, isReady]);

  return { syncStatus, refresh };
}

// Helper function to reset sync state (useful for logout/login)
export function resetDataSync() {
  operationQueue.clear();
}