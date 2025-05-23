import { Families } from "~/models/family/families";
import { FormField, IFamilies } from "~/types";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { Realm } from "@realm/react";
import { useDataSync } from "./dataSync";
import { isOnline } from "./network";
import { useAuth } from "~/lib/hooks/useAuth";
import { useMemo } from "react";
import { Izu } from "~/models/izus/izu";
import { filterDataByUserId } from "./filterData";

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
  if (extraFields.length === 0) return {};

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

export const createFamilyWithMeta = (
  realm: Realm,
  familyData: Record<string, any>,
  extraFields: FormField[] = []
): Families => {
  try {
    // Prepare metadata
    const meta = familyData.meta || prepareMetaData(familyData, extraFields);
    console.log("Formatted meta:", meta);

    // Generate or use provided ID
    const id =
      typeof familyData.id === "number"
        ? familyData.id
        : getNextAvailableId(realm);
    console.log("Using ID:", id);

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
      cohort: familyData.cohort || null,
      form_status: familyData.form_status || null,
    };

    const syncData = familyData.sync_data || {
      sync_status: false,
      sync_reason: "New record",
      sync_attempts: 0,
      last_sync_attempt: new Date(),
      submitted_at: new Date(),
      created_by_user_id: familyData.user_id || null,
    };

    const family = {
      id,
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

    console.log("Creating family with data:", JSON.stringify(family, null, 2));

    let result;
    realm.write(() => {
      result = realm.create("Families", family, Realm.UpdateMode.Modified);
    });
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
    sync_status: false,
    sync_reason: "Created offline",
    sync_attempts: 0,
    last_sync_attempt: new Date(),
    submitted_at: new Date(),
  };

  return createFamilyWithMeta(
    realm,
    {
      ...familyData,
      id: localId,
      hh_id: null,
      sync_data: syncData,
    },
    extraFields
  );
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

export const saveFamilyToAPI = async (
  realm: Realm,
  familyData: Record<string, any>,
  apiUrl: string,
  extraFields: FormField[] = []
): Promise<Families> => {
  try {
    console.log(
      "saveFamilyToAPI received data:",
      JSON.stringify(familyData, null, 2)
    );

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

    // Format family data
    const sanitizedFamilyData = {
      ...familyData,
      hh_id: null, // Always set hh_id to null for local records
      hh_head_fullname:
        familyData.hh_head_fullname ||
        familyData.head_of_household ||
        "Unknown",
      village_name: familyData.village_name || "Unknown",
      village_id: familyData.village_id || null,
      meta: familyData.meta || prepareMetaData(familyData, extraFields),
      location,
      izucode: familyData.izucode || null,
      form_data: {
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
        cohort: familyData.cohort || null,
      },
      sync_data: {
        sync_status: false,
        sync_reason: "New record",
        sync_attempts: 0,
        last_sync_attempt: new Date(),
        submitted_at: new Date(),
      },
    };

    const isConnected = isOnline();

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        // Prepare data for API - flatten meta fields at the top level
        const apiData = {
          ...familyData,
          ...(sanitizedFamilyData.meta || {}),
          ...(sanitizedFamilyData.form_data || {}),
        };

        // Remove the meta object itself from the API data
        if (apiData.meta) {
          delete apiData.meta;
        }

        // Send to API
        const response = await baseInstance.post(apiUrl, apiData);
        console.log(
          "Family API submission response:",
          JSON.stringify(response.data, null, 2)
        );

        // Create the family object with the API data but keep local ID
        if (response.data?.result?.id) {
          const completeData = {
            ...sanitizedFamilyData,
            id: response.data.result.id, // Keep local ID if exists
            hh_id: response.data.result.hh_id, // Update hh_id from API
            izucode: response.data.result.izucode || null,
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

          return createFamilyWithMeta(realm, completeData, []);
        } else {
          // If API didn't return an ID, create with locally generated ID
          return createFamilyWithMeta(realm, sanitizedFamilyData, []);
        }
      } catch (apiError) {
        console.log("Error submitting family to API:", apiError);
        // Fall back to offline approach if API submission fails
        return createTemporaryFamily(realm, sanitizedFamilyData, extraFields);
      }
    } else {
      // Offline mode - create with locally generated ID
      // These will be marked for sync later
      console.log("Offline mode - creating temporary family record");
      return createTemporaryFamily(realm, sanitizedFamilyData, extraFields);
    }
  } catch (error) {
    console.log("Error in saveFamilyToAPI:", error);
    throw error;
  }
};

// Function to sync temporary families with the server
export const syncTemporaryFamilies = async (
  realm: Realm,
  apiUrl: string,
  userId?: number
): Promise<void> => {
  if (!isOnline()) {
    console.log("Cannot sync temporary families - offline");
    return;
  }

  if (!userId) {
    console.log("No user ID provided, cannot sync");
    return;
  }

  // Find all families that need syncing AND were created by the current user
  const familiesToSync = realm
    .objects<Families>(Families)
    .filtered(
      "sync_data.sync_status == false AND sync_data.created_by_user_id == $0",
      userId
    );

  console.log(`Found ${familiesToSync.length} families to sync for current user`);

  for (const family of familiesToSync) {
    try {
      // Extract data to send to API
      const locationData = family.location || {};

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
            sync_attempts: 1,
            last_sync_attempt: new Date(),
            submitted_at: new Date(),
          },
        });
        console.log(
          `Successfully synced family ${family.id} to server, updated with hh_id: ${response.data.result.hh_id}`
        );
      }
    } catch (error: any) {
      // Update sync data to record the failure
      realm.write(() => {
        if (family.sync_data) {
          family.sync_data.sync_status = false;
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
};
