import { useEffect, useCallback, useState, useRef } from "react";
import { useSQLite } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { I4BaseFormat, IExistingForm } from "~/types";
import { isOnline } from "./network";

interface IFetchFormsResponse {
  data: IExistingForm[];
}

export interface IForm {
  _id: string;                 // Primary key (Realm.ObjectId → TEXT)
  id: number;                  // Form ID
  parent_id?: number | null;   // Optional parent form ID
  name: string;                // Form name
  name_kin?: string | null;    // Localized name
  slug?: string | null;        // Optional slug
  json2: string;               // JSON data as string
  json2_bkp?: string | null;   // Optional backup JSON string
  survey_status: number;       // Status of survey
  module_id?: number | null;   // Optional module ID
  is_primary: number;          // Boolean as 0/1
  table_name?: string | null;  // Optional table name
  post_data?: string | null;   // Optional post data
  fetch_data?: string | null;  // Optional fetch data
  loads?: string | null;       // Optional loads info
  prev_id?: string | null;     // Optional previous form ID
  created_at?: string | null;  // ISO string date
  updated_at?: string | null;  // ISO string date
  order_list: number;          // Sorting order
  project_module_id: number;   // Project module ID
  project_id?: number | null;  // Project ID
  source_module_id?: number | null; // Original module ID
}

// ---------------- FETCH FROM API ----------------
export async function fetchFormsFromRemote(): Promise<IExistingForm[]> {
  const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(`/v2/surveys`);
  return res.data.data;
}

export async function fetchFormByProjectAndModuleFromRemote(
  projectId: number,
  moduleId: number
): Promise<IExistingForm[]> {
  const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(
    `/v2/projects/${projectId}/module/${moduleId}/surveys`
  );
  return res.data.data;
}

// ---------------- USE GET FORMS ----------------
export function useGetForms(forceSync: boolean = false) {
  const { getAll, batchCreate } = useSQLite();
  const [storedForms, setStoredForms] = useState<IExistingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if initial load is done to prevent unnecessary re-renders
  const initialLoadDone = useRef(false);
  const forceSyncRef = useRef(forceSync);

  // Update ref when forceSync changes
  useEffect(() => {
    forceSyncRef.current = forceSync;
  }, [forceSync]);

  // FIXED: Memoized loadForms to prevent infinite loops
  const loadForms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let localForms: IExistingForm[] = await getAll<IExistingForm>("Surveys");

      if ((forceSyncRef.current || localForms.length === 0) && isOnline()) {
        const remoteForms = await fetchFormsFromRemote();
        await batchCreate("Surveys", remoteForms);
        localForms = remoteForms;
      }

      setStoredForms(localForms);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading forms:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [getAll, batchCreate]);

  // FIXED: Proper refresh function
  const refresh = useCallback(async () => {
    if (isOnline()) {
      try {
        setIsLoading(true);
        setError(null);
        const remoteForms = await fetchFormsFromRemote();
        await batchCreate("Surveys", remoteForms);
        setStoredForms(remoteForms);
        setIsLoading(false);
      } catch (err) {
        console.error("Error refreshing forms:", err);
        setError(err as Error);
        setIsLoading(false);
      }
    } else {
      console.log("Offline: cannot refresh forms right now");
    }
  }, [batchCreate]);

  // FIXED: Load once on mount or when forceSync changes
  useEffect(() => {
    if (!initialLoadDone.current || forceSync) {
      loadForms();
      initialLoadDone.current = true;
    }
  }, [forceSync, loadForms]);

  // Periodic background syncing
  // FIXED: Removed async IIFE anti-pattern
  useDataSync([
    {
      key: "forms",
      fetchFn: fetchFormsFromRemote,
      tableName: "Surveys",
      transformData: (data: IExistingForm[]) => {
        // Schedule state update properly
        Promise.resolve().then(async () => {
          try {
            await batchCreate("Surveys", data);
            setStoredForms(data);
          } catch (err) {
            console.error("Error in background sync:", err);
          }
        });
        return data;
      },
      staleTime: 5 * 60 * 1000,
    },
  ]);

  return { forms: storedForms, isLoading, error, refresh };
}

// ---------------- USE GET FORM BY PROJECT & MODULE ----------------
export function useGetFormByProjectAndModule(
  projectId: number,
  moduleId: number,
  projectModuleId: number
) {
  const { getAll, batchCreate, getByQuery } = useSQLite();
  const [storedForms, setStoredForms] = useState<IExistingForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<IForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const initialLoadDone = useRef(false);

  // FIXED: Memoized load function with proper dependencies
  const loadForms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get filtered monitoring forms
      const rows = await getByQuery<IForm>(
        "MonitoringForms",
        "project_id = ? AND source_module_id = ? AND project_module_id = ?",
        [projectId, moduleId, projectModuleId]
      );
      setFilteredForms(rows);

      // Get all forms
      let allForms: IExistingForm[] = await getAll<IExistingForm>("Surveys");

      // Fetch from remote if online
      if (isOnline()) {
        const remoteForms = await fetchFormByProjectAndModuleFromRemote(
          projectId,
          moduleId
        );
        await batchCreate("Surveys", remoteForms);
        allForms = remoteForms;
      }

      // Filter forms based on criteria
      const filtered = allForms.filter(
        (f) =>
          f.project_id === projectId &&
          f.source_module_id === moduleId &&
          f.project_module_id === projectModuleId
      );

      setStoredForms(filtered);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading forms:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [projectId, moduleId, projectModuleId, getAll, getByQuery, batchCreate]);

  // FIXED: Only run on mount or when dependencies change
  useEffect(() => {
    if (!initialLoadDone.current) {
      loadForms();
      initialLoadDone.current = true;
    }
  }, [loadForms]);

  // Refresh function
  const refresh = useCallback(async () => {
    await loadForms();
  }, [loadForms]);

  // FIXED: Proper transformData without async IIFE
  useDataSync([
    {
      key: `forms-${projectId}-${moduleId}-${projectModuleId}`,
      fetchFn: () => fetchFormByProjectAndModuleFromRemote(projectId, moduleId),
      tableName: "Surveys",
      transformData: (data: IExistingForm[]) => {
        // Schedule state update properly
        Promise.resolve().then(async () => {
          try {
            await batchCreate("Surveys", data);
            const filtered = data.filter(
              (f) =>
                f.project_id === projectId &&
                f.source_module_id === moduleId &&
                f.project_module_id === projectModuleId
            );
            setStoredForms(filtered);
          } catch (err) {
            console.error("Error in background sync:", err);
          }
        });
        return data;
      },
      staleTime: 5 * 60 * 1000,
    },
  ]);

  return { 
    filteredForms: storedForms, 
    monitoringForms: filteredForms,
    isLoading, 
    error,
    refresh 
  };
}

// ---------------- USE GET FORM BY ID ----------------
export function useGetFormById(
  formId: number,
  projectModuleId: number,
  sourceModuleId: number,
  projectId: number
) {
  const { getAll } = useSQLite();
  const [form, setForm] = useState<IExistingForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const initialLoadDone = useRef(false);

  // FIXED: Memoized load function
  const loadForm = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allForms = await getAll<IExistingForm>("Surveys");
      const found = allForms.find(
        (f) =>
          f.id === formId &&
          f.project_module_id === projectModuleId &&
          f.source_module_id === sourceModuleId &&
          f.project_id === projectId
      );
      
      setForm(found || null);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading form:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [formId, projectModuleId, sourceModuleId, projectId, getAll]);

  // FIXED: Only run on mount or when dependencies change
  useEffect(() => {
    if (!initialLoadDone.current) {
      loadForm();
      initialLoadDone.current = true;
    }
  }, [loadForm]);

  // Refresh function
  const refresh = useCallback(async () => {
    await loadForm();
  }, [loadForm]);

  return { form, isLoading, error, refresh };
}

// ---------------- ALTERNATIVE: Combined Forms Hook ----------------
// Use this if you need multiple forms functionalities in one component
export function useForms() {
  const { getAll, batchCreate, getByQuery } = useSQLite();

  // Get all forms
  const getAllForms = useCallback(async (): Promise<IExistingForm[]> => {
    try {
      let localForms: IExistingForm[] = await getAll<IExistingForm>("Survey");

      if (localForms.length === 0 && isOnline()) {
        const remoteForms = await fetchFormsFromRemote();
        await batchCreate("Surveys", remoteForms);
        return remoteForms;
      }

      return localForms;
    } catch (err) {
      console.error("Error getting all forms:", err);
      return [];
    }
  }, [getAll, batchCreate]);

  // Get forms by project and module
  const getFormsByProjectAndModule = useCallback(
    async (
      projectId: number,
      moduleId: number,
      projectModuleId: number
    ): Promise<IExistingForm[]> => {
      try {
        let allForms: IExistingForm[] = await getAll<IExistingForm>("Surveys");

        if (isOnline()) {
          const remoteForms = await fetchFormByProjectAndModuleFromRemote(
            projectId,
            moduleId
          );
          await batchCreate("Surveys", remoteForms);
          allForms = remoteForms;
        }

        return allForms.filter(
          (f) =>
            f.project_id === projectId &&
            f.source_module_id === moduleId &&
            f.project_module_id === projectModuleId
        );
      } catch (err) {
        console.error("Error getting forms by project and module:", err);
        return [];
      }
    },
    [getAll, batchCreate]
  );

  // Get form by ID
  const getFormById = useCallback(
    async (
      formId: number,
      projectModuleId: number,
      sourceModuleId: number,
      projectId: number
    ): Promise<IExistingForm | null> => {
      try {
        const allForms = await getAll<IExistingForm>("Surveys");
        return (
          allForms.find(
            (f) =>
              f.id === formId &&
              f.project_module_id === projectModuleId &&
              f.source_module_id === sourceModuleId &&
              f.project_id === projectId
          ) || null
        );
      } catch (err) {
        console.error("Error getting form by ID:", err);
        return null;
      }
    },
    [getAll]
  );

  return {
    getAllForms,
    getFormsByProjectAndModule,
    getFormById,
  };
}