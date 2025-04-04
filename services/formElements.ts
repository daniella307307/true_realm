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
      console.log("Fetching forms from remote");
      const apiForms = await fetchFormByProjectAndModuleFromRemote(projectId, moduleId);

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
    async function fetchForm() {
      setIsLoading(true);
      setError(null);

      try {
        const localForm = realm.objectForPrimaryKey<Survey>("Survey", id);
        
        if (localForm) {
          setForm(localForm);

          if (isConnected) {
            try {
              const remoteForm = await fetchFormByIdFromRemote(id);

              if (!realm || realm.isClosed) {
                console.warn("Skipping Realm write: Realm is closed");
              } else {
                realm.write(() => {
                  realm.create("Survey", {
                    ...remoteForm,
                    is_primary: remoteForm.is_primary === true ? 1 : 0,
                    json2: typeof remoteForm.json2 !== "string" ? JSON.stringify(remoteForm.json2) : remoteForm.json2,
                  }, Realm.UpdateMode.Modified);
                  setForm(remoteForm);
                });
              }
            } catch (remoteError) {
              console.error("Error fetching remote form:", remoteError);
            }
          }
        } else if (isConnected) {
          const remoteForm = await fetchFormByIdFromRemote(id);

          if (!realm || realm.isClosed) {
            setForm(remoteForm);
          } else {
            realm.write(() => {
              realm.create("Survey", remoteForm, Realm.UpdateMode.Modified);
              setForm(remoteForm);
            });
          }
        } else {
          setError(new Error("Form not found locally and device is offline"));
        }
      } catch (error) {
        console.error("Error in useGetFormById:", error);
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    }

    fetchForm();
  }, [id, isConnected, realm]);

  return { form, isLoading, error };
}

