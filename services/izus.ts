import { useMemo } from "react";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useDataSync } from "./dataSync";
import { FormField, Izus } from "~/types";
import { Izu } from "~/models/izus/izu";
import { isOnline } from "./network";

const { useQuery } = RealmContext;

interface IIzuResponse {
  izus: Izus[];
}

export async function fetchIzusFromRemote() {
  const res = await baseInstance.get<IIzuResponse>("/izus");
  return res.data.izus;
}

export function useGetIzus(forceSync: boolean = false) {
  const storedIzus = useQuery(Izu);
  const { syncStatus, refresh } = useDataSync([
    {
      key: "izus",
      fetchFn: fetchIzusFromRemote,
      model: Izu,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  return {
    izus: storedIzus,
    isLoading: syncStatus.izus?.isLoading || false,
    error: syncStatus.izus?.error || null,
    lastSyncTime: syncStatus.izus?.lastSyncTime || null,
    refresh: () => refresh("izus", forceSync),
  };
}

/**
 * Hook for getting a specific Izu by ID
 * @param id The ID of the Izu to retrieve
 */
export function useGetIzuById(id: number, forceSync: boolean = false) {
  const { izus, isLoading, error, lastSyncTime, refresh } =
    useGetIzus(forceSync);

  const izu = useMemo(() => {
    return izus.find((izu) => izu.id === id);
  }, [izus, id]);

  return {
    izu,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}

// Function to useGetAllLocallyCreatedIzus
export function useGetAllLocallyCreatedIzus() {
  const storedIzus = useQuery(Izu);

  return {
    locallyCreatedIzus: storedIzus.filter(
      (izu) =>
        izu.sync_data?.sync_status === true ||
        izu.sync_data?.sync_status === false
    ),
    isLoading: false,
    error: null,
    lastSyncTime: null,
    refresh: () => {},
  };
}

function getNextAvailableId(realm: Realm): number {
  try {
    const izus = realm.objects<Izu>(Izu);
    if (izus.length > 0) {
      return Math.max(...izus.map((i) => i.id)) + 1;
    }
    return 1; // Start with 1 if no records exist
  } catch (error) {
    console.log("Error getting next ID, using default:", error);
    return 1;
  }
}

function prepareMetaData(
  izuData: Record<string, any>,
  extraFields: FormField[] = []
) {
  if (extraFields.length === 0) return {};

  return Object.fromEntries(
    extraFields
      .filter(
        (field) =>
          field.key &&
          izuData[field.key] !== undefined &&
          field.key !== "submit"
      )
      .map((field) => {
        const value = izuData[field.key];

        // Handle different field types
        switch (field.type) {
          case "switch":
            return [field.key, value ? true : false];
          case "number":
            return [field.key, Number(value)];
          case "date":
            return [field.key, value ? new Date(value).toISOString() : null];
          default:
            return [field.key, value ?? null];
        }
      })
      .filter(([_, value]) => value !== null)
  );
}

export const createIzuWithMeta = (
  realm: Realm,
  izuData: Record<string, any>,
  extraFields: FormField[] = []
): Izu => {
  try {
    const id = getNextAvailableId(realm);
    const meta = prepareMetaData(izuData, extraFields);

    const formData = {
      time_spent_filling_the_form: izuData.time_spent_filling_the_form || null,
      user_id: izuData.user_id || null,
      table_name: izuData.table_name || null,
      project_module_id: izuData.project_module_id || null,
      source_module_id: izuData.source_module_id || null,
      project_id: izuData.project_id || null,
      survey_id: izuData.survey_id || null,
      post_data: izuData.post_data || null,
      izucode: izuData.izucode || null,
      cohort: izuData.cohort || null,
    };

    const syncData = izuData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
    };

    let result: Izu;
    realm.write(() => {
      result = realm.create<Izu>(Izu, {
        id,
        name: izuData.name,
        user_code: izuData.user_code,
        villages_id: izuData.villages_id,
        score: izuData.score,
        meta,
        form_data: formData,
        location: izuData.location,
        sync_data: syncData,
      });
    });

    console.log("Created Izu with ID:", id);

    return result!;
  } catch (error) {
    console.error("Error creating Izu with meta:", error);
    throw error;
  }
};

function createTemporaryIzu(
  realm: Realm,
  izuData: Record<string, any>,
  extraFields: FormField[] = []
): Izu {
  const localId = getNextAvailableId(realm);

  const syncData = {
    sync_status: false,
    sync_reason: "Created offline",
    sync_attempts: 0,
    last_sync_attempt: new Date(),
    submitted_at: new Date(),
  };

  return createIzuWithMeta(
    realm,
    {
      ...izuData,
      id: localId,
      sync_data: syncData,
    },
    extraFields
  );
}

function replaceTemporaryIzu(
  realm: Realm,
  tempIzu: Izu,
  apiData: Record<string, any>
): Izu {
  // We'll update the existing record with API data, keeping the same local ID
  const updatedIzu = {
    ...apiData,
    id: tempIzu.id,
    sync_data: {
      sync_status: true,
      sync_reason: "Synced with server",
      sync_attempts:
        (tempIzu.sync_data?.sync_attempts
          ? Number(tempIzu.sync_data.sync_attempts)
          : 0) + 1,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
    },
  };

  return createIzuWithMeta(realm, updatedIzu, []);
}

export const saveIzuToAPI = async (
  realm: Realm,
  izuData: Record<string, any>,
  apiUrl: string,
  extraFields: FormField[] = []
): Promise<Izu> => {
  try {
    console.log("saveIzuToAPI received data:", JSON.stringify(izuData, null, 2));

    // Prepare location data
    const location =
      typeof izuData.location === "object"
        ? izuData.location
        : {
            province: izuData.province,
            district: izuData.district,
            sector: izuData.sector,
            cell: izuData.cell,
            village: izuData.village,
          };

    // Prepare form data
    const formData = {
      time_spent_filling_the_form: izuData.time_spent_filling_the_form || null,
      user_id: izuData.user_id || null,
      table_name: izuData.table_name || null,
      project_module_id: izuData.project_module_id || null,
      source_module_id: izuData.source_module_id || null,
      project_id: izuData.project_id || null,
      survey_id: izuData.survey_id || null,
      post_data: izuData.post_data || null,
      izucode: izuData.izucode || null,
      cohort: izuData.cohort || null,
    };

    // Prepare sync data
    const syncData = izuData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
    };

    const sanitizedIzuData = {
      ...izuData,
      id: izuData.id || null,
      sync_data: syncData,
      form_data: formData,
      meta: prepareMetaData(izuData, extraFields),
      location,
    };

    const isConnected = isOnline();
    console.log("isConnected", isConnected);
    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        console.log("Sending to API");
        // Prepare data for API - flatten meta fields at the top level
        const apiData = {
          ...izuData,
          ...(sanitizedIzuData.meta || {}),
          ...(sanitizedIzuData.form_data || {}),
        };

        // Remove the meta object itself from the API data
        if (apiData.meta) {
          delete apiData.meta;
        }

        
        // Send to API
        const response = await baseInstance.post(apiUrl, apiData);
        console.log(
          "Izu API submission response:",
          JSON.stringify(response.data, null, 2)
        );

        if (response.data?.result?.id) {
          const completeData = {
            ...sanitizedIzuData,
            id: response.data.result.id,
            user_code: response.data.result.user_code,
            sync_data: {
              sync_status: true,
              sync_reason: "Successfully synced",
              sync_attempts: 1,
              last_sync_attempt: new Date(),
              submitted_at: new Date(),
            },
            // Include any other fields returned from the API
            ...response.data.result,
          };

          return createIzuWithMeta(realm, completeData, extraFields);
        } else {
          // If API didn't return an ID, create with locally generated ID
          return createIzuWithMeta(realm, sanitizedIzuData, extraFields);
        }
      } catch (error: any) {

        console.error("Error submitting Izu to API:", error);
        console.log("Advanced error", error.response);
        // Fall back to offline approach if API submission fails
        return createTemporaryIzu(realm, sanitizedIzuData, extraFields);
      }
    } else {
      // Offline mode - create with locally generated ID
      // These will be marked for sync later
      console.log("Offline mode - creating temporary Izu record");
      return createTemporaryIzu(realm, sanitizedIzuData, extraFields);
    }
  } catch (error) {
    console.error("Error saving Izu to API:", error);
    throw error;
  }
};

export const syncTemporaryIzus = async (
  realm: Realm,
  apiUrl: string
): Promise<void> => {
  if (!isOnline()) {
    console.log("Cannot sync temporary Izus - offline");
    return;
  }

  // Find all Izus that need syncing
  const izusToSync = realm
    .objects<Izu>(Izu)
    .filtered("sync_data.sync_status == false");

  console.log(`Found ${izusToSync.length} Izus to sync`);

  for (const izu of izusToSync) {
    try {
      // Extract data to send to API
      const locationData = izu.location || {};

      const apiData = {
        id: izu.id,
        user_code: izu.user_code,
        name: izu.name,
        villages_id: izu.villages_id,
        score: izu.score,
        ...(locationData),
        ...(izu.meta || {}),
        ...(izu.form_data || {}),
      };

      console.log("Syncing Izu to API:", JSON.stringify(apiData, null, 2));
      console.log("API URL:", apiUrl);

      // Submit to API
      const response = await baseInstance.post(apiUrl, apiData);

      if (response.data?.result?.id) {
        // Prepare updated data
        const updatedData = {
          ...apiData,
          // Update the id with the id from the API
          // Update the user_code with the user_code from the API
          id: response.data.result.id,
          user_code: response.data.result.user_code,
          ...response.data.result,
          sync_data: {
            sync_status: true,
            sync_reason: "Successfully synced",
            sync_attempts: (typeof izu.sync_data?.sync_attempts === 'number' ? izu.sync_data.sync_attempts : 0) + 1,
            last_sync_attempt: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
          },
        };
        
        // Update in a new write transaction
        if (!realm.isInTransaction) {
          realm.write(() => {
            // Use the objects API to update the existing object
            const existingIzu = realm.objectForPrimaryKey(Izu, izu.id);
            if (existingIzu) {
              // Update properties safely
              if (updatedData.sync_data) {
                existingIzu.sync_data = updatedData.sync_data;
              }
              
              if (updatedData.name) {
                existingIzu.name = updatedData.name;
              }
              
              if (updatedData.user_code) {
                existingIzu.user_code = updatedData.user_code;
              }
              
              if (updatedData.villages_id) {
                existingIzu.villages_id = updatedData.villages_id;
              }
              
              if (updatedData.score !== undefined) {
                existingIzu.score = updatedData.score;
              }
              
              if (updatedData.location) {
                existingIzu.location = updatedData.location;
              }
              
              if (updatedData.meta) {
                existingIzu.meta = updatedData.meta;
              }
              
              if (updatedData.form_data) {
                existingIzu.form_data = updatedData.form_data;
              }
            }
          });
        }
        
        console.log(
          `Successfully synced Izu ${izu.id} to server, updated with server id: ${response.data.result.id}`
        , izu);
      }
    } catch (error: any) {
      console.log("Advanced error", error.response.data);
      console.error("Error syncing Izu to API:", error);
      
      // Update sync data to record the failure
      if (!realm.isInTransaction) {
        realm.write(() => {
          const existingIzu = realm.objectForPrimaryKey(Izu, izu.id);
          if (existingIzu && existingIzu.sync_data) {
            existingIzu.sync_data.sync_status = false;
            existingIzu.sync_data.sync_reason = `Failed: ${
              error?.message || "Unknown error"
            }`;
            existingIzu.sync_data.sync_attempts =
              (typeof existingIzu.sync_data.sync_attempts === 'number' ? existingIzu.sync_data.sync_attempts : 0) + 1;
            existingIzu.sync_data.last_sync_attempt = new Date().toISOString();
          }
        });
      }
      
      console.error(`Failed to sync Izu ${izu.id}:`, error);
      // Continue with other records - this one will be tried again next sync
    }
  }
};
