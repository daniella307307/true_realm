import { useRealm, useQuery as useRealmQuery } from "@realm/react";
import { useEffect } from "react";
import { Survey } from "~/models/surveys/survey";
import { IExistingForm } from "~/types";
import { baseInstance } from "~/utils/axios";

interface I4BaseFormat<T> {
    status: boolean;
    data: T;
}

export async function fetchFormByProjectAndModuleFromRemote(projectId: number, moduleId: number) {
    const res = await baseInstance
        .get<I4BaseFormat<IExistingForm[]>>(
            `/v2/projects/${projectId}/module/${moduleId}/surveys`);

    return res.data;
}

export function useGetFormByProjectAndModule(projectId: number, moduleId: number) {
    const realm = useRealm();
    const storedForms = useRealmQuery(Survey);

    useEffect(() => {
        async function fetchAndStoreForms() {
            try {
                const apiForms = await fetchFormByProjectAndModuleFromRemote(projectId, moduleId);
                realm.write(() => {
                    const existingForms = storedForms.map(form => form.id);
                    const newForms = apiForms.data.filter(form => !existingForms.includes(form.id));

                    if (newForms.length > 0) {
                        newForms.forEach(form => {
                            realm.create(Survey, form, Realm.UpdateMode.Modified);
                        });
                    }
                });
            } catch (error) {
                console.error("Error writing to Realm:", error);
            }
        }

        if (storedForms.length === 0) {
            fetchAndStoreForms();
        }
    }, [projectId, moduleId]);

    return storedForms;
}


export async function useGetAllForms() {
    const res = await baseInstance
        .get<I4BaseFormat<IExistingForm[]>>(
            `/v2/surveys`);

    return res.data;
}

export async function fetchFormByIdFromRemote(id: number) {
    console.log("Form_ID: ", id);
    const res = await baseInstance
        .get<IExistingForm>(
            `/v2/surveys/${id}`);

    return res.data;
}

export function useGetFormById(id: number) {
    const storedForms = useRealmQuery(Survey);
    const storedForm = storedForms.find(form => form.id === id);
    return storedForm;
}
