import { IExistingForm, IModule, IProject } from "~/types";
import { baseInstance } from "~/utils/axios";

interface I2BaseFormat<T> {
    current_page: string;
    data: {
        current_page: string;
        data: T[];
    };
}

interface I3BaseFormat<T> {
    success: boolean;
    data: {
        [key: string]: T[];
    };
}

export async function useGetAllProjects() {
    const res = await baseInstance
        .get<I2BaseFormat<IProject>>(
            '/v2/projects');
            
    return res.data;
}

export async function useGetAllModules() {
    const res = await baseInstance
        .get<I3BaseFormat<IModule>>(
            '/v2/projects/modules');
            
    return res.data;
}

export async function useGetProjectById(id: string) {
    const res = await baseInstance
        .get<IProject>(
            `/v2/projects/${id}`);
            
    return res.data;
}
