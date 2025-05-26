import { useCallback, useEffect, useMemo, useState } from "react";

import { I4BaseFormat, IExistingForm, IFormElement } from "~/types";
import { RealmContext } from "~/providers/RealContextProvider";
import { Survey } from "~/models/surveys/survey";
import { baseInstance } from "~/utils/axios";

import { useDataSync } from "./dataSync";
import { useNetworkStatus } from "./network";

const { useRealm, useQuery } = RealmContext;

export async function fetchFormsFromRemote() {
  const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(
    `/v2/surveys`
  );
  return res.data;
}

export async function fetchFormByProjectAndModuleFromRemote(
  projectId: number,
  moduleId: number
) {
  const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(
    `/v2/projects/${projectId}/module/${moduleId}/surveys`
  );
  return res.data;
}

export function useGetForms(forceSync: boolean = false) {
  const realm = useRealm();
  const storedForms = useQuery(Survey);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "forms",
      fetchFn: fetchFormsFromRemote,
      model: Survey,
      transformData: (data: I4BaseFormat<IExistingForm[]>) => {
        // Clear existing forms before syncing new ones
        realm.write(() => {
          realm.delete(storedForms);
        });

        // Transform and return new data with proper _id
        return data.data.map((form) => ({
          ...form,
          _id: new Realm.BSON.ObjectId(),
        }));
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  ]);

  return {
    forms: storedForms,
    isLoading: syncStatus.forms?.isLoading || false,
    error: syncStatus.forms?.error || null,
    lastSyncTime: syncStatus.forms?.lastSyncTime || null,
    refresh: () => refresh("forms", forceSync),
  };
}

export function useGetFormByProjectAndModule(
  project_id: number,
  module_id: number,
  project_module_id: number
) {
  const allStoredForms = useQuery(Survey);
  const filteredForms = allStoredForms.filter(
    (form) =>
      form.project_id === project_id &&
      form.source_module_id === module_id &&
      form.project_module_id === project_module_id
  );

  const { syncStatus, refresh } = useDataSync([
    {
      key: `forms-${project_id}-${module_id}-${project_module_id}`,
      fetchFn: () =>
        fetchFormByProjectAndModuleFromRemote(project_id, module_id),
      model: Survey,
      transformData: (data: I4BaseFormat<IExistingForm[]>) =>
        data.data.map((form) => ({
          ...form,
          _id: new Realm.BSON.ObjectId(),
        })),
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  ]);

  return {
    filteredForms,
    isLoading:
      syncStatus[`forms-${project_id}-${module_id}-${project_module_id}`]
        ?.isLoading || false,
    error:
      syncStatus[`forms-${project_id}-${module_id}-${project_module_id}`]
        ?.error || null,
    lastSyncTime:
      syncStatus[`forms-${project_id}-${module_id}-${project_module_id}`]
        ?.lastSyncTime || null,
    refresh: () =>
      refresh(`forms-${project_id}-${module_id}-${project_module_id}`),
  };
}

export function useGetFormById(formId: number, project_module_id: number, source_module_id: number, project_id: number) {
  const storedForms = useQuery(Survey);
  
  const form = useMemo(() => {
    try {
      return storedForms.find(
        (form) => 
          form.id === formId && 
          form.project_module_id === project_module_id && 
          form.source_module_id === source_module_id && 
          form.project_id === project_id
      );
    } catch (error) {
      console.error("Error accessing form from Realm:", error);
      return null;
    }
  }, [storedForms, formId, project_module_id, source_module_id, project_id]);

  return {
    form,
    isLoading: false,
    error: null,
    lastSyncTime: null,
    refresh: () => {}
  };
}
