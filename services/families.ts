import { Families } from "~/models/family/families";
import { FormField, IFamilies, SyncType } from "~/types";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { Realm } from "@realm/react";
import { useDataSync } from "./dataSync";
import { isOnline } from "./network";
import { useAuth } from "~/lib/hooks/useAuth";
import { useMemo } from "react";
import { Izu } from "~/models/izus/izu";
import { filterDataByUserId } from "./filterData";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { TFunction } from "i18next";

const { useQuery, useRealm } = RealmContext;

export async function fetchFamiliesFromRemote() {
  const res = await baseInstance.get<{
    families: IFamilies[];
  }>("/families");
  return {
    families: res.data.families || [],
  };
}
export function useGetFamilies(forceSync: boolean = false) {
  const realm = useRealm();
  const storedFamilies = useQuery(Families);
  const { user } = useAuth({});
  // Move these queries to the top level
  const allIzus = useQuery(Izu);
  // console.log("The allIzus: ", JSON.stringify(allIzus, null, 2));

  const { syncStatus, refresh } = useDataSync([
    {
      key: "families",
      fetchFn: fetchFamiliesFromRemote,
      model: Families,
      staleTime: 5 * 60 * 1000, // 5 minutes
      forceSync,
      transformData: (data: { families: IFamilies[] }) => {
        if (!data.families || data.families.length === 0) {
          console.log("No families data to transform");
          return [];
        }

        return data.families.map((fam) => ({
          ...fam,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          location: fam.location || {},
          meta: fam.meta || {},
        }));
      },
    },
  ]);

  // Apply user ID filtering first
  const userFilteredFamilies = useMemo(() => {
    if (!user || !user.id) return storedFamilies;
    return filterDataByUserId(storedFamilies, user.id);
  }, [storedFamilies, user]);

  // Filter families based on user's sector or cell and position
  const filteredFamilies = useMemo(() => {
    // If no user, return all families
    if (!user || !user.json) return userFilteredFamilies;

    const position = Number(user.position || user.json.position);
    console.log("User position: ", position);

    // If position is Cell Coordinator (7)
    if (position === 7 && (user.cell || user.json.cell)) {
      const userCell = user.cell || user.json.cell;
      // Filter IZUs at top level, then use filtered results here
      const relevantIzus = allIzus.filtered(
        "position IN {7, 8} AND location.cell = $0",
        userCell
      );

      const izucodes = relevantIzus.map((izu: Izu) => izu.izucode);
      // Filter families by these izucodes
      return userFilteredFamilies.filtered("izucode IN $0", izucodes);
    }

    // If position is Sector Coordinator (13)
    if (position === 13 && (user.sector || user.json.sector)) {
      const userSector = user.sector || user.json.sector;
      // Filter IZUs at top level, then use filtered results here
      const relevantIzus = allIzus.filtered(
        "position IN {7, 8} AND location.sector = $0",
        userSector
      );

      const izucodes = relevantIzus.map((izu: Izu) => izu.izucode);
      console.log("The izucodes: ", JSON.stringify(izucodes, null, 2));
      // Filter families by these izucodes
      return userFilteredFamilies.filtered("izucode IN $0", izucodes);
    }
    console.log("User izucode: ", user.user_code);
    // If position is Village Coordinator (8) and village is logged in izu's village check that the position matches and the village is the logged in izu's village
    if (
      position === 8 &&
      (user.village || user.json.village) &&
      user.user_code
    ) {
      const userVillage = user.village || user.json.village;
      // Filter IZUs at top level, then use filtered results here
      const relevantIzus = allIzus.filtered(
        "position = $0 AND location.village = $1 AND izucode = $2",
        position,
        userVillage,
        user.user_code
      );

      const izucodes = relevantIzus.map((izu: Izu) => izu.izucode);
      console.log("The izucodes: ", JSON.stringify(izucodes, null, 2));
      // Filter families by these izucodes
      return userFilteredFamilies.filtered("izucode IN $0", izucodes);
    }

    // Default return all families
    return userFilteredFamilies;
  }, [userFilteredFamilies, user, allIzus]);

  return {
    families: filteredFamilies,
    isLoading: syncStatus.families?.isLoading || false,
    error: syncStatus.families?.error || null,
    lastSyncTime: syncStatus.families?.lastSyncTime || null,
    refresh: () => refresh("families", forceSync),
  };
}

// Function to useGetAllLocallyCreatedFamilies
export function useGetAllLocallyCreatedFamilies() {
  const storedFamilies = useQuery(Families);

  return {
    locallyCreatedFamilies: storedFamilies.filter(
      (family) =>
        family.sync_data?.sync_status === true ||
        family.sync_data?.sync_status === false
    ),
    isLoading: false,
    error: null,
    lastSyncTime: null,
    refresh: () => {},
  };
}

function getNextAvailableId(realm: Realm): number {
  try {
    const families = realm.objects<Families>(Families);
    if (families.length > 0) {
      return Math.max(...families.map((f) => f.id)) + 1;
    }
    return 1; // Start with 1 if no records exist
  } catch (error) {
    console.log("Error getting next ID, using default:", error);
    return 1;
  }
}

function prepareMetaData(
  familyData: Record<string, any>,
  extraFields: FormField[] = []
) {
  // If field definitions are provided, use them to extract specific fields
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

          // Handle different field types
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

  // If no field definitions are provided, return the familyData as-is for meta
  // This preserves all form field answers just like survey submissions
  return familyData;
}

export const createFamilyWithMeta = (
  realm: Realm,
  familyData: Record<string, any>,
  extraFields: FormField[] = []
): Families => {
  try {
    // Prepare metadata
    const meta = familyData.meta || prepareMetaData(familyData, extraFields);
    // Generate or use provided ID
    const id =
      typeof familyData.id === "number"
        ? familyData.id
        : getNextAvailableId(realm);
    // console.log("Using ID:", id);

    // Prepare location object
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
      time_spent_filling_the_form:
        familyData.time_spent_filling_the_form || null,
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
      last_sync_attempt: new Date(),
      sync_type: SyncType.families,
      submitted_at: new Date(),
      created_by_user_id: familyData.user_id || null,
    };

    const family = {
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
    };

    let result;

    // Handle transaction
    const createFamilyInRealm = () => {
      console.log("Creating family in realm:", JSON.stringify(family, null, 2));
      return realm.create(Families, family, Realm.UpdateMode.Modified);
    };

    if (realm.isInTransaction) {
      result = createFamilyInRealm();
    } else {
      realm.write(() => {
        result = createFamilyInRealm();
      });
    }

    if (!result) {
      throw new Error("Failed to create family object");
    }
    return result;
  } catch (error) {
    console.log("Error creating family with meta:", error);
    throw error;
  }
};

function createTemporaryFamily(
  realm: Realm,
  familyData: Record<string, any>,
  extraFields: FormField[] = []
): Families {
  // We'll keep the same ID format but mark it as temporary
  const localId = getNextAvailableId(realm);

  // Add sync data marking this as needing to be synced
  const syncData = {
    sync_status: familyData.sync_data?.sync_status ?? false,
    sync_reason: "Created offline",
    sync_attempts: familyData.sync_data?.sync_attempts ?? 0,
    last_sync_attempt: familyData.sync_data?.last_sync_attempt ?? new Date(),
    sync_type: SyncType.families,
    submitted_at: familyData.sync_data?.submitted_at ?? new Date(),
    created_by_user_id: familyData.sync_data?.created_by_user_id || null,
  };
  // Create temporary family data with all fields
  const tempFamilyData = {
    ...familyData,
    id: localId,
    hh_id: null,
    sync_data: syncData,
  };

  return createFamilyWithMeta(realm, tempFamilyData, extraFields);
}

// Function to replace a temporary family with the official one from API
function replaceTemporaryFamily(
  realm: Realm,
  tempFamily: Families,
  apiData: Record<string, any>
): Families {
  // We'll update the existing record with API data, keeping the same local ID
  const updatedFamily = {
    ...apiData,
    id: tempFamily.id, // Keep the same local ID
    hh_id: apiData.hh_id, // Update hh_id from API
    izucode: apiData.izucode || null,
    sync_data: {
      sync_status: true,
      sync_reason: "Synced with server",
      sync_type: SyncType.families,
      sync_attempts:
        (tempFamily.sync_data?.sync_attempts
          ? Number(tempFamily.sync_data.sync_attempts)
          : 0) + 1,
      last_sync_attempt: new Date().toISOString(),
      submitted_at:
        tempFamily.sync_data?.submitted_at || new Date().toISOString(),
    },
  };

  return createFamilyWithMeta(realm, updatedFamily, []);
}

export const saveFamilyToAPI = (
  realm: Realm,
  familyData: Record<string, any>,
  apiUrl: string,
  t: TFunction,
  extraFields: FormField[] = []
): void => {
  try {
    console.log(
      "saveFamilyToAPI received data:",
      JSON.stringify(familyData, null, 2)
    );

    // Only check for duplicates if the form is under a module (has source_module_id)
    // AND source_module_id is not 22 (direct forms that can have multiple submissions)
    if (familyData.source_module_id && familyData.source_module_id !== 22) {
      const existingFamilies = realm.objects<Families>(Families);
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

    // Prepare location data
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

    // Prepare form data
    const formData = {
      time_spent_filling_the_form:
        familyData.time_spent_filling_the_form || null,
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

    // Prepare sync data
    const syncData = familyData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
      sync_type: SyncType.families,
      created_by_user_id: familyData.user_id || null,
    };

    const sanitizedFamilyData = {
      ...familyData,
      id: familyData.id || null,
      hh_id: null, // Always set hh_id to null for local records
      hh_head_fullname:
        familyData.hh_head_fullname ||
        familyData.head_of_household ||
        "Unknown",
      village_name: familyData.village_name || "Unknown",
      village_id: familyData.village_id || null,
      sync_data: syncData,
      form_data: formData,
      meta: prepareMetaData(familyData, extraFields),
      location,
    };

    const isConnected = isOnline();
    console.log("Network connection status:", isConnected);

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        Toast.show({
          type: "info",
          text1: t("Alerts.saving.family"),
          text2: t("Alerts.submitting.server"),
          position: "top",
          visibilityTime: 2000,
        });

        console.log("Attempting to send data to API");
        // Prepare data for API - flatten meta fields at the top level
        const apiData = {
          ...familyData,
          ...(sanitizedFamilyData.meta || {}),
          ...(sanitizedFamilyData.form_data || {}),
          meta: undefined, // Add this to ensure we can delete it safely
        };

        // Remove the meta object itself from the API data
        delete apiData.meta;

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
                  last_sync_attempt: new Date(),
                  submitted_at: new Date(),
                  created_by_user_id: familyData.user_id || null,
                  sync_type: SyncType.families,
                },
              };

              console.log(
                "Complete data for Realm:",
                JSON.stringify(completeData, null, 2)
              );

              try {
                createFamilyWithMeta(realm, completeData, extraFields);
                Toast.show({
                  type: "success",
                  text1: t("Alerts.success.title"),
                  text2: t("Alerts.success.family"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving to Realm:", error);
                Toast.show({
                  type: "error",
                  text1: t("Alerts.error.title"),
                  text2: t("Alerts.error.save_failed.local"),
                  position: "top",
                  visibilityTime: 4000,
                });
              }
            } else {
              // If API didn't return an ID, save locally
              console.log("API did not return an ID, saving locally");
              try {
                createTemporaryFamily(realm, sanitizedFamilyData, extraFields);
                Toast.show({
                  type: "info",
                  text1: t("Alerts.info.saved_locally"),
                  text2: t("Alerts.info.api_invalid"),
                  position: "top",
                  visibilityTime: 3000,
                });
                router.push("/(history)/history");
              } catch (error: any) {
                console.error("Error saving temporary family:", error);
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
            console.log("Error submitting family to API:", error);
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
              createTemporaryFamily(realm, sanitizedFamilyData, extraFields);
              Toast.show({
                type: "info",
                text1: t("Alerts.info.saved_locally"),
                text2: t("Alerts.submitting.offline"),
                position: "top",
                visibilityTime: 3000,
              });
              router.push("/(history)/history");
            } catch (error: any) {
              console.error("Error saving temporary family:", error);
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
      console.log("Offline mode - creating temporary family");
      // Offline mode - create with locally generated ID
      try {
        createTemporaryFamily(realm, sanitizedFamilyData, extraFields);
        Toast.show({
          type: "info",
          text1: t("Alerts.info.offline_mode"),
          text2: t("Alerts.info.will_sync"),
          position: "top",
          visibilityTime: 3000,
        });
        router.push("/(history)/history");
      } catch (error: any) {
        console.error("Error saving temporary family:", error);
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
    console.log("Error in saveFamilyToAPI:", error);
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

// Function to sync temporary families with the server
export const syncTemporaryFamilies = async (
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

  // Find all families that need syncing AND were created by the current user
  const familiesToSync = realm
    .objects<Families>(Families)
    .filtered(
      "sync_data.sync_status == false AND sync_data.created_by_user_id == $0",
      userId
    );

  if (familiesToSync.length === 0) {
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
  ``;
  let successCount = 0;
  let failureCount = 0;

  for (const family of familiesToSync) {
    try {
      // Extract data to send to API
      const locationData = family.location || {};

      // Prepare API data exactly like survey submissions and online submission
      const apiData = {
        hh_id: family.hh_id, // Will be null for unsynced records
        hh_head_fullname: family.hh_head_fullname,
        izucode: family.izucode || null,
        village_name: family.village_name,
        village_id: family.village_id,
        province: locationData.province || 0,
        district: locationData.district || 0,
        sector: locationData.sector || 0,
        cell: locationData.cell || 0,
        village: locationData.village || 0,
        ...family.form_data,
        ...family.meta,
      };

      console.log("Syncing family to API:", JSON.stringify(apiData, null, 2));
      console.log("API URL:", apiUrl);
      // Submit to API
      const response = await baseInstance.post(apiUrl, apiData);

      if (response.data?.result?.id) {
        // Update the record with API data
        replaceTemporaryFamily(realm, family, {
          ...apiData,
          id: response.data.result.id, // Update local ID
          hh_id: response.data.result.hh_id, // Update hh_id from API
          izucode: response.data.result.izucode || null,
          ...response.data.result,
          sync_data: {
            sync_status: true,
            sync_reason: "Successfully synced",
            sync_type: SyncType.families,
            sync_attempts: 1,
            last_sync_attempt: new Date(),
            submitted_at: new Date(),
          },
        });
        console.log(
          `Successfully synced family ${family.id} to server, updated with hh_id: ${response.data.result.hh_id}`
        );
        successCount++;
      }
    } catch (error: any) {
      failureCount++;
      // Update sync data to record the failure
      realm.write(() => {
        if (family.sync_data) {
          family.sync_data.sync_status = false;
          family.sync_data.sync_type = SyncType.families;
          family.sync_data.sync_reason = `Failed: ${
            error?.message || "Unknown error"
          }`;
          family.sync_data.sync_attempts =
            Number(family.sync_data.sync_attempts || 0) + 1;
          family.sync_data.last_sync_attempt = new Date().toISOString();
          family.sync_data.submitted_at = new Date().toISOString();
        }
      });
      console.log(`Failed to sync family ${family.id}:`, error);
      // Continue with other records - this one will be tried again next sync
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
