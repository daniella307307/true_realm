import { useEffect, useState, useCallback } from "react";
import { Module } from "~/models/modules/module";
import { Project } from "~/models/projects/project";
import { I2BaseFormat, I3BaseFormat, IModule, IProject } from "~/types";
import { baseInstance } from "~/utils/axios";
import { useNetworkStatus } from "./network";
import { RealmContext } from "~/providers/RealContextProvider";
const { useRealm, useQuery } = RealmContext;

// Remote data fetching functions
export async function fetchActiveProjectsFromRemote() {
  const res = await baseInstance.get<I2BaseFormat<IProject>>("/v2/projects");
  return res.data;
}

export async function fetchActiveModulesFromRemote() {
  const res = await baseInstance.get<I3BaseFormat<IModule>>(
    "/v2/projects/modules"
  );
  return res.data;
}

export async function fetchProjectByIdFromRemote(id: string) {
  const res = await baseInstance.get<IProject>(`/v2/projects/${id}`);
  return res.data;
}

// Hook for getting all projects with offline support
export function useGetAllProjects() {
  const realm = useRealm();
  const storedProjects = useQuery(Project);
  const { isConnected } = useNetworkStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncProjects = useCallback(async () => {
    if (!isConnected) {
      console.log("Offline mode: Using local projects data");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching projects from remote");
      const apiProjects = await fetchActiveProjectsFromRemote();

      if (!realm || realm.isClosed) {
        console.warn("Skipping Realm write: Realm is closed");
        setError(new Error("Realm is closed"));
        return;
      }

      realm.write(() => {
        apiProjects.data.data.forEach((proj) => {
          try {
            // Make a copy of the project to avoid modifying the original
            const projCopy = { ...proj };
            projCopy.project_modules = proj.project_modules.map((module) =>
              JSON.stringify(module)
            );
            realm.create("Project", projCopy, Realm.UpdateMode.Modified);
          } catch (error) {
            console.error("Error creating/updating project:", error);
          }
        });
      });

      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, realm]);

  // Initial load and when network state changes
  useEffect(() => {
    if (isConnected) {
      syncProjects();
    }
  }, [isConnected, syncProjects]);

  return {
    projects: storedProjects,
    isLoading,
    error,
    lastSyncTime,
    refresh: syncProjects
  };
}

// Hook for getting all modules with offline support
export function useGetAllModules() {
  const storedProjects = useQuery(Project);
  const { isConnected } = useNetworkStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const getModulesFromProjects = useCallback(() => {
    try {
      // Parse and flatten all modules from all projects
      const allModules = storedProjects.flatMap((project) => {
        return project.project_modules.map((moduleString) => {
          try {
            return JSON.parse(moduleString);
          } catch (parseError) {
            console.error("Error parsing module:", parseError);
            return null;
          }
        }).filter(Boolean); // Remove any null values from failed parses
      });

      return allModules;
    } catch (error) {
      console.error("Error getting modules from projects:", error);
      return [];
    }
  }, [storedProjects]);

  const syncModules = useCallback(async () => { 
    if (!isConnected) {
      console.log("Offline mode: Using local modules data");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For online mode, we can potentially sync with remote here
      // For now, we'll just update the last sync time
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error syncing modules:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      syncModules();
    }
  }, [isConnected, syncModules]);

  // Always return modules from Realm, regardless of connection status
  const modules = getModulesFromProjects();

  return {
    modules,
    isLoading,
    error,
    lastSyncTime,
    refresh: syncModules
  };
}

// Hook for getting project by ID with offline support
export function useGetProjectById(id: string) {
  const realm = useRealm();
  const { isConnected } = useNetworkStatus();
  const [project, setProject] = useState<IProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProject() {
      setIsLoading(true);
      setError(null);

      try {
        // First check if we have the project in Realm
        const localProject = realm.objectForPrimaryKey<Project>("Project", id);

        if (localProject) {
          // We have local data
          setProject(localProject as unknown as IProject);
          
          // If we're online, still fetch fresh data in the background
          if (isConnected) {
            try {
              const remoteProject = await fetchProjectByIdFromRemote(id);
              
              if (!realm || realm.isClosed) {
                console.warn("Skipping Realm write: Realm is closed");
              } else {
                realm.write(() => {
                  try {
                    const projCopy = { ...remoteProject };
                    projCopy.project_modules = remoteProject.project_modules.map((module) =>
                      JSON.stringify(module)
                    );
                    realm.create("Project", projCopy, Realm.UpdateMode.Modified);
                    // Update the state with the fresh data
                    setProject(remoteProject);
                  } catch (error) {
                    console.error("Error updating project:", error);
                  }
                });
              }
            } catch (remoteError) {
              // If remote fetch fails, we still have local data so just log the error
              console.error("Error fetching remote project:", remoteError);
            }
          }
        } else if (isConnected) {
          // No local data and we're online, so fetch from remote
          const remoteProject = await fetchProjectByIdFromRemote(id);
          
          if (!realm || realm.isClosed) {
            console.warn("Skipping Realm write: Realm is closed");
            setProject(remoteProject);
          } else {
            realm.write(() => {
              try {
                const projCopy = { ...remoteProject };
                projCopy.project_modules = remoteProject.project_modules.map((module) =>
                  JSON.stringify(module)
                );
                realm.create("Project", projCopy, Realm.UpdateMode.Modified);
                setProject(remoteProject);
              } catch (error) {
                console.error("Error creating project:", error);
                setProject(remoteProject);
              }
            });
          }
        } else {
          // No local data and offline
          setError(new Error("Project not found locally and device is offline"));
        }
      } catch (error) {
        console.error("Error in useGetProjectById:", error);
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProject();
  }, [id, isConnected, realm]);

  const refresh = useCallback(async () => {
    if (!isConnected) {
      return;
    }
    
    setIsLoading(true);
    try {
      const remoteProject = await fetchProjectByIdFromRemote(id);
      
      if (!realm || realm.isClosed) {
        setProject(remoteProject);
        return;
      }
      
      realm.write(() => {
        try {
          const projCopy = { ...remoteProject };
          projCopy.project_modules = remoteProject.project_modules.map((module) =>
            JSON.stringify(module)
          );
          realm.create("Project", projCopy, Realm.UpdateMode.Modified);
          setProject(remoteProject);
        } catch (error) {
          console.error("Error refreshing project:", error);
        }
      });
    } catch (error) {
      console.error("Error refreshing project:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [id, isConnected, realm]);

  return { project, isLoading, error, refresh };
}