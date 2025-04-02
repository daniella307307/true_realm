import { useRealm, useQuery as useRealmQuery } from "@realm/react";
import { useEffect } from "react";
import { Module } from "~/models/modules/module";
import { Project } from "~/models/projects/project";
import { I2BaseFormat, I3BaseFormat, IModule, IProject } from "~/types";
import { baseInstance } from "~/utils/axios";

export async function fetchActiveProjectsFromRemote() {
    const res = await baseInstance
        .get<I2BaseFormat<IProject>>(
            '/v2/projects');

    return res.data;
}

export function useGetAllProjects() {
    const realm = useRealm();
    const storedProjects = useRealmQuery(Project)

    useEffect(() => {
        async function fetchAndStoreProjects() {
            const apiProjects = await fetchActiveProjectsFromRemote();

            realm.write(() => {
                const existingProjectIds = storedProjects.map(proj => proj.id);
                const newProjects = apiProjects.data.data.filter((proj: IProject) => !existingProjectIds.includes(proj.id));

                if (newProjects.length > 0) {
                    newProjects.forEach(proj => {
                        // Convert project_modules to an array of stringified objects
                        proj.project_modules = proj.project_modules.map(module => JSON.stringify(module));
                        try {
                            realm.create("Project", proj, Realm.UpdateMode.Modified);
                        } catch (error) {
                            console.error("Error creating project:", error);
                        }
                    });
                }
                else {
                    storedProjects.forEach(proj => {
                        const updatedProject = apiProjects.data.data.find((apiProj: IProject) => apiProj.id === proj.id);
                        if (updatedProject) {
                            proj.updated_at = new Date().toDateString();
                            realm.create("Project", proj, Realm.UpdateMode.Modified);
                        }
                    });
                }
            });
        }
        if (storedProjects.length === 0) {
            fetchAndStoreProjects();
        }
    }, [storedProjects]);
    return storedProjects;
}

export async function fetchActiveModulesFromRemote() {
    const res = await baseInstance
        .get<I3BaseFormat<IModule>>(
            '/v2/projects/modules');

    return res.data;
}

export function useGetAllModules() {
    const realm = useRealm();
    const storedModules = useRealmQuery(Module)

    useEffect(() => {
        async function fetchAndStoreModules() {
            const apiModules = await fetchActiveModulesFromRemote();

            realm.write(() => {
                const existingModules = storedModules.map(mod => mod.id);
                const newModules = Object.entries(apiModules.data || {})
                    .flatMap(([_, moduleArray]) => moduleArray)
                    .filter(mod => !existingModules.includes(mod.id));

                if (newModules.length > 0) {
                    newModules.forEach(mod => {
                        try {
                            realm.create("Module", {
                                ...mod,
                                project: JSON.stringify(mod.project),
                            }, Realm.UpdateMode.Modified);
                        } catch (error) {
                            console.error("Error creating module:", error);
                        }
                    });
                }
                else {
                    storedModules.forEach(mod => {
                        const updatedModule = Object.entries(apiModules.data || {})
                            .flatMap(([_, moduleArray]) => moduleArray)
                            .find(apiMod => apiMod.id === mod.id);
                        if (updatedModule) {
                            mod.updated_at = new Date();
                            realm.create("Module", mod, Realm.UpdateMode.Modified);
                        }
                    });
                }
            });
        }
        if (storedModules.length === 0) {
            fetchAndStoreModules();
        }
    }, [storedModules]);
    return storedModules;
}

export async function useGetProjectById(id: string) {
    const res = await baseInstance
        .get<IProject>(
            `/v2/projects/${id}`);

    return res.data;
}
