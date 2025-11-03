import { useEffect, useCallback, useState, useMemo } from "react";
import { useSQLite } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { I4BaseFormat, IExistingForm } from "~/types";
import { checkNetworkConnection } from "~/utils/networkHelpers";
import { FetchFormsResult, IFormResponse, IFormsApiResponse } from "./project";
import { useAuth } from "~/lib/hooks/useAuth";
// ---------------- FETCH FROM API ----------------
export async function fetchFormsFromRemote(): Promise<IExistingForm[]> {
  try {
    const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(`/forms`);
    const data = res.data?.data;
    
    // Ensure we always return an array
    if (!data){
      console.warn('[fetchFormsFromRemote] No data in response');
      return [];
    };
    if (Array.isArray(data)) return data;
    
    console.warn('[fetchFormsFromRemote] Unexpected data format:', typeof data);
    return [];
  } catch (error) {
    console.error('[fetchFormsFromRemote] Error:', error);
    return [];
  }
}

// ---------------- HELPER: DEDUPLICATE FORMS ----------------
function deduplicateForms(forms: IExistingForm[]): IExistingForm[] {
  const uniqueMap = new Map<string, IExistingForm>();
  
  forms.forEach((form) => {
    const existing = uniqueMap.get(form.id);
    
    // Keep the most recently updated form, or the first one if no updated_at field
    if (!existing) {
      uniqueMap.set(form.id, form);
    } else {
      const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const currentTime = form.updated_at ? new Date(form.updated_at).getTime() : 0;
      
      if (currentTime > existingTime) {
        uniqueMap.set(form.id, form);
      }
    }
  });
  
  return Array.from(uniqueMap.values());
}

// ---------------- FETCH FROM API ----------------
// Update fetchFormByProjectFromRemote to return proper result even for empty arrays
export async function fetchFormByProjectFromRemote(): Promise<FetchFormsResult> {
  try {
    console.log('[fetchFormsFromRemote] Starting fetch...');
    console.log('[fetchFormsFromRemote] BaseURL:', baseInstance.defaults.baseURL);
    
    const endpoints = ["/forms"];
    let res: any = null;
    let successEndpoint = "";
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[fetchFormsFromRemote] Trying endpoint: ${endpoint}`);
        res = await baseInstance.get<IFormsApiResponse>(endpoint);
        successEndpoint = endpoint;
        console.log(`[fetchFormsFromRemote] Success with endpoint: ${endpoint}`);
        break;
      } catch (err: any) {
        console.log(`[fetchFormsFromRemote] Failed with ${endpoint}: ${err.response?.status || err.message}`);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          return { forms: [], statusCode: err.response.status };
        }
        continue;
      }
    }
    
    if (!res) {
      console.error('[fetchFormsFromRemote] All endpoints failed');
      return { forms: [] };
    }
    
    console.log('[fetchFormsFromRemote] Response status:', res.status);
    
    
    const data = res.data;
    
    if (!data) {
      console.warn('[fetchFormsFromRemote] No data in response');
      return { forms: [], statusCode: res.status };
    }

    let formsArray: IFormResponse[] = [];

    // Check different response structures
    if (data.success && Array.isArray(data.forms)) {
      formsArray = data.forms;
    }
    else if ('data' in data) {
      const nestedData = (data as any).data;
      if (Array.isArray(nestedData)) {
        formsArray = nestedData;
      } else if (nestedData && typeof nestedData === 'object' && 'data' in nestedData) {
        formsArray = (nestedData as any).data;
      }
    }
    else if (Array.isArray(data)) {
      formsArray = data as any;
    }

    // CRITICAL: Return statusCode even for empty arrays
    if (!Array.isArray(formsArray) || formsArray.length === 0) {
      console.warn('[fetchFormsFromRemote] Empty forms array - returning with status code');
      return { forms: [], statusCode: res.status };
    }

    const forms: IExistingForm[] = formsArray.map(form => ({
      _id: form._id,
      id: form._id || (form as any).id,
      title: form.title,
      name: form.title,
      description: form.description || '',
      status: form.status,
      organization: form.organization || '',
      department: form.department || '',
      metadata: form.metadata || {},
     
      json2: form.formDefinition || {},
      json: JSON.stringify(form.formDefinition || {}),
      formDefinition: JSON.stringify(form.formDefinition || {}),
      
      project_id: 0,
      source_module_id: 0,
      project_module_id: 0,
      module_id: null,
      parent_id: undefined,
      
      survey_status: form.status === 'published' ? 1 : 0,
      is_primary: 1,
      order_list: 0,
      name_kin: undefined,
      slug: null,
      json2_bkp: null,
      table_name: undefined,
      post_data: undefined,
      fetch_data: null,
      loads: null,
      prev_id: null,
      
      created_at: form.createdAt,
      updated_at: form.updatedAt,
    }));
    
    console.log(`[fetchFormsFromRemote] Successfully mapped ${forms.length} forms`);
    return { forms, statusCode: res.status };
  } catch (error: any) {
    console.error('[fetchFormsFromRemote] Error:', error);
    
    if (error.response) {
      console.error('[fetchFormsFromRemote] Error status:', error.response.status);
      return { forms: [], statusCode: error.response.status };
    } else if (error.request) {
      console.error('[fetchFormsFromRemote] No response received');
    } else {
      console.error('[fetchFormsFromRemote] Error message:', error.message);
    }
    
    return { forms: [] };
  }
}

// Update useGetForms to handle the empty response properly
export function useGetForms(forceSync: boolean = false) {
  const { getAll, deleteAll } = useSQLite();
  const [storedForms, setStoredForms] = useState<IExistingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [dataSource, setDataSource] = useState<"local" | "remote" | "pending">("pending");
  const [error, setError] = useState<Error | null>(null);
  const { isLoggedIn } = useAuth({});

  const { syncStatus, refresh: syncRefresh } = useDataSync<IExistingForm>([
    {
      key: "forms",
      fetchFn: async () => {
        const result = await fetchFormByProjectFromRemote();
        console.log(`[useDataSync] forms fetched: ${result.forms?.length || 0} records, status: ${result.statusCode}`);
        
        // CRITICAL: If server returns empty with success status, clear local DB
        if (result.forms.length === 0 && 
            result.statusCode && 
            result.statusCode >= 200 && 
            result.statusCode < 300) {
          console.warn('[useDataSync] Server returned 0 forms with success status - will trigger DB clear');
        }
        
        return result.forms;
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
          setIsLoading(false);
          console.log(`Loaded ${dedupedLocalForms.length} forms from local SQLite`);
        }

        // STEP 2: Check network and sync in background
        const online = await checkNetworkConnection();
        setIsOffline(!online);
        const loginStatus = await Promise.resolve(isLoggedIn);
        if (online && isMounted && loginStatus) {
          console.log("Online — syncing forms from remote in background...");
          
          try {
            const remoteResult = await fetchFormByProjectFromRemote();
            
            // SECURITY CHECK: Clear local DB if server returns empty with success
            if (remoteResult.forms.length === 0 && 
                remoteResult.statusCode && 
                remoteResult.statusCode >= 200 && 
                remoteResult.statusCode < 300) {
              console.warn('[SECURITY] Remote returned 0 forms with successful status. Clearing local database.');
              await deleteAll("Surveys");
              
              if (isMounted) {
                setStoredForms([]);
                setDataSource("remote");
                console.log('Local forms database cleared for security');
              }
              return;
            }
            
            // Normal sync for non-empty or error responses
            await syncRefresh("forms", forceSync);
            await new Promise(resolve => setTimeout(resolve, 500));

            const syncedForms = await getAll<IExistingForm>("Surveys");
            const dedupedSyncedForms = deduplicateForms(syncedForms);

            if (isMounted) {
              setStoredForms(dedupedSyncedForms);
              setDataSource("remote");
              console.log(`Synced ${dedupedSyncedForms.length} forms from remote`);
            }
          } catch (syncErr) {
            console.warn("Background sync failed, continuing with local data:", syncErr);
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
  }, [getAll, deleteAll, syncRefresh, forceSync]);

  const uniqueForms = useMemo(() => {
    return deduplicateForms(storedForms);
  }, [storedForms]);

  const refresh = useCallback(async () => {
    const online = await checkNetworkConnection();
    setIsOffline(!online);
    
    if (online) {
      try {
        const remoteResult = await fetchFormByProjectFromRemote();
        
        // SECURITY CHECK on refresh
        if (remoteResult.forms.length === 0 && 
            remoteResult.statusCode && 
            remoteResult.statusCode >= 200 && 
            remoteResult.statusCode < 300) {
          console.warn('[SECURITY] Remote returned 0 forms with successful status. Clearing local database.');
          await deleteAll("Surveys");
          setStoredForms([]);
          setDataSource("remote");
          console.log('✅ Local forms database cleared for security on refresh');
          return;
        }
        
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
  }, [getAll, deleteAll, syncRefresh]);

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
            fetchFn: () => fetchFormByProjectFromRemote(),
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
  formId: string,
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
          if (f.id !== formId.toString()) return false;

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
      if (f.id !== formId.toString()) return false;
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



