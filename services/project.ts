import { useMemo } from "react";
import { I2BaseFormat, I3BaseFormat, IModule, IProject } from "~/types";
import { Project } from "~/models/projects/project";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useDataSync } from "./dataSync";

const { useRealm, useQuery } = RealmContext;

interface IProjectResponse {
  projects: IProject[];
}

export async function fetchProjectsFromRemote() {
  const res = await baseInstance.get<I2BaseFormat<IProject[]>>("/v2/projects");
  return res.data;
}

// Hook for getting all projects with offline support
export function useGetAllProjects(forceSync: boolean = false) {
  const realm = useRealm();
  const storedProjects = useQuery(Project);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "projects",
      fetchFn: fetchProjectsFromRemote,
      model: Project,
      transformData: (data: I2BaseFormat<IProject>) =>
        data.data.data.map((proj) => ({
          ...proj,
          project_modules: proj.project_modules.map((module) =>
            JSON.stringify(module)
          ),
        })),
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

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
 * @param projectId The ID of the project to retrieve
 */
export function useGetProjectById(id: number, forceSync: boolean = false) {
  const { projects, isLoading, error, lastSyncTime, refresh } = useGetAllProjects(forceSync);

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
 * Hook for getting all modules with offline support
 * Since modules are embedded within projects, we only need to extract them from the local storage
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
    return projects.flatMap((project) => {
      return project.project_modules
        .map((moduleString) => {
          try {
            return JSON.parse(moduleString) as IModule;
          } catch (parseError) {
            console.error("Error parsing module:", parseError);
            return null;
          }
        })
        .filter(Boolean); // Remove any null values from failed parses
    });
  }, [projects]);

  return {
    modules,
    isLoading: projectsLoading,
    error: projectsError,
    lastSyncTime,
    refresh: refreshProjects, // To refresh modules, we refresh projects
  };
}

/**
 * Hook for getting modules for a specific project
 * @param projectId The ID of the project to get modules for
 */
export function useGetModulesByProjectId(projectId: number) {
  const { project, isLoading, error, lastSyncTime, refresh } =
    useGetProjectById(projectId);

  // Parse and extract modules from the specific project
  const modules = useMemo(() => {
    if (!project) return [];

    return project.project_modules
      .map((moduleString) => {
        try {
          return JSON.parse(moduleString) as IModule;
        } catch (parseError) {
          console.error("Error parsing module:", parseError);
          return null;
        }
      })
      .filter(Boolean);
  }, [project]);

  return {
    modules,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}
