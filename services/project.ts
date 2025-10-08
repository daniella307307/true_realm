import { useEffect, useMemo, useState } from "react";
import { I2BaseFormat, I3BaseFormat, IModule, IProject } from "~/types";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";
import { useSQLite } from "~/providers/RealContextProvider";

interface IProjectResponse {
  projects: IProject[];
}

export async function fetchProjectsFromRemote() {
  const res = await baseInstance.get<I2BaseFormat<IProject[]>>("/v2/projects");
  return res.data;
}

// Hook for getting all projects with offline support
export function useGetAllProjects(forceSync: boolean = false) {
  const { getAll } = useSQLite();
  const [storedProjects, setStoredProjects] = useState<IProject[]>([]);

  const { syncStatus, refresh } = useDataSync<IProject>([
    {
      key: "projects",
      fetchFn: fetchProjectsFromRemote,
      tableName: "Projects", // ✅ match actual SQLite table name
      transformData: (data: I2BaseFormat<IProject>) =>
        data.data.data.map((proj) => ({
          ...proj,
          project_modules: proj.project_modules.map((m) =>
            JSON.stringify(m)
          ),
        })),
      staleTime: 5 * 60 * 1000,
      forceSync,
    },
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await getAll<IProject>("Projects"); // ✅ must match
        setStoredProjects(rows);
      } catch (err) {
        console.error("Failed to load projects from SQLite:", err);
      }
    };
    load();
  }, [syncStatus.projects?.lastSyncTime, getAll]);

  return {
    projects: storedProjects,
    isLoading: syncStatus.projects?.isLoading || false,
    error: syncStatus.projects?.error || null,
    lastSyncTime: syncStatus.projects?.lastSyncTime || null,
    refresh: () => refresh("projects", forceSync),
  };
}


/**
 * Hook for getting a specific project by ID
 */
export function useGetProjectById(id: number, forceSync: boolean = false) {
  const { projects, isLoading, error, lastSyncTime, refresh } =
    useGetAllProjects(forceSync);

  const project = useMemo(() => {
    return projects.find((project) => project.id === id);
  }, [projects, id]);

  return {
    project,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}

/**
 * Hook for getting all modules
 */
export function useGetAllModules() {
  const {
    projects,
    isLoading: projectsLoading,
    error: projectsError,
    lastSyncTime,
    refresh: refreshProjects,
  } = useGetAllProjects();

  const modules = useMemo(() => {
    return projects.flatMap((project) =>
      project.project_modules
        .map((moduleString) => {
          try {
            return JSON.parse(moduleString) as IModule;
          } catch (e) {
            console.error("Error parsing module:", e);
            return null;
          }
        })
        .filter(Boolean) as IModule[]
    );
  }, [projects]);

  return {
    modules,
    isLoading: projectsLoading,
    error: projectsError,
    lastSyncTime,
    refresh: refreshProjects,
  };
}

/**
 * Hook for getting modules for a specific project
 */
export function useGetModulesByProjectId(projectId: number) {
  const { project, isLoading, error, lastSyncTime, refresh } =
    useGetProjectById(projectId);

  const modules = useMemo(() => {
    if (!project) return [];

    return project.project_modules
      .map((moduleString) => {
        try {
          return JSON.parse(moduleString) as IModule;
        } catch (e) {
          console.error("Error parsing module:", e);
          return null;
        }
      })
      .filter(Boolean) as IModule[];
  }, [project]);

  return {
    modules,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}