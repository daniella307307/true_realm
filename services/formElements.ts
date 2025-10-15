import { useEffect, useCallback, useState, useMemo } from "react";
import { useSQLite } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { I4BaseFormat, IExistingForm } from "~/types";
import { checkNetworkConnection } from "~/utils/networkHelpers";

// ---------------- FETCH FROM API ----------------
export async function fetchFormsFromRemote(): Promise<IExistingForm[]> {
  try {
    const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(`/v2/surveys`);
    const data = res.data?.data;
    
    // Ensure we always return an array
    if (!data) return [];
    if (Array.isArray(data)) return data;
    
    console.warn('[fetchFormsFromRemote] Unexpected data format:', typeof data);
    return [];
  } catch (error) {
    console.error('[fetchFormsFromRemote] Error:', error);
    return [];
  }
}

export async function fetchFormByProjectFromRemote(
  projectId: number
): Promise<IExistingForm[]> {
  try {
    const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(
      `/v2/surveys`
    );
    const data = res.data?.data;
    
    // Ensure we always return an array
    if (!data) return [];
    if (Array.isArray(data)) return data;
    
    console.warn(`[fetchFormByProjectFromRemote] Unexpected data format for project ${projectId}:`, typeof data);
    return [];
  } catch (error) {
    console.error(`[fetchFormByProjectFromRemote] Error for project ${projectId}:`, error);
    return [];
  }
}

// ---------------- HELPER: DEDUPLICATE FORMS ----------------
function deduplicateForms(forms: IExistingForm[]): IExistingForm[] {
  const uniqueMap = new Map<number, IExistingForm>();
  
  forms.forEach((form) => {
    const existing = uniqueMap.get(form.id);
    
    // Keep the most recently updated form, or the first one if no updated_at field
    if (!existing) {
      uniqueMap.set(form.id, form);
    } else {
      const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const currentTime = form.updated_at ? new Date(form.updated_at).getTime() : 0;
      
      if (currentTime > existingTime) {
        console.warn(`Replacing duplicate form ID ${form.id} with newer version`);
        uniqueMap.set(form.id, form);
      } else {
        console.warn(`Skipping duplicate form ID ${form.id}`);
      }
    }
  });
  
  return Array.from(uniqueMap.values());
}

// ---------------- USE GET ALL FORMS (OFFLINE-FIRST) ----------------
export function useGetForms(forceSync: boolean = false) {
  const { getAll } = useSQLite();
  const [storedForms, setStoredForms] = useState<IExistingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [dataSource, setDataSource] = useState<"local" | "remote" | "pending">("pending");
  const [error, setError] = useState<Error | null>(null);

  const { syncStatus, refresh: syncRefresh } = useDataSync<IExistingForm>([
    {
      key: "forms",
      fetchFn: async () => {
        const data = await fetchFormsFromRemote();
        console.log(`[useDataSync] forms fetched: ${data?.length || 0} records`);
        return data;
      },
      tableName: "Surveys",
      staleTime: 5 * 60 * 1000,
      forceSync,
    },
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadForms = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // STEP 1: Load from SQLite immediately (OFFLINE-FIRST)
        console.log("Loading forms from local SQLite...");
        const localForms = await getAll<IExistingForm>("Surveys");
        const dedupedLocalForms = deduplicateForms(localForms);
        
        if (isMounted) {
          setStoredForms(dedupedLocalForms);
          setDataSource("local");
          setIsLoading(false); // Show local data immediately
          console.log(`Loaded ${dedupedLocalForms.length} forms from local SQLite`);
        }

        // STEP 2: Check network and sync in background
        const online = await checkNetworkConnection();
        setIsOffline(!online);

        if (online && isMounted) {
          console.log("Online — syncing forms from remote in background...");
          
          try {
            // Trigger background sync (this will update SQLite)
            await syncRefresh("forms", forceSync);

            // Wait for sync to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Reload from SQLite after sync
            const syncedForms = await getAll<IExistingForm>("Surveys");
            const dedupedSyncedForms = deduplicateForms(syncedForms);

            if (isMounted) {
              setStoredForms(dedupedSyncedForms);
              setDataSource("remote");
              console.log(`Synced ${dedupedSyncedForms.length} forms from remote`);
            }
          } catch (syncErr) {
            console.warn("Background sync failed, continuing with local data:", syncErr);
            // Keep local data, don't set error since we have valid local data
          }
        }
      } catch (err) {
        console.error("Error loading forms:", err);
        
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    loadForms();

    return () => {
      isMounted = false;
    };
  }, [getAll, syncRefresh, forceSync]);

  // Already deduped in the effect, but keep for safety
  const uniqueForms = useMemo(() => {
    return deduplicateForms(storedForms);
  }, [storedForms]);

  const refresh = useCallback(async () => {
    const online = await checkNetworkConnection();
    setIsOffline(!online);
    
    if (online) {
      try {
        await syncRefresh("forms", true);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (syncErr) {
        console.warn("Sync failed during refresh:", syncErr);
      }
    }
    
    const forms = await getAll<IExistingForm>("Surveys");
    const dedupedForms = deduplicateForms(forms);
    setStoredForms(dedupedForms);
    setDataSource(online ? "remote" : "local");
  }, [getAll, syncRefresh]);

  return {
    forms: uniqueForms,
    isLoading: isLoading || syncStatus.forms?.isLoading || false,
    error: error || syncStatus.forms?.error || null,
    isOffline,
    dataSource,
    lastSyncTime: syncStatus.forms?.lastSyncTime || null,
    refresh,
  };
}

// ---------------- USE GET FORMS BY PROJECT (OFFLINE-FIRST) ----------------
export function useGetFormsByProject(
  projectId?: number,
  sourceModuleId?: number,
  projectModuleId?: number,
  forceSync: boolean = false
) {
  const { getAll } = useSQLite();
  const [storedForms, setStoredForms] = useState<IExistingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [dataSource, setDataSource] = useState<"local" | "remote" | "pending">("pending");
  const [error, setError] = useState<Error | null>(null);

  const { syncStatus, refresh: syncRefresh } = useDataSync<IExistingForm>(
    projectId
      ? [
          {
            key: `forms-${projectId}`,
            fetchFn: () => fetchFormByProjectFromRemote(projectId),
            tableName: "Surveys",
            staleTime: 5 * 60 * 1000,
            forceSync,
          },
        ]
      : []
  );

  useEffect(() => {
    let isMounted = true;

    const loadForms = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // STEP 1: Load from SQLite immediately (OFFLINE-FIRST)
        console.log("Loading forms from local SQLite...");
        const allForms = await getAll<IExistingForm>("Surveys");
        const dedupedForms = deduplicateForms(allForms);
        const filtered = filterForms(dedupedForms, projectId, sourceModuleId, projectModuleId);

        if (isMounted) {
          setStoredForms(filtered);
          setDataSource("local");
          setIsLoading(false); // Show local data immediately
          console.log(`Loaded ${filtered.length} filtered forms from local SQLite`);
        }

        // STEP 2: Check network and sync in background
        const online = await checkNetworkConnection();
        setIsOffline(!online);

        if (online && projectId && isMounted) {
          console.log(`Online — syncing forms for project ${projectId} in background...`);

          try {
            // Trigger background sync (this will update SQLite)
            await syncRefresh(`forms-${projectId}`, forceSync);

            // Wait for sync to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Reload from SQLite after sync
            const syncedForms = await getAll<IExistingForm>("Surveys");
            const dedupedSyncedForms = deduplicateForms(syncedForms);
            const filteredSynced = filterForms(dedupedSyncedForms, projectId, sourceModuleId, projectModuleId);

            if (isMounted) {
              setStoredForms(filteredSynced);
              setDataSource("remote");
              console.log(`Synced ${filteredSynced.length} filtered forms from remote`);
            }
          } catch (syncErr) {
            console.warn("Background sync failed, continuing with local data:", syncErr);
            // Keep local data, don't set error since we have valid local data
          }
        }
      } catch (err) {
        console.error("Error loading forms:", err);
        
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    loadForms();

    return () => {
      isMounted = false;
    };
  }, [projectId, sourceModuleId, projectModuleId, getAll, syncRefresh, forceSync]);

  // Deduplicate and sort
  const uniqueFilteredForms = useMemo(() => {
    const deduped = deduplicateForms(storedForms);
    
    // Sort by order_list
    return deduped.sort((a, b) => (a.order_list || 0) - (b.order_list || 0));
  }, [storedForms]);

  const refresh = useCallback(async () => {
    const online = await checkNetworkConnection();
    setIsOffline(!online);
    
    if (online && projectId) {
      try {
        await syncRefresh(`forms-${projectId}`, true);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (syncErr) {
        console.warn("Sync failed during refresh:", syncErr);
      }
    }
    
    const allForms = await getAll<IExistingForm>("Surveys");
    const dedupedForms = deduplicateForms(allForms);
    const filtered = filterForms(dedupedForms, projectId, sourceModuleId, projectModuleId);
    setStoredForms(filtered);
    setDataSource(online ? "remote" : "local");
  }, [projectId, sourceModuleId, projectModuleId, getAll, syncRefresh]);

  return {
    filteredForms: uniqueFilteredForms,
    isLoading: isLoading || syncStatus[`forms-${projectId}`]?.isLoading || false,
    error: error || syncStatus[`forms-${projectId}`]?.error || null,
    isOffline,
    dataSource,
    lastSyncTime: syncStatus[`forms-${projectId}`]?.lastSyncTime || null,
    refresh,
  };
}

// ---------------- USE GET FORM BY ID (OFFLINE-FIRST) ----------------
export function useGetFormById(
  formId: number,
  projectModuleId?: number,
  sourceModuleId?: number,
  projectId?: number
) {
  const { getAll } = useSQLite();
  const [form, setForm] = useState<IExistingForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadForm = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check network status
        const online = await checkNetworkConnection();
        setIsOffline(!online);

        // Load all forms from SQLite (single source of truth)
        const allForms = await getAll<IExistingForm>("Surveys");
        const dedupedForms = deduplicateForms(allForms);

        // Find form by ID with optional strict matching
        const found = dedupedForms.find((f) => {
          // Always match form ID
          if (f.id !== formId) return false;

          // Optional strict matching
          if (projectModuleId !== undefined && f.project_module_id !== projectModuleId)
            return false;
          if (sourceModuleId !== undefined && f.source_module_id !== sourceModuleId)
            return false;
          if (projectId !== undefined && f.project_id !== projectId) return false;

          return true;
        });

        if (isMounted) {
          setForm(found || null);
          console.log(
            found
              ? `Found form ${formId}`
              : `Form ${formId} not found in local storage`
          );
        }
      } catch (err) {
        console.error("Error loading form:", err);
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadForm();

    return () => {
      isMounted = false;
    };
  }, [formId, projectModuleId, sourceModuleId, projectId, getAll]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const allForms = await getAll<IExistingForm>("Surveys");
    const dedupedForms = deduplicateForms(allForms);
    const found = dedupedForms.find((f) => {
      if (f.id !== formId) return false;
      if (projectModuleId !== undefined && f.project_module_id !== projectModuleId)
        return false;
      if (sourceModuleId !== undefined && f.source_module_id !== sourceModuleId)
        return false;
      if (projectId !== undefined && f.project_id !== projectId) return false;
      return true;
    });
    setForm(found || null);
    setIsLoading(false);
  }, [formId, projectModuleId, sourceModuleId, projectId, getAll]);

  return { form, isLoading, error, isOffline, refresh };
}

// ---------------- HELPER FUNCTION ----------------
function filterForms(
  forms: IExistingForm[],
  projectId?: number,
  sourceModuleId?: number,
  projectModuleId?: number
): IExistingForm[] {
  let filtered = forms;

  if (projectId !== undefined) {
    filtered = filtered.filter((f) => f.project_id === projectId);
  }

  if (sourceModuleId !== undefined) {
    filtered = filtered.filter((f) => f.source_module_id === sourceModuleId);
  }

  if (projectModuleId !== undefined) {
    filtered = filtered.filter((f) => f.project_module_id === projectModuleId);
  }

  return filtered;
}