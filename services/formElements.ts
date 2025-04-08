import { useCallback, useEffect, useState } from "react";
import { Survey } from "~/models/surveys/survey";
import { I4BaseFormat, IExistingForm } from "~/types";
import { baseInstance } from "~/utils/axios";
import { useNetworkStatus } from "./network";
import { RealmContext } from "~/providers/RealContextProvider";
const { useRealm, useQuery } = RealmContext;

// Remote data fetching functions
export async function fetchFormByProjectAndModuleFromRemote(projectId: number, moduleId: number) {
  const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(
    `/v2/projects/${projectId}/module/${moduleId}/surveys`
  );
  return res.data;
}

export async function fetchFormsFromRemote() {
  const res = await baseInstance.get<I4BaseFormat<IExistingForm[]>>(
    `/v2/surveys`
  );
  return res.data;
}

export function useGetForms() {
  const realm = useRealm();
  const storedForms = useQuery(Survey);
  const { isConnected } = useNetworkStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const syncForms = useCallback(async () => {
    if (!isConnected) {
      console.log("Offline mode: Using local forms data");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiForms = await fetchFormsFromRemote();
      
      if (!realm || realm.isClosed) {
        console.warn("Skipping Realm write: Realm is closed");
        setError(new Error("Realm is closed"));
        return;
      }
      
      realm.write(() => {
        apiForms.data.forEach((form) => {
          realm.create("Survey", form, Realm.UpdateMode.Modified);
        });
      });
      
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error fetching forms:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, realm]);

  useEffect(() => {

    if (isConnected) {
      syncForms();
    }
  }, [isConnected, syncForms]);

  return { storedForms, isLoading, error, lastSyncTime, refresh: syncForms };
}


export async function fetchFormByIdFromRemote(id: number) {
  const res = await baseInstance.get(`/v2/surveys/${id}`);
  return res.data;
}

// Hook for fetching forms by project and module with offline support
export function useGetFormByProjectAndModule(projectId: number, moduleId: number) {
  const realm = useRealm();
  const allStoredForms = useQuery(Survey);
  const storedForms = allStoredForms.filtered('project_module_id == $0', moduleId);
  const { isConnected } = useNetworkStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncForms = useCallback(async () => {
    if (!isConnected) {
      console.log("Offline mode: Using local forms data");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching forms from remote");
      const apiForms = await fetchFormByProjectAndModuleFromRemote(projectId, moduleId);

      console.log("API Forms: ", JSON.stringify(apiForms.data.map(form => ({
        ...form,
        json: '[content omitted]',
        json2: '[content omitted]'
      })), null, 2));

      if (!realm || realm.isClosed) {
        console.warn("Skipping Realm write: Realm is closed");
        setError(new Error("Realm is closed"));
        return;
      }

      realm.write(() => {
        apiForms.data.forEach((form) => {
          try {
            realm.create("Survey", 
                {
                    ...form,
                    json2: typeof form.json2 !== "string" ? JSON.stringify(form.json2) : form.json2,
                }, 
                Realm.UpdateMode.Modified);
          } catch (error) {
            console.error("Error creating/updating form:", error);
          }
        });
      });

      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error fetching forms:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, projectId, moduleId, realm]);

  useEffect(() => {
    if (isConnected) {
      syncForms();
    }
  }, [isConnected, syncForms]);

  return { storedForms, isLoading, error, lastSyncTime, refresh: syncForms };
}

// Hook for fetching a form by ID with offline support
export function useGetFormById(id: number) {
  const realm = useRealm();
  const { isConnected } = useNetworkStatus();
  const [form, setForm] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Both online and offline mode just search in the Survey 
    const localForm = realm.objectForPrimaryKey<Survey>("Survey", id);
    setForm(localForm);
  }, [id, isConnected, realm]);

  return { form, isLoading, error };
}

