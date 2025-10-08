import { useSQLite } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useEffect, useState, useCallback, useRef } from "react";
import { IMonitoringForms, IMonitoringModules } from "~/types";

// ============================================
// HELPER FUNCTIONS
// ============================================
interface IMonitoringFormsResponse {
  data: IMonitoringForms[];
}

// Convert API response to SQLite row
function formToSQLiteRow(form: IMonitoringForms) {
  return {
    _id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    id: form.id,
    name: form.name,
    name_kin: form.name_kin,
    json2: JSON.stringify(form.json2 || {}),
    post_data: form.post_data || "",
    table_name: form.table_name || "",
    single_page: form.single_page || 0,
    status: form.status || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Convert SQLite row back to form object
function sqliteRowToForm(row: any): IMonitoringForms {
  return {
    id: row.id,
    name: row.name,
    name_kin: row.name_kin,
    json2: JSON.parse(row.json2 || "{}"),
    post_data: row.post_data,
    table_name: row.table_name,
    single_page: row.single_page,
    status: row.status,
  };
}

// ============================================
// FETCH FROM REMOTE API
// ============================================

export async function fetchMonitoringFormsFromRemote() {
  const res = await baseInstance.get<IMonitoringFormsResponse>("/get-monitoring-forms");
  return res.data.data.map((form) => ({
    id: form.id,
    name: form.name,
    name_kin: form.name_kin,
    json2: form.json2,
    post_data: form.post_data,
    table_name: form.table_name,
    single_page: form.single_page,
    status: form.status,
  }));
}

// ============================================
// HOOK TO GET MONITORING FORMS
// ============================================

export function useGetMonitoringForms(forceSync: boolean = false) {
  const { getAll, batchCreate, deleteAll } = useSQLite();
  const [forms, setForms] = useState<IMonitoringForms[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Use ref to track if initial load has happened
  const hasInitialized = useRef(false);

  // Memoize the isStale check
  const isStale = useCallback(() => {
    if (!lastSyncTime) return true;
    return Date.now() - lastSyncTime.getTime() > 5 * 60 * 1000; // 5 minutes
  }, [lastSyncTime]);

  // Memoize loadForms to prevent infinite loops
  const loadForms = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await getAll("MonitoringForms");
      setForms(rows.map(sqliteRowToForm));
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading forms:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [getAll]);

  // Memoize syncForms to prevent infinite loops
  const syncForms = useCallback(async () => {
    try {
      setIsLoading(true);
      const remoteForms = await fetchMonitoringFormsFromRemote();
      const sqliteRows = remoteForms.map(formToSQLiteRow);

      await deleteAll("MonitoringForms");
      if (sqliteRows.length > 0) await batchCreate("MonitoringForms", sqliteRows);
      
      setForms(remoteForms);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error("Error syncing monitoring forms:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [deleteAll, batchCreate]);

  // Initialize on mount and when forceSync changes
  useEffect(() => {
    const initialize = async () => {
      // Load from SQLite first
      await loadForms();
      
      // Then sync if needed
      if (forceSync || isStale() || forms.length === 0) {
        await syncForms();
      }
      
      hasInitialized.current = true;
    };

    initialize();
  }, [forceSync, loadForms, syncForms, isStale, forms.length]);

  // Memoize refresh function
  const refresh = useCallback(
    async (forceFetch = true) => {
      if (forceFetch) {
        await syncForms();
      } else {
        await loadForms();
      }
    },
    [syncForms, loadForms]
  );

  return {
    monitoringForms: forms,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}

// ============================================
// GET FORMS BY MODULE (HOOK VERSION)
// ============================================

/**
 * Hook to fetch monitoring forms filtered by module ID
 */
export function useGetMonitoringFormsByModule(moduleId: number | null) {
  const { getAll } = useSQLite();
  const [forms, setForms] = useState<IMonitoringForms[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (moduleId === null) {
      setForms([]);
      setIsLoading(false);
      return;
    }

    const fetchForms = async () => {
      try {
        setIsLoading(true);

        // Get monitoring modules with the specified module ID
        const modules = await getAll<any>(
          "MonitoringModules",
          "form_data_source_module_id = ?",
          [moduleId]
        );
        const monitoringIds = modules.map((m) => m.monitoring_id);

        // Get forms that match the monitoring IDs
        const allForms = await getAll<any>("MonitoringForms");
        const moduleForms = allForms
          .map(sqliteRowToForm)
          .filter((f) => monitoringIds.includes(f.id));

        setForms(moduleForms);
      } catch (err) {
        console.error("Error fetching forms by module:", err);
        setError(err as Error);
        setForms([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForms();
  }, [moduleId, getAll]);

  return { forms, isLoading, error };
}

// ============================================
// UTILITY FUNCTION (NON-HOOK VERSION)
// ============================================

export async function getMonitoringFormsByModuleUtil(
  moduleId: number,
  getAllFn: ReturnType<typeof useSQLite>["getAll"]
) {
  // Get monitoring modules with the specified module ID
  const modules = await getAllFn<any>(
    "MonitoringModules",
    "form_data_source_module_id = ?",
    [moduleId]
  );
  const monitoringIds = modules.map((m) => m.monitoring_id);

  // Get forms that match the monitoring IDs
  const allForms = await getAllFn<any>("MonitoringForms");
  const moduleForms = allForms
    .map(sqliteRowToForm)
    .filter((f) => monitoringIds.includes(f.id));

  return moduleForms;
}

// ============================================
// GET FORM BY ID (HOOK VERSION - ALREADY CORRECT)
// ============================================

/**
 * Hook to fetch a monitoring form by ID from SQLite
 */
export function useGetMonitoringFormById(formId: number | null) {
  const { getByQuery } = useSQLite();
  const [form, setForm] = useState<IMonitoringForms | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (formId === null) {
      setForm(null);
      setIsLoading(false);
      return;
    }

    const fetchForm = async () => {
      try {
        setIsLoading(true);
        const rows = await getByQuery<any>("MonitoringForms", "id = ?", [formId], 1);
        if (rows.length > 0) {
          setForm(sqliteRowToForm(rows[0]));
        } else {
          setForm(null);
        }
      } catch (err) {
        console.error("Error fetching form by ID:", err);
        setError(err as Error);
        setForm(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [formId, getByQuery]);

  return { form, isLoading, error };
}

export async function getMonitoringFormByIdUtil(
  formId: number,
  getByQueryFn: ReturnType<typeof useSQLite>["getByQuery"]
): Promise<IMonitoringForms | null> {
  const rows = await getByQueryFn<any>("MonitoringForms", "id = ?", [formId], 1);
  return rows.length > 0 ? sqliteRowToForm(rows[0]) : null;
}