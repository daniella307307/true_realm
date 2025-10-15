import { useEffect, useState, useMemo, useCallback } from "react";
import { I2BaseFormat, IExistingForm, IProject } from "~/types";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { useSQLite } from "~/providers/RealContextProvider";
import { checkNetworkConnection } from "~/utils/networkHelpers";

// ============ FETCH FUNCTION ============
export async function fetchProjectsFromRemote(): Promise<IProject[]> {
  try {
    const res = await baseInstance.get<I2BaseFormat<IProject[]>>("/v2/projects");
  
    let data = res.data?.data;
    
    if (data && typeof data === 'object' && 'data' in data && !Array.isArray(data)) {
      data = (data as any).data;
    }
    
    if (!data) {
      console.warn('[fetchProjectsFromRemote] No data returned from API');
      return [];
    }
    if (Array.isArray(data)) {
      console.log(`[fetchProjectsFromRemote] Successfully fetched ${data.length} projects`);
      return data;
    }
    
    console.error('[fetchProjectsFromRemote] Unexpected data format:', typeof data, data);
    return [];
  } catch (error) {
    console.error('[fetchProjectsFromRemote] Error:', error);
    return [];
  }
}

// ============ USE GET ALL PROJECTS ============
export function useGetAllProjects(forceSync: boolean = false) {
  const { getAll } = useSQLite();
  const [projects, setProjects] = useState<IProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [dataSource, setDataSource] = useState<"local" | "remote" | "pending">("pending");
  const [error, setError] = useState<Error | null>(null);

  const { syncStatus, refresh: syncRefresh } = useDataSync<IProject>([
    {
      key: "projects",
      fetchFn: async () => {
        const data = await fetchProjectsFromRemote();
        console.log(`[useDataSync] projects fetched: ${data?.length || 0} records`);
        return data;
      },
      tableName: "Projects",
      staleTime: 5 * 60 * 1000,
      forceSync,
    },
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check network connectivity
        const online = await checkNetworkConnection();
        setIsOffline(!online);

        if (online) {
          console.log("🌐 Online — syncing projects from remote...");

          // Trigger sync (this will update SQLite)
          await syncRefresh("projects", forceSync);

          // Wait for sync to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log("📴 Offline — loading projects from local SQLite...");
        }

        // Always load from SQLite (single source of truth)
        const rows = await getAll<IProject>("Projects");

        if (isMounted) {
          setProjects(rows);
          setDataSource(online ? "remote" : "local");
          console.log(`✅ Loaded ${rows.length} projects from ${online ? 'remote (via SQLite)' : 'local SQLite'}`);
        }
      } catch (err) {
        console.error("Error loading projects:", err);

        // Fallback to local data on error
        try {
          const rows = await getAll<IProject>("Projects");
          if (isMounted) {
            setProjects(rows);
            setDataSource("local");
            setError(err as Error);
            console.log("⚠️ Error occurred, using local data:", rows.length);
          }
        } catch (localErr) {
          console.error("Failed to load from local SQLite:", localErr);
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

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [getAll, syncRefresh, forceSync]);

  // Deduplicate projects by ID
  const uniqueProjects = useMemo(() => {
    const seen = new Set<number>();
    return projects.filter((project) => {
      if (seen.has(project.id)) {
        console.warn(`⚠️ Duplicate project ID found: ${project.id}`);
        return false;
      }
      seen.add(project.id);
      return true;
    });
  }, [projects]);

  const refresh = useCallback(async () => {
    const online = await checkNetworkConnection();
    if (online) {
      await syncRefresh("projects", true);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    const rows = await getAll<IProject>("Projects");
    setProjects(rows);
    setDataSource(online ? "remote" : "local");
  }, [getAll, syncRefresh]);

  return {
    projects: uniqueProjects,
    isLoading: isLoading || syncStatus.projects?.isLoading || false,
    error: error || syncStatus.projects?.error || null,
    lastSyncTime: syncStatus.projects?.lastSyncTime || null,
    isOffline,
    dataSource,
    refresh,
  };
}

// -------------------- FETCH HELPERS --------------------

export async function fetchFormByProjectFromRemote(projectId: number): Promise<IExistingForm[]> {
  try {
    const res = await baseInstance.get(`/v2/projects/${projectId}/surveys`);
    let data = res.data?.data;

    // Handle nested data.data cases
    if (data && typeof data === "object" && "data" in data && !Array.isArray(data)) {
      data = (data as any).data;
    }

    if (!data) {
      console.warn(`[fetchFormByProjectFromRemote] No data returned for project ${projectId}`);
      return [];
    }

    if (Array.isArray(data)) {
      console.log(`[fetchFormByProjectFromRemote] ✅ ${data.length} forms fetched for project ${projectId}`);
      return dedupeById(data);
    }

    console.error(`[fetchFormByProjectFromRemote] Unexpected format for project ${projectId}:`, data);
    return [];
  } catch (error) {
    console.error(`[fetchFormByProjectFromRemote] Error for project ${projectId}:`, error);
    return [];
  }
}

// -------------------- UTILITIES --------------------

function dedupeById(forms: IExistingForm[]): IExistingForm[] {
  const seen = new Map<number, IExistingForm>();
  for (const form of forms) {
    if (!seen.has(form.id)) {
      seen.set(form.id, form);
    }
  }
  return Array.from(seen.values());
}

async function loadFormsFromSQLite(getAll: any): Promise<IExistingForm[]> {
  const forms = await getAll("Surveys");
  return dedupeById(forms);
}

// -------------------- useGetFormsByProject --------------------

// ============ USE GET PROJECT BY ID ============
export function useGetProjectById(id: number, forceSync: boolean = false) {
  const { projects, isLoading, error, lastSyncTime, isOffline, dataSource, refresh } =
    useGetAllProjects(forceSync);

  const project = useMemo(() => {
    return projects.find((p) => p.id === id);
  }, [projects, id]);

  return {
    project,
    isLoading,
    error,
    lastSyncTime,
    isOffline,
    dataSource,
    refresh,
  };
}
export function useGetFormsByProject(projectId?: number, forceSync: boolean = false) {
  const { getAll, upsertMany } = useSQLite();
  const [forms, setForms] = useState<IExistingForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [dataSource, setDataSource] = useState<"local" | "remote" | "pending">("pending");
  const [error, setError] = useState<Error | null>(null);

  const { syncStatus, refresh: syncRefresh } = useDataSync<IExistingForm>(
    projectId
      ? [
          {
            key: `forms-${projectId}`,
            fetchFn: async () => {
              const remote = await fetchFormByProjectFromRemote(projectId);
              await upsertMany("Surveys", remote, "id");
              return remote;
            },
            tableName: "Surveys",
            staleTime: 5 * 60 * 1000,
            forceSync,
          },
        ]
      : []
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const online = await checkNetworkConnection();
        setIsOffline(!online);

        if (online && projectId) {
          await syncRefresh(`forms-${projectId}`, forceSync);
        }

        const allForms = await loadFormsFromSQLite(getAll);
        const filtered = projectId
          ? allForms.filter((f) => f.project_id === projectId)
          : allForms;

        if (mounted) {
          setForms(filtered);
          setDataSource(online ? "remote" : "local");
          console.log(`✅ Loaded ${filtered.length} forms for project ${projectId ?? "ALL"}`);
        }
      } catch (err) {
        console.error("Error loading forms:", err);
        setError(err as Error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [projectId, getAll, syncRefresh, forceSync]);

  const refresh = useCallback(async () => {
    const online = await checkNetworkConnection();
    if (online && projectId) await syncRefresh(`forms-${projectId}`, true);
    const allForms = await loadFormsFromSQLite(getAll);
    const filtered = projectId ? allForms.filter((f) => f.project_id === projectId) : allForms;
    setForms(filtered);
    setDataSource(online ? "remote" : "local");
  }, [projectId, getAll, syncRefresh]);

  return {
    forms,
    isLoading: isLoading || syncStatus[`forms-${projectId}`]?.isLoading || false,
    error: error || syncStatus[`forms-${projectId}`]?.error || null,
    isOffline,
    dataSource,
    lastSyncTime: syncStatus[`forms-${projectId}`]?.lastSyncTime || null,
    refresh,
  };
}
