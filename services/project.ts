import { useEffect, useState, useMemo, useCallback } from "react";
import { I2BaseFormat, IExistingForm } from "~/types";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { useSQLite } from "~/providers/RealContextProvider";
import { checkNetworkConnection } from "~/utils/networkHelpers";
import { isOnline } from "./network";
import Toast from "react-native-toast-message";
import { t } from "i18next";

// ============ TYPE DEFINITIONS ============
export interface IFormResponse {
  translations: string;
  _id: string;
  title: string;
  description: string;
  formDefinition: {
    components: any[];
  };
  status: string;
  organization: string;
  creator: string;
  department: string;
  version: number;
  versionHistory: string[];
  currentVersion: string;
  lastUpdatedBy: string;
  settings: {
    allowOffline: boolean;
    requireAuthentication: boolean;
    allowMultipleSubmissions: boolean;
  };
  metadata: {
    tags: string[];
    category: string;
    country: string;
    estimatedTime: number;
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      label: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IFormsApiResponse {
  success: boolean;
  forms: IFormResponse[];
  pagination: {
    current: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FetchFormsResult {
  forms: IExistingForm[];
  statusCode?: number;
}

// ============ FETCH FUNCTION ============
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
    console.log('[fetchFormsFromRemote] Response data:', JSON.stringify(res.data).substring(0, 500));
    
    const data = res.data;
    
    if (!data) {
      console.warn('[fetchFormsFromRemote] No data in response');
      return { forms: [], statusCode: res.status };
    }

    let formsArray: IFormResponse[] = [];

    // Check different response structures
    if (data.success && Array.isArray(data.forms)) {
      console.log('[fetchFormsFromRemote] Found forms in data.forms');
      formsArray = data.forms;
    }
    else if ('data' in data) {
      const nestedData = (data as any).data;
      if (Array.isArray(nestedData)) {
        console.log('[fetchFormsFromRemote] Found forms in data.data (array)');
        formsArray = nestedData;
      } else if (nestedData && typeof nestedData === 'object' && 'data' in nestedData) {
        console.log('[fetchFormsFromRemote] Found forms in data.data.data');
        formsArray = (nestedData as any).data;
      }
    }
    else if (Array.isArray(data)) {
      console.log('[fetchFormsFromRemote] Response is direct array');
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
      translations:form?.translations || '',
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


async function loadFormsFromSQLite(getAll: any): Promise<IExistingForm[]> {
  try {
    console.log('[loadFormsFromSQLite] Loading from Surveys table...');
    const forms = await getAll("Surveys");
    console.log(`[loadFormsFromSQLite] Loaded ${forms?.length || 0} forms from SQLite`);
    return deduplicateForms(forms || []);
  } catch (error) {
    console.error('[loadFormsFromSQLite] Error:', error);
    return [];
  }
}

// ============ USE GET ALL FORMS ============
export function useGetAllForms(forceSync: boolean = false) {
  const { getAll, deleteAll } = useSQLite();
  const [storedForms, setStoredForms] = useState<IExistingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [dataSource, setDataSource] = useState<"local" | "remote" | "pending">("pending");
  const [error, setError] = useState<Error | null>(null);

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

        if (online && isMounted) {
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
                console.log('✅ Local forms database cleared for security');
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

// ============ USE GET FORM BY ID ============
export function useGetFormById(id: string, forceSync: boolean = false) {
  const { forms, isLoading, error, lastSyncTime, isOffline, dataSource, refresh } =
    useGetAllForms(forceSync);

  const form = useMemo(() => {
    return forms.find((f) => String(f.id) === String(id));
  }, [forms, id]);

  return {
    form,
    isLoading,
    error,
    lastSyncTime,
    isOffline,
    dataSource,
    refresh,
  };
}

// ============ USE GET FORMS BY FILTER ============
export function useGetFormsByFilter(
  filter?: {
    status?: string;
    category?: string;
    country?: string;
    department?: string;
    organization?: string;
  },
  forceSync: boolean = false
) {
  const { forms, isLoading, error, lastSyncTime, isOffline, dataSource, refresh } =
    useGetAllForms(forceSync);

  const filteredForms = useMemo(() => {
    if (!filter) return forms;

    return forms.filter((form) => {
      if (filter.status && form.status !== filter.status) return false;
      if (filter.category && form.metadata?.category !== filter.category) return false;
      if (filter.country && form.metadata?.country !== filter.country) return false;
      if (filter.department && form.department !== filter.department) return false;
      if (filter.organization && form.organization !== filter.organization) return false;
      return true;
    });
  }, [forms, filter]);

  return {
    forms: filteredForms,
    isLoading,
    error,
    lastSyncTime,
    isOffline,
    dataSource,
    refresh,
  };
}
