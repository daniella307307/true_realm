import { useEffect, useMemo, useState, useCallback } from "react";
import { FormField, IFamilies, SyncType } from "~/types";
import { useSQLite } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { SyncConfig, useDataSync } from "./dataSync";
import { isOnline } from "./network";
import { useAuth } from "~/lib/hooks/useAuth";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { TFunction } from "i18next";

// ============================================
// HELPER FUNCTIONS FOR SQLite CONVERSION
// ============================================

function familyToSQLiteRow(family: IFamilies): any {
  const location = family.location || {};
  const formData = family.form_data || {};
  const syncData = family.sync_data || {};
  const meta = family.meta || {};

  return {
    _id: family._id || family.id?.toString(),
    id: family.id,
    hh_id: family.hh_id,
    hh_head_fullname: family.hh_head_fullname,
    village_name: family.village_name,
    village_id: family.village_id,
    izucode: family.izucode,
    
    location_province: location.province,
    location_district: location.district,
    location_sector: location.sector,
    location_cell: location.cell,
    location_village: location.village,
    
    form_data_time_spent_filling_the_form: formData.time_spent_filling_the_form,
    form_data_user_id: formData.user_id,
    form_data_table_name: formData.table_name,
    form_data_project_module_id: formData.project_module_id,
    form_data_source_module_id: formData.source_module_id,
    form_data_project_id: formData.project_id,
    form_data_survey_id: formData.survey_id,
    form_data_post_data: formData.post_data,
    form_data_izucode: formData.izucode,
    form_data_cohorts: formData.cohorts,
    form_data_form_status: formData.form_status,
    
    sync_data_sync_status: syncData.sync_status ? true : false,
    sync_data_sync_reason: syncData.sync_reason,
    sync_data_sync_attempts: syncData.sync_attempts || 0,
    sync_data_sync_type: syncData.sync_type,
    sync_data_last_sync_attempt: syncData.last_sync_attempt,
    sync_data_submitted_at: syncData.submitted_at,
    
    meta_json: JSON.stringify(meta),
    
    created_at: family.created_at || new Date().toISOString(),
    updated_at: family.updated_at || new Date().toISOString(),
  };
}

function sqliteRowToFamily(row: any): IFamilies {
  return {
    _id: row._id,
    id: row.id,
    hh_id: row.hh_id,
    hh_head_fullname: row.hh_head_fullname,
    village_name: row.village_name,
    village_id: row.village_id,
    izucode: row.izucode,
    
    location: {
      province: row.location_province,
      district: row.location_district,
      sector: row.location_sector,
      cell: row.location_cell,
      village: row.location_village,
    },
    
    form_data: {
      time_spent_filling_the_form: row.form_data_time_spent_filling_the_form,
      user_id: row.form_data_user_id,
      table_name: row.form_data_table_name,
      project_module_id: row.form_data_project_module_id,
      source_module_id: row.form_data_source_module_id,
      project_id: row.form_data_project_id,
      survey_id: row.form_data_survey_id,
      post_data: row.form_data_post_data,
      izucode: row.form_data_izucode,
      cohorts: row.form_data_cohorts,
      form_status: row.form_data_form_status,
    },
    
    sync_data: {
      sync_status: Boolean(row.sync_data_sync_status),
      sync_reason: row.sync_data_sync_reason,
      sync_attempts: row.sync_data_sync_attempts,
      sync_type: row.sync_data_sync_type,
      last_sync_attempt: row.sync_data_last_sync_attempt,
      submitted_at: row.sync_data_submitted_at
    },
    
    meta: row.meta_json ? JSON.parse(row.meta_json) : {},
    
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function prepareMetaData(
  familyData: Record<string, any>,
  extraFields: FormField[] = []
) {
  if (extraFields.length > 0) {
    return Object.fromEntries(
      extraFields
        .filter(
          (field) =>
            field.key &&
            familyData[field.key] !== undefined &&
            field.key !== "submit"
        )
        .map((field) => {
          const value = familyData[field.key];

          switch (field.type) {
            case "switch":
              return [field.key, value ? true : false];
            case "number":
              return [field.key, Number(value)];
            case "date":
            case "datetime":
              return [field.key, value ? new Date(value).toISOString() : null];
            default:
              return [field.key, value ?? null];
          }
        })
    );
  }

  return familyData;
}

// =========================================

const configs: SyncConfig<IFamilies>[] = [
  {
    key: "families",
    tableName: "Families",
    transformData: (data: any) => {
      return data.families.map((fam: any) => ({
        ...fam,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        location: fam.location || {},
        meta: fam.meta || {},
      }));
    },
    fetchFn: async () => {
      const res = await baseInstance.get("/get-families");
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
    forceSync: true,
  },
];

export function useFamilyService() {
  const { db, isReady, getAll } = useSQLite();
  const { syncStatus, refresh } = useDataSync(configs);
  const { user } = useAuth({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [families, setFamilies] = useState<IFamilies[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const t: TFunction<"translation", undefined> = useMemo(() => {
    try {
      return require("i18next").t;
    } catch {
      return (key: string) => key;
    }
  }, []);

  const loadFamilies = useCallback(async () => {
    if (!isReady) return;
    try {
      setLoading(true);
      const rows = await getAll<any>("Families");
      const familyList: IFamilies[] = []; 
      rows.forEach(result => {
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows.item(i);
          familyList.push(sqliteRowToFamily(row));
        }
      });
      setFamilies(familyList);
      setLoading(false);
    } catch (err) {
      console.error("Error loading families:", err);
      setError(err as Error);
      setLoading(false);
    }
  }, [isReady, getAll]);

  const syncFamilies = useCallback(async (force: boolean = false) => {
    if (!isReady) {
      console.log("SQLite not ready, cannot sync families");
      return;
    }
    if (!user) {
      console.log("No authenticated user, cannot sync families");
      return;
    }
    if (!isOnline()) {
      console.log("Offline, cannot sync families");
      Toast.show({
        type: "error",
        text1: t("You are offline. Please connect to the internet to sync families."),
      });
      return;
    }
    try {
      setLoading(true);
      await refresh("families", true);
      setLastSyncTime(new Date());
      await loadFamilies();
      setLoading(false);
      Toast.show({
        type: "success",
        text1: t("Families synced successfully"),
      });
    } catch (err) {
      console.error("Error syncing families:", err);
      setError(err as Error);
      setLoading(false);
      Toast.show({
        type: "error",
        text1: t("Error syncing families"),
        text2: (err as Error).message,
      });
    }
  }, [isReady, user, t, refresh, loadFamilies]);

  useEffect(() => {
    loadFamilies();
  }, [loadFamilies]);

  return {
    families,
    loading,  
    error,
    lastSyncTime,
    loadFamilies,
    syncFamilies,
  };
}

export async function fetchFamiliesFromRemote() {
  const res = await baseInstance.get<{ families: IFamilies[] }>("/get-families");
  return {
    families: res.data.families || [],
  };
}

export function useGetFamilies(forceSync: boolean = false) {
  const { getAll, batchCreate } = useSQLite();
  const { user } = useAuth({});
  const [storedFamilies, setStoredFamilies] = useState<IFamilies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [allIzus, setAllIzus] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const izuRows = await getAll<any>("Izu");
        setAllIzus(izuRows);

        const familyRows = await getAll<any>("Families");
        const families = familyRows.map(sqliteRowToFamily);

        if (families.length === 0 && forceSync && isOnline()) {
          const remoteData = await fetchFamiliesFromRemote();
          const transformedFamilies = remoteData.families.map((fam) => ({
            ...fam,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            location: fam.location || {},
            meta: fam.meta || {},
          }));

          const sqliteRows = transformedFamilies.map(familyToSQLiteRow);
          await batchCreate("Families", sqliteRows);
          setStoredFamilies(transformedFamilies);
        } else {
          setStoredFamilies(families);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error loading families:", err);
        setError(err as Error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [forceSync, getAll, batchCreate]);

  const userFilteredFamilies = useMemo(() => {
    if (!user?.id) return storedFamilies;
    return storedFamilies.filter(
      (family) => family.form_data?.user_id === user.id
    );
  }, [storedFamilies, user]);

  const filteredFamilies = useMemo(() => {
    if (!user || !user.json) return userFilteredFamilies;

    const position = Number(user.position || user.json.position);

    if (position === 7 && (user.cell || user.json.cell)) {
      const userCell = user.cell || user.json.cell;
      const relevantIzus = allIzus.filter(
        (izu) =>
          (izu.position === 7 || izu.position === 8) &&
          izu.location_cell === userCell
      );
      const izucodes = relevantIzus.map((izu) => izu.izucode);
      return userFilteredFamilies.filter((family) =>
        izucodes.includes(family.izucode)
      );
    }

    if (position === 13 && (user.sector || user.json.sector)) {
      const userSector = user.sector || user.json.sector;
      const relevantIzus = allIzus.filter(
        (izu) =>
          (izu.position === 7 || izu.position === 8) &&
          izu.location_sector === userSector
      );
      const izucodes = relevantIzus.map((izu) => izu.izucode);
      return userFilteredFamilies.filter((family) =>
        izucodes.includes(family.izucode)
      );
    }

    if (
      position === 8 &&
      (user.village || user.json.village) &&
      user.user_code
    ) {
      const userVillage = user.village || user.json.village;
      const relevantIzus = allIzus.filter(
        (izu) =>
          izu.position === position &&
          izu.location_village === userVillage &&
          izu.izucode === user.user_code
      );
      const izucodes = relevantIzus.map((izu) => izu.izucode);
      return userFilteredFamilies.filter((family) =>
        izucodes.includes(family.izucode)
      );
    }

    return userFilteredFamilies;
  }, [userFilteredFamilies, user, allIzus]);

  return {
    families: filteredFamilies,
    isLoading,
    error,
    lastSyncTime: null,
    refresh: () => {},
  };
}

export function useGetAllLocallyCreatedFamilies() {
  const { getAll } = useSQLite();
  const [locallyCreatedFamilies, setLocallyCreatedFamilies] = useState<IFamilies[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const rows = await getAll<any>("Families");
        const families = rows.map(sqliteRowToFamily).filter(
          (family) =>
            family.sync_data?.sync_status === true ||
            family.sync_data?.sync_status === false
        );
        setLocallyCreatedFamilies(families);
      } catch (error) {
        console.error("Error loading locally created families:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFamilies();
  }, [getAll]);

  return {
    locallyCreatedFamilies,
    isLoading,
    error: null,
    lastSyncTime: null,
    refresh: () => {},
  };
}

// ============================================
// HOOK FOR FAMILY OPERATIONS
// ============================================

export function useFamilyOperations() {
  const { create, getAll, update, getByQuery } = useSQLite();

  const getNextAvailableId = useCallback(async (): Promise<number> => {
    try {
      const families = await getAll<any>("Families");
      if (families.length > 0) {
        const maxId = Math.max(...families.map((f) => f.id || 0));
        return maxId + 1;
      }
      return 1;
    } catch (error) {
      console.log("Error getting next ID, using default:", error);
      return 1;
    }
  }, [getAll]);

  const createFamilyWithMeta = useCallback(
    async (
      familyData: Record<string, any>,
      extraFields: FormField[] = []
    ): Promise<IFamilies> => {
      try {
        const meta = familyData.meta || prepareMetaData(familyData, extraFields);
        const id = typeof familyData.id === "number" ? familyData.id : await getNextAvailableId();

        const location =
          typeof familyData.location === "object"
            ? familyData.location
            : {
                province: familyData.province,
                district: familyData.district,
                sector: familyData.sector,
                cell: familyData.cell,
                village: familyData.village,
              };

        const formData = {
          time_spent_filling_the_form: familyData.time_spent_filling_the_form || null,
          user_id: familyData.user_id || null,
          table_name: familyData.table_name || null,
          project_module_id: familyData.project_module_id || null,
          source_module_id: familyData.source_module_id || null,
          project_id: familyData.project_id || null,
          survey_id: familyData.survey_id || null,
          post_data: familyData.post_data || null,
          izucode: familyData.izucode || null,
          cohorts: familyData.cohorts || null,
          form_status: familyData.form_status || null,
        };

        const syncData = familyData.sync_data || {
          sync_status: false,
          sync_reason: "New record",
          sync_attempts: 0,
          last_sync_attempt: new Date().toISOString(),
          sync_type: SyncType.families,
          submitted_at: new Date().toISOString(),
          created_by_user_id: familyData.user_id || null,
        };

        const family: IFamilies = {
          id,
          ...familyData,
          hh_id: familyData.hh_id,
          hh_head_fullname: familyData.hh_head_fullname || "Unknown",
          village_name: familyData.village_name || "Unknown",
          village_id: familyData.village_id || null,
          izucode: familyData.izucode || null,
          location,
          meta,
          form_data: formData,
          sync_data: syncData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _id: ""
        };

        const sqliteRow = familyToSQLiteRow(family);
        await create("Families", sqliteRow);

        return family;
      } catch (error) {
        console.error("Error creating family with meta:", error);
        throw error;
      }
    },
    [create, getNextAvailableId]
  );

  const saveFamilyToAPI = useCallback(
    async (
      familyData: Record<string, any>,
      apiUrl: string,
      t: TFunction,
      extraFields: FormField[] = []
    ): Promise<void> => {
      try {
        if (familyData.source_module_id && familyData.source_module_id !== 22) {
          const existingFamilies = await getAll<any>("Families");
          const isDuplicate = existingFamilies.some(
            (family) =>
              family.hh_head_fullname === familyData.hh_head_fullname &&
              family.village_id === familyData.village_id &&
              family.izucode === familyData.izucode
          );

          if (isDuplicate) {
            Toast.show({
              type: "error",
              text1: t("Alerts.error.title"),
              text2: t("Alerts.error.duplicate.family"),
              position: "top",
              visibilityTime: 4000,
            });
            return;
          }
        }

        const location =
          typeof familyData.location === "object"
            ? familyData.location
            : {
                province: familyData.province,
                district: familyData.district,
                sector: familyData.sector,
                cell: familyData.cell,
                village: familyData.village,
              };

        const formData = {
          time_spent_filling_the_form: familyData.time_spent_filling_the_form || null,
          user_id: familyData.user_id || null,
          table_name: familyData.table_name || null,
          project_module_id: familyData.project_module_id || null,
          source_module_id: familyData.source_module_id || null,
          project_id: familyData.project_id || null,
          survey_id: familyData.survey_id || null,
          post_data: familyData.post_data || null,
          izucode: familyData.izucode || null,
          cohorts: familyData.cohorts || null,
        };

        const syncData = familyData.sync_data || {
          sync_status: false,
          sync_reason: "New record",
          sync_attempts: 0,
          last_sync_attempt: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          sync_type: SyncType.families,
          created_by_user_id: familyData.user_id || null,
        };

        const sanitizedFamilyData = {
          ...familyData,
          id: familyData.id || null,
          hh_id: null,
          hh_head_fullname: familyData.hh_head_fullname || familyData.head_of_household || "Unknown",
          village_name: familyData.village_name || "Unknown",
          village_id: familyData.village_id || null,
          sync_data: syncData,
          form_data: formData,
          meta: prepareMetaData(familyData, extraFields),
          location,
        };

        const isConnected = isOnline();

        if (isConnected) {
          try {
            Toast.show({
              type: "info",
              text1: t("Alerts.saving.family"),
              text2: t("Alerts.submitting.server"),
              position: "top",
              visibilityTime: 2000,
            });

            const apiData: any = {
              ...familyData,
              ...(sanitizedFamilyData.meta || {}),
              ...(sanitizedFamilyData.form_data || {}),
            };
            if ("meta" in apiData) {
              delete apiData.meta;
            }

            const response = await baseInstance.post(apiUrl, apiData);

            if (response.data?.result?.id) {
              const completeData = {
                ...sanitizedFamilyData,
                id: response.data.result.id,
                hh_id: response.data.result.hh_id,
                izucode: response.data.result.izucode || null,
                ...response.data.result,
                sync_data: {
                  sync_status: true,
                  sync_reason: "Successfully synced",
                  sync_attempts: 1,
                  last_sync_attempt: new Date().toISOString(),
                  submitted_at: new Date().toISOString(),
                  created_by_user_id: familyData.user_id || null,
                  sync_type: SyncType.families,
                },
              };

              await createFamilyWithMeta(completeData, extraFields);
              
              Toast.show({
                type: "success",
                text1: t("Alerts.success.title"),
                text2: t("Alerts.success.family"),
                position: "top",
                visibilityTime: 3000,
              });
              router.push("/(history)/history");
            } else {
              await createFamilyWithMeta(sanitizedFamilyData, extraFields);
              Toast.show({
                type: "info",
                text1: t("Alerts.info.saved_locally"),
                text2: t("Alerts.info.api_invalid"),
                position: "top",
                visibilityTime: 3000,
              });
              router.push("/(history)/history");
            }
          } catch (error: any) {
            console.error("Error submitting family to API:", error);
            
            await createFamilyWithMeta(sanitizedFamilyData, extraFields);
            Toast.show({
              type: "info",
              text1: t("Alerts.info.saved_locally"),
              text2: t("Alerts.submitting.offline"),
              position: "top",
              visibilityTime: 3000,
            });
            router.push("/(history)/history");
          }
        } else {
          await createFamilyWithMeta(sanitizedFamilyData, extraFields);
          Toast.show({
            type: "info",
            text1: t("Alerts.info.offline_mode"),
            text2: t("Alerts.info.will_sync"),
            position: "top",
            visibilityTime: 3000,
          });
          router.push("/(history)/history");
        }
      } catch (error: any) {
        console.error("Error in saveFamilyToAPI:", error);
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.submission.unexpected"),
          position: "top",
          visibilityTime: 4000,
        });
      }
    },
    [getAll, createFamilyWithMeta]
  );

  const syncTemporaryFamilies = useCallback(
    async (
      query: <T = any>(sql: string, params?: any[]) => Promise<T[]>,
      apiUrl: string,
      t: TFunction,
      userId?: number
    ): Promise<void> => {
      if (!isOnline()) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.network.title"),
          text2: t("Alerts.error.network.offline"),
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      if (!userId) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.sync.no_user"),
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      const pendingRows = await getByQuery<any>(
        "Families",
        "sync_data_sync_status = ?",
        [false]
      );

      if (pendingRows.length === 0) {
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: t("Alerts.info.no_pending"),
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      const familiesToSync = pendingRows.map(sqliteRowToFamily);

      let successCount = 0;
      let failureCount = 0;

      for (const family of familiesToSync) {
        try {
          const apiData = {
            hh_id: family.hh_id,
            hh_head_fullname: family.hh_head_fullname,
            izucode: family.izucode || null,
            village_name: family.village_name,
            village_id: family.village_id,
            province: family.location?.province || 0,
            district: family.location?.district || 0,
            sector: family.location?.sector || 0,
            cell: family.location?.cell || 0,
            village: family.location?.village || 0,
            ...family.form_data,
            ...family.meta,
          };

          const response = await baseInstance.post(apiUrl, apiData);

          if (response.data?.result?.id) {
            await update("Families", family._id!, {
              id: response.data.result.id,
              hh_id: response.data.result.hh_id,
              sync_data_sync_status: 1,
              sync_data_sync_reason: "Successfully synced",
              sync_data_sync_attempts: 1,
              sync_data_last_sync_attempt: new Date().toISOString(),
            });
            successCount++;
          }
        } catch (error: any) {
          failureCount++;
          
          if (family._id) {
            await update("Families", family._id, {
              sync_data_sync_attempts: (family.sync_data?.sync_attempts || 0) + 1,
              sync_data_last_sync_attempt: new Date().toISOString(),
              sync_data_sync_reason: `Failed: ${error?.message || "Unknown error"}`,
            });
          }
        }
      }

      if (successCount > 0 && failureCount === 0) {
        Toast.show({
          type: "success",
          text1: t("Alerts.success.title"),
          text2: t("Alerts.success.sync").replace("{count}", successCount.toString()),
          position: "top",
          visibilityTime: 4000,
        });
      } else if (successCount > 0 && failureCount > 0) {
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: t("Alerts.info.partial_success")
            .replace("{success}", successCount.toString())
            .replace("{failed}", failureCount.toString()),
          position: "top",
          visibilityTime: 4000,
        });
      } else if (failureCount > 0) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.sync.failed").replace("{count}", failureCount.toString()),
          position: "top",
          visibilityTime: 4000,
        });
      }
    },
    [getByQuery, update]
  );

  return {
    getNextAvailableId,
    createFamilyWithMeta,
    saveFamilyToAPI,
    syncTemporaryFamilies,
  };
}