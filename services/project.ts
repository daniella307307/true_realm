import { useEffect, useState, useMemo, useCallback } from "react";
import { I2BaseFormat, IExistingForm } from "~/types";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { useSQLite } from "~/providers/RealContextProvider";
import { checkNetworkConnection } from "~/utils/networkHelpers";
import { isOnline } from "./network";

// ============ TYPE DEFINITIONS ============
interface IFormResponse {
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

interface IFormsApiResponse {
  success: boolean;
  forms: IFormResponse[];
  pagination: {
    current: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============ FETCH FUNCTION ============
export async function fetchFormsFromRemote(): Promise<IExistingForm[]> {
  try {
    console.log('[fetchFormsFromRemote] Starting fetch...');
    console.log('[fetchFormsFromRemote] BaseURL:', baseInstance.defaults.baseURL);
    
    // Try multiple endpoint variations
    const endpoints = ["/forms"];
    let res: any = null;
    let successEndpoint = "";
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[fetchFormsFromRemote] Trying endpoint: ${endpoint}`);
        res = await baseInstance.get<IFormsApiResponse>(endpoint);
        successEndpoint = endpoint;
        console.log(`[fetchFormsFromRemote]  Success with endpoint: ${endpoint}`);
        break;
      } catch (err: any) {
        console.log(`[fetchFormsFromRemote] Failed with ${endpoint}: ${err.response?.status || err.message}`);
        continue;
      }
    }
    
    if (!res) {
      console.error('[fetchFormsFromRemote] All endpoints failed');
      return [];
    }
    
    console.log('[fetchFormsFromRemote] Response status:', res.status);
    console.log('[fetchFormsFromRemote] Response headers:', res.headers);
    console.log('[fetchFormsFromRemote] Response data type:', typeof res.data);
    console.log('[fetchFormsFromRemote] Response data:', JSON.stringify(res.data).substring(0, 500));
    
    const data = res.data;
    
    // Check if response has the expected structure
    if (!data) {
      console.warn('[fetchFormsFromRemote] No data in response');
      return [];
    }

    // Handle different response formats
    let formsArray: IFormResponse[] = [];

    // Format 1: { success: true, forms: [...] }
    if (data.success && Array.isArray(data.forms)) {
      console.log('[fetchFormsFromRemote] Found forms in data.forms');
      formsArray = data.forms;
    }
    // Format 2: { data: [...] } or { data: { data: [...] } }
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
    // Format 3: Direct array
    else if (Array.isArray(data)) {
      console.log('[fetchFormsFromRemote] Response is direct array');
      formsArray = data as any;
    }

    if (!Array.isArray(formsArray) || formsArray.length === 0) {
      console.warn('[fetchFormsFromRemote] No forms array found in response');
      return [];
    }
    
    // Map API response to IExistingForm format
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
    
    console.log(`[fetchFormsFromRemote]  Successfully mapped ${forms.length} forms`);
    return forms;
  } catch (error: any) {
    console.error('[fetchFormsFromRemote] Error:', error);
    
    // Log more details about the error
    if (error.response) {
      console.error('[fetchFormsFromRemote] Error status:', error.response.status);
      console.error('[fetchFormsFromRemote] Error data:', typeof error.response.data === 'string' 
        ? error.response.data.substring(0, 200) 
        : JSON.stringify(error.response.data).substring(0, 200));
    } else if (error.request) {
      console.error('[fetchFormsFromRemote] No response received');
    } else {
      console.error('[fetchFormsFromRemote] Error message:', error.message);
    }
    
    return [];
  }
}

// ============ UTILITIES ============
function dedupeById(forms: IExistingForm[]): IExistingForm[] {
  const seen = new Map<string, IExistingForm>();
  for (const form of forms) {
    const formId = String(form.id);
    if (!seen.has(formId)) {
      seen.set(formId, form);
    }
  }
  return Array.from(seen.values());
}

async function loadFormsFromSQLite(getAll: any): Promise<IExistingForm[]> {
  try {
    console.log('[loadFormsFromSQLite] Loading from Surveys table...');
    const forms = await getAll("Surveys");
    console.log(`[loadFormsFromSQLite] Loaded ${forms?.length || 0} forms from SQLite`);
    return dedupeById(forms || []);
  } catch (error) {
    console.error('[loadFormsFromSQLite] Error:', error);
    return [];
  }
}

// ============ USE GET ALL FORMS ============
export function useGetAllForms(forceSync: boolean = false) {
  const { getAll } = useSQLite();
  const [forms, setForms] = useState<IExistingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [dataSource, setDataSource] = useState<"local" | "remote" | "pending">("pending");
  const [error, setError] = useState<Error | null>(null);

  const { syncStatus, refresh: syncRefresh } = useDataSync<IExistingForm>([
    {
      key: "forms",
      fetchFn: async () => {
        const online = isOnline();
        if (!online) {
          console.log("[useDataSync] Skipping remote fetch — offline mode");
          setIsOffline(true);
          return [];
        }
        console.log("[useDataSync] Fetching forms from remote...");
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
        console.log('[useGetAllForms] Starting load...');
        setIsLoading(true);
        setError(null);

        // Check network connectivity
        const online = isOnline();
        setIsOffline(!online);
        console.log('[useGetAllForms] Network status:', online ? 'online' : 'offline');

        if (online) {
          console.log("[useGetAllForms] Online — syncing forms from remote...");

          // Trigger sync (this will update SQLite)
          await syncRefresh("forms", forceSync);

          // Wait for sync to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log("[useGetAllForms] Offline — loading forms from local SQLite...");
        }

        // Always load from SQLite (single source of truth)
        const rows = await loadFormsFromSQLite(getAll);

        if (isMounted) {
          setForms(rows);
          setDataSource(online ? "remote" : "local");
          console.log(`[useGetAllForms] ✅ Loaded ${rows.length} forms from ${online ? 'remote (via SQLite)' : 'local SQLite'}`);
        }
      } catch (err) {
        console.error("[useGetAllForms] Error loading forms:", err);

        // Fallback to local data on error
        try {
          const rows = await loadFormsFromSQLite(getAll);
          if (isMounted) {
            setForms(rows);
            setDataSource("local");
            setError(err as Error);
            console.log("[useGetAllForms] ⚠️ Error occurred, using local data:", rows.length);
          }
        } catch (localErr) {
          console.error("[useGetAllForms] Failed to load from local SQLite:", localErr);
          if (isMounted) {
            setError(localErr as Error);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadForms();

    return () => {
      isMounted = false;
    };
  }, [getAll, syncRefresh, forceSync]);

  // Deduplicate forms by ID
  const uniqueForms = useMemo(() => {
    return dedupeById(forms);
  }, [forms]);

  const refresh = useCallback(async () => {
    console.log('[useGetAllForms] Manual refresh triggered');
    const online = await checkNetworkConnection();
    if (online) {
      await syncRefresh("forms", true);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    const rows = await loadFormsFromSQLite(getAll);
    setForms(rows);
    setDataSource(online ? "remote" : "local");
  }, [getAll, syncRefresh]);

  return {
    forms: uniqueForms,
    isLoading: isLoading || syncStatus.forms?.isLoading || false,
    error: error || syncStatus.forms?.error || null,
    lastSyncTime: syncStatus.forms?.lastSyncTime || null,
    isOffline,
    dataSource,
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