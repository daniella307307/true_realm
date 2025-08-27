import { useMemo } from "react";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useDataSync } from "./dataSync";
import { FormField, Izus, SyncType } from "~/types";
import { Izu } from "~/models/izus/izu";
import { isOnline } from "./network";
import { useAuth } from "~/lib/hooks/useAuth";
import { filterDataByUserId } from "./filterData";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

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
  const { user } = useAuth({});
  const { t } = useTranslation();

  // Filter IZUs by current user first
  const userFilteredIzus = useMemo(() => {
    if (!user || !user.id) return storedIzus;
    return filterDataByUserId(storedIzus, user.id);
  }, [storedIzus, user]);

  // console.log("storedIzus", JSON.stringify(storedIzus, null, 2));
  const loggedInIzu = useMemo(() => {
    return userFilteredIzus.find((izu) => izu.id === user?.json?.id);
  }, [userFilteredIzus, user]);

  // console.log("loggedInIzu", JSON.stringify(loggedInIzu, null, 2));
  // Filter izus based on logged in user's position
  const filteredIzus = useMemo(() => {
    // If no logged in Izu or no position, return all izus
    if (!loggedInIzu) return userFilteredIzus;

    const position = loggedInIzu.position;

    if (position === undefined) return userFilteredIzus;

    if (position === 7 && loggedInIzu.location?.cell) {
      return userFilteredIzus.filtered(
        "position IN {7, 8} AND location.cell = $0",
        loggedInIzu.location.cell
      );
    }

    if (position === 13 && loggedInIzu.location?.sector) {
      return userFilteredIzus.filtered(
        "position IN {7, 8} AND location.sector = $0",
        loggedInIzu.location.sector
      );
    }

    // if position is 8 means village, return that the izu that has that position equals and that village is the logged in izu's village
    if (
      position === 8 &&
      loggedInIzu.location?.village &&
      loggedInIzu.izucode
    ) {
      return userFilteredIzus.filtered(
        "position = $0 AND location.village = $1 AND izucode = $2",
        position,
        loggedInIzu.location.village,
        loggedInIzu.izucode
      );
    }
  }, [userFilteredIzus, loggedInIzu]);

  const { syncStatus, refresh } = useDataSync([
    {
      key: "izus",
      fetchFn: fetchIzusFromRemote,
      model: Izu,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
    },
  ]);

  // console.log("Filtered Izus:", JSON.stringify(filteredIzus?.length, null, 2));
  return {
    izus: filteredIzus,
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
    return izus?.find((izu) => izu.id === id);
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
      const maxId = Math.max(...izus.map((i) => i.id));
      console.log("Generated next ID:", maxId + 1);
      return maxId + 1;
    }
    console.log("No existing Izus, starting with ID 1");
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
  if (extraFields.length === 0) {
    console.log("No extra fields provided, returning empty object");
    return {};
  }

  const result = Object.fromEntries(
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
  return result;
}

export const createIzuWithMeta = (
  realm: Realm,
  izuData: Record<string, any>,
  extraFields: FormField[] = []
): Izu => {
  try {
    const id = getNextAvailableId(realm);
    const meta = prepareMetaData(izuData, extraFields);

    // Ensure position is a number
    const position =
      typeof izuData.position === "string"
        ? parseInt(izuData.position, 10)
        : izuData.position || 0;

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
      cohorts: izuData.cohorts || null,
    };

    const syncData = izuData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
      created_by_user_id: izuData.user_id || null,
      sync_type: SyncType.izus,
    };

    const izu = {
      id,
      name: izuData.name,
      izucode: izuData.izucode,
      villages_id: izuData.villages_id,
      position,
      meta,
      form_data: formData,
      location: izuData.location,
      sync_data: syncData,
    };

    let result;

    // Handle transaction
    const createIzuInRealm = () => {
      return realm.create(Izu, izu, Realm.UpdateMode.Modified);
    };

    if (realm.isInTransaction) {
      result = createIzuInRealm();
    } else {
      realm.write(() => {
        result = createIzuInRealm();
      });
    }

    if (!result) {
      throw new Error("Failed to create IZU object");
    }

    return result;
  } catch (error) {
    console.log("Error creating IZU with meta:", error);
    console.log(
      "Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
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
    sync_status: izuData.sync_data?.sync_status ?? false,
    sync_reason: "Created offline",
    sync_attempts: izuData.sync_data?.sync_attempts ?? 0,
    last_sync_attempt: izuData.sync_data?.last_sync_attempt ?? new Date(),
    submitted_at: izuData.sync_data?.submitted_at ?? new Date(),
    sync_type: SyncType.izus,
    created_by_user_id: izuData.sync_data?.created_by_user_id || null,
  };

  let izu: Izu;

  if (realm.isInTransaction) {
    izu = createIzuWithMeta(
      realm,
      {
        ...izuData,
        id: localId,
        sync_data: syncData,
      },
      extraFields
    );
  } else {
    realm.write(() => {
      izu = createIzuWithMeta(
        realm,
        {
          ...izuData,
          id: localId,
          sync_data: syncData,
        },
        extraFields
      );
    });
  }
  return izu!;
}

export const saveIzuToAPI = (
  realm: Realm,
  izuData: Record<string, any>,
  apiUrl: string,
  t: TFunction,
  extraFields: FormField[] = []
): void => {
  try {
    console.log(
      "saveIzuToAPI received data:",
      JSON.stringify(izuData, null, 2)
    );

    if (izuData.source_module_id && izuData.source_module_id !== 22) {
      const existingIzus = realm.objects<Izu>(Izu);
      const isDuplicate = existingIzus.some(
        (izu) =>
          izu.name === izuData.name &&
          izu.izucode === izuData.izucode &&
          izu.villages_id === izuData.villages_id
      );

      if (isDuplicate) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.duplicate.izu"),
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }
    }
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

    console.log("Prepared location data:", JSON.stringify(location, null, 2));

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
      created_by_user_id: izuData.user_id || null,
      sync_type: SyncType.izus,
    };

    const sanitizedIzuData = {
      ...izuData,
      id: izuData.id || null,
      position: izuData.position || 0,
      sync_data: syncData,
      form_data: formData,
      meta: prepareMetaData(izuData, extraFields),
      location,
    };

    const isConnected = isOnline();
    console.log("Network connection status:", isConnected);

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        Toast.show({
          type: "info",
          text1: t("Alerts.saving.izu"),
          text2: t("Alerts.submitting.server"),
          position: "top",
          visibilityTime: 2000,
        });

        console.log("Attempting to send data to API");
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

        console.log(
          "Data being sent to API:",
          JSON.stringify(apiData, null, 2)
        );

        // Send to API
        baseInstance
          .post(apiUrl, apiData)
          .then((response) => {
            if (response.data?.result?.id) {
              console.log("API returned ID:", response.data.result.id);
              console.log(
                "API returned position:",
                response.data.result.position,
                "Type:",
                typeof response.data.result.position
              );

              // Ensure position is handled correctly
              const apiPosition = response.data.result.position;
              const parsedPosition =
                typeof apiPosition === "string"
                  ? parseInt(apiPosition, 10)
                  : apiPosition;

              console.log(
                "Parsed position:",
                parsedPosition,
                "Type:",
                typeof parsedPosition
              );

              const completeData = {
                ...sanitizedIzuData,
                id: response.data.result.id,
                izucode: response.data.result.izucode,
                position: parsedPosition,
                ...response.data.result,
                sync_data: {
                  sync_status: true,
                  sync_reason: "Successfully synced",
                  sync_attempts: 1,
                  last_sync_attempt: new Date(),
                  submitted_at: new Date(),
                  created_by_user_id: izuData.user_id || null,
                  sync_type: SyncType.izus,
                },
              };

              console.log(
                "Complete data for Realm:",
                JSON.stringify(completeData, null, 2)
              );

              try {
                createIzuWithMeta(realm, completeData, extraFields);
                Toast.show({
                  type: "success",
                  text1: t("Alerts.success.title"),
                  text2: t("Alerts.success.izu"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving to Realm:", error);
                Toast.show({
                  type: "error",
                  text1: t("Alerts.error.title"),
                  text2: t("Alerts.error.save_failed.after_success"),
                  position: "top",
                  visibilityTime: 4000,
                });
              }
            } else {
              // If API didn't return an ID, save locally
              console.log("API did not return an ID, saving locally");
              try {
                createTemporaryIzu(realm, sanitizedIzuData, extraFields);
                Toast.show({
                  type: "info",
                  text1: t("Alerts.info.saved_locally"),
                  text2: t("Alerts.info.api_invalid"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving temporary IZU:", error);
                Toast.show({
                  type: "error",
                  text1: t("Alerts.error.title"),
                  text2: t("Alerts.error.save_failed.local"),
                  position: "top",
                  visibilityTime: 4000,
                });
              }
            }
          })
          .catch((error) => {
            console.log("Error submitting Izu to API:", error);
            console.log("Error response:", error.response?.data);
            console.log(
              "Error details:",
              JSON.stringify(error, Object.getOwnPropertyNames(error))
            );

            Toast.show({
              type: "error",
              text1: t("Alerts.error.title"),
              text2: t("Alerts.error.save_failed.server"),
              position: "top",
              visibilityTime: 4000,
            });

            // Fall back to offline approach if API submission fails
            try {
              createTemporaryIzu(realm, sanitizedIzuData, extraFields);
              Toast.show({
                type: "info",
                text1: t("Alerts.info.saved_locally"),
                text2: t("Alerts.submitting.offline"),
                position: "top",
                visibilityTime: 3000,
              });
              router.push("/(history)/history");
            } catch (error: any) {
              console.error("Error saving temporary IZU:", error);
              Toast.show({
                type: "error",
                text1: t("Alerts.error.title"),
                text2: t("Alerts.error.save_failed.local"),
                position: "top",
                visibilityTime: 4000,
              });
            }
          });
      } catch (error: any) {
        console.error("Error in API submission block:", error);
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.submission.process"),
          position: "top",
          visibilityTime: 4000,
        });
      }
    } else {
      // Offline mode - create with locally generated ID
      try {
        createTemporaryIzu(realm, sanitizedIzuData, extraFields);
        Toast.show({
          type: "info",
          text1: t("Alerts.info.saved_locally"),
          text2: t("Alerts.submitting.offline"),
          position: "top",
          visibilityTime: 3000,
        });
        router.push("/(history)/history");
      } catch (error: any) {
        console.error("Error saving temporary IZU:", error);
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: t("Alerts.error.save_failed.local"),
          position: "top",
          visibilityTime: 4000,
        });
      }
    }
  } catch (error: any) {
    console.log("Error in saveIzuToAPI:", error);
    console.log(
      "Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );

    Toast.show({
      type: "error",
      text1: t("Alerts.error.title"),
      text2: t("Alerts.error.submission.unexpected"),
      position: "top",
      visibilityTime: 4000,
    });
  }
};

export const syncTemporaryIzus = async (
  realm: Realm,
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
      autoHide: true,
      topOffset: 50,
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
      autoHide: true,
      topOffset: 50,
    });
    return;
  }

  // Find all Izus that need syncing AND were created by the current user
  const izusToSync = realm
    .objects<Izu>(Izu)
    .filtered(
      "sync_data.sync_status == false AND sync_data.created_by_user_id == $0",
      userId
    );

  console.log(`Found ${izusToSync.length} Izus to sync for current user`);

  if (izusToSync.length === 0) {
    Toast.show({
      type: "info",
      text1: t("Alerts.info.title"),
      text2: t("Alerts.info.no_pending"),
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (const izu of izusToSync) {
    try {
      // Extract data to send to API
      const locationData = izu.location || {};

      const apiData = {
        id: izu.id,
        izucode: izu.izucode,
        name: izu.name,
        villages_id: izu.villages_id,
        ...locationData,
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
          id: response.data.result.id,
          izucode: response.data.result.izucode,
          position:
            typeof response.data.result.position === "string"
              ? parseInt(response.data.result.position, 10)
              : response.data.result.position,
          ...response.data.result,
          sync_data: {
            sync_status: true,
            sync_reason: "Successfully synced",
            sync_attempts:
              (typeof izu.sync_data?.sync_attempts === "number"
                ? izu.sync_data.sync_attempts
                : 0) + 1,
            last_sync_attempt: new Date().toISOString(),
            sync_type: SyncType.izus,
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

              if (updatedData.izucode) {
                existingIzu.izucode = updatedData.izucode;
              }

              if (updatedData.villages_id) {
                existingIzu.villages_id = updatedData.villages_id;
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
          `Successfully synced Izu ${izu.id} to server, updated with server id: ${response.data.result.id}`,
          izu
        );
        successCount++;
      }
    } catch (error: any) {
      failureCount++;
      console.error("Error syncing Izu to API:", error);
      // Update sync data to record the failure
      if (!realm.isInTransaction) {
        realm.write(() => {
          if (izu.sync_data) {
            izu.sync_data.sync_status = false;
            izu.sync_data.sync_type = SyncType.izus;
            izu.sync_data.sync_reason = `Failed: ${
              error?.message || "Unknown error"
            }`;
            izu.sync_data.sync_attempts =
              (typeof izu.sync_data.sync_attempts === "number"
                ? izu.sync_data.sync_attempts
                : 0) + 1;
            izu.sync_data.last_sync_attempt = new Date().toISOString();
          }
        });
      }
    }
  }

  // Show final status toast
  if (successCount > 0 && failureCount === 0) {
    Toast.show({
      type: "success",
      text1: t("Alerts.success.title"),
      text2: t("Alerts.success.sync").replace(
        "{count}",
        successCount.toString()
      ),
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
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
      autoHide: true,
      topOffset: 50,
    });
  } else if (failureCount > 0) {
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title"),
      text2: t("Alerts.error.sync.failed").replace(
        "{count}",
        failureCount.toString()
      ),
      position: "top",
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
  }
};
