import { IExistingForm, IForm } from "~/types";
import { baseInstance } from "~/utils/axios";

interface I4BaseFormat<T> {
    status: boolean;
    data: T;
}

export async function useGetFormElements({ id }: { id: number }) {
    const res = await baseInstance
        .get<IForm>(
            `/forms/${id}/elements`);
    return res.data;
}

export async function useGetFormByProjectAndModule(projectId: number, moduleId: number) {
    const res = await baseInstance
        .get<I4BaseFormat<IExistingForm[]>>(
            `/v2/projects/${projectId}/module/${moduleId}/surveys`);

    return res.data;
}

export async function useGetAllForms() {
    const res = await baseInstance
        .get<I4BaseFormat<IExistingForm[]>>(
            `/v2/surveys`);

    return res.data;
}

export async function useGetFormById(id: number) {
    console.log("Form_ID: ", id);
    const res = await baseInstance
        .get<IExistingForm>(
            `/v2/surveys/${id}`);
    
    return res.data;
}
