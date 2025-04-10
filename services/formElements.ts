import { useCallback, useEffect, useMemo, useState } from "react";
import { Survey } from "~/models/surveys/survey";
import { I4BaseFormat, IExistingForm } from "~/types";
import { baseInstance } from "~/utils/axios";
import { useNetworkStatus } from "./network";
import { RealmContext } from "~/providers/RealContextProvider";
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

      let successCount = 0;
      let errorCount = 0;

      realm.write(() => {
        apiForms.data.forEach((form) => {
          try {
            if (
              !form.id ||
              !form.name ||
              !form.survey_status ||
              !form.is_primary ||
              !form.order_list ||
              !form.project_module_id
            ) {
              console.warn(
                `Skipping form ${form.id}: Missing required fields`,
                form
              );
              errorCount++;
              return;
            }

            const formWithId = {
              ...form,
              _id: new Realm.BSON.ObjectId(),
            };

            const result = realm.create(
              Survey,
              formWithId,
              Realm.UpdateMode.Modified
            );
            console.log(`Created/Updated form with ID: ${form.id}`);
            successCount++;
          } catch (error) {
            console.error(`Error creating/updating form ${form.id}:`, error);
            errorCount++;
          }
        });
      });

      // Log sync results
      console.log(
        `Sync completed. Success: ${successCount}, Errors: ${errorCount}`
      );

      // Log all stored forms after sync
      const allStoredForms = realm.objects(Survey);
      console.log(
        "Stored form IDs:",
        allStoredForms.map((f) => f.id)
      );

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

export function useGetFormByProjectAndModule(
  project_id: number,
  module_id: number,
  project_module_id: number
) {
  const allStoredForms = useQuery(Survey);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [filteredForms, setFilteredForms] = useState<Survey[]>([]);

  useEffect(() => {
    const loadForms = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const filtered = allStoredForms.filter(
          (form) =>
            form.project_id === project_id &&
            form.source_module_id === module_id &&
            form.project_module_id === project_module_id
        );
        // console.log("All Stored Forms: ", JSON.stringify(allStoredForms, null, 2));
        console.log(
          "Filtered Forms: ",
          JSON.stringify(
            // Filtered forms please ommit the json2 field on each form
            filtered.map((form) => ({
              ...form,
              json2: undefined,
            })),
            null,
            2
          )
        );
        setFilteredForms(filtered);
        setLastSyncTime(new Date());
      } catch (err) {
        console.error("Error filtering forms:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    loadForms();
  }, [allStoredForms, project_id, module_id, project_module_id]);

  return {
    filteredForms,
    isLoading,
    error,
    lastSyncTime,
  };
}

export function useGetFormById(id: number) {
  const realm = useRealm();
  const [form, setForm] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const allStoredForms = useQuery(Survey);
  useEffect(() => {
    const loadForm = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!realm || realm.isClosed) {
          throw new Error("Realm is closed");
        }

        // Filter by the id and find that form id is not primary key
        const localForm = allStoredForms.filter((form) => form.id === id);

        if (!localForm) {
          throw new Error("Form not found");
        }

        // Filter returns an array, so we need to get the first matching form
        const matchingForm = localForm[0];
        if (!matchingForm) {
          throw new Error("Form not found");
        }

        setForm(matchingForm);
      } catch (err) {
        console.error("Error loading form:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    loadForm();
  }, [id, realm]);

  return { form, isLoading, error };
}
