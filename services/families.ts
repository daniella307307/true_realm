import { useMemo } from "react";

import { Families } from "~/models/family/families";
import { FormField, I2BaseFormat, I4BaseFormat, IFamilies } from "~/types";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { Realm } from "@realm/react";
import { useDataSync } from "./dataSync";
import { isOnline } from "./network";

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
  const storedFamilies = useQuery(Families);

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
          location: JSON.stringify(fam.location),
          meta: fam.meta || {},
        }));
      },
    },
  ]);

  return {
    families: storedFamilies,
    isLoading: syncStatus.families?.isLoading || false,
    error: syncStatus.families?.error || null,
    lastSyncTime: syncStatus.families?.lastSyncTime || null,
    refresh: () => refresh("families", forceSync),
  };
}

// Function to get the next available ID from the Realm database
function getNextAvailableId(realm: Realm): number {
  try {
    const families = realm.objects<Families>(Families);
    if (families.length > 0) {
      // Find the maximum existing ID and add 1
      return Math.max(...families.map((f) => f.id)) + 1;
    }
    return 1; // Start with 1 if no records exist
  } catch (error) {
    console.log("Error getting next ID, using default:", error);
    return 1;
  }
}

// Function to prepare metadata from form fields
function prepareMetaData(
  familyData: Record<string, any>,
  extraFields: FormField[] = []
) {
  if (extraFields.length === 0) return {};

  return Object.fromEntries(
    extraFields
      .filter((field) => field.key && familyData[field.key] !== undefined && field.key !== "submit")
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

    const family = {
      id,
      hh_id: familyData.hh_id, // No default, allow null for unsynchronized records
      hh_head_fullname: familyData.hh_head_fullname || "Unknown",
      village_name: familyData.village_name || "Unknown",
      cohort: String(familyData.cohort || ""),
      created_at: familyData.created_at || new Date().toISOString(),
      updated_at: familyData.updated_at || new Date().toISOString(),
      location:
        typeof familyData.location === "string"
          ? familyData.location
          : JSON.stringify({
              province: familyData.province,
              district: familyData.district,
              sector: familyData.sector,
              cell: familyData.cell,
              village: familyData.village,
            }),
      meta,
      is_temporary: familyData.is_temporary || false,
    };

    console.log("Creating family with data:", JSON.stringify(family, null, 2));

    let result;
    realm.write(() => {
      result = realm.create<Families>(
        Families,
        family,
        Realm.UpdateMode.Modified
      );
    });

    if (!result) {
      throw new Error("Failed to create family object");
    }

    return result;
  } catch (error) {
    console.error("Error creating family with meta:", error);
    throw error;
  }
};

// Function to handle creating a temporary family for offline mode
function createTemporaryFamily(
  realm: Realm,
  familyData: Record<string, any>,
  extraFields: FormField[] = []
): Families {
  // Generate a local positive ID for temporary records
  // We'll keep the same ID format but mark it as temporary
  const localId = getNextAvailableId(realm);

  return createFamilyWithMeta(
    realm,
    { ...familyData, id: localId, is_temporary: true, hh_id: null },
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
    hh_id: apiData.hh_id, // Update with the hh_id from API
    is_temporary: false, // No longer temporary
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

    // Format family data
    const sanitizedFamilyData = {
      ...familyData,
      hh_id: null, // Always set hh_id to null for local records
      hh_head_fullname:
        familyData.hh_head_fullname ||
        familyData.head_of_household ||
        "Unknown",
      village_name: familyData.village_name || "Unknown",
      cohort: String(familyData.cohort || ""),
      meta: familyData.meta || prepareMetaData(familyData, extraFields),
    };

    const isConnected = isOnline();

    // If we're online, try to submit to API first
    if (isConnected) {
      try {
        // Prepare data for API - flatten meta fields at the top level
        const apiData = {
          ...familyData,
          ...(sanitizedFamilyData.meta || {}),
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
            id: familyData.id || getNextAvailableId(realm), // Keep local ID if exists
            hh_id: response.data.result.hh_id, // Update hh_id from API
            is_temporary: false,
            // Include any other fields returned from the API
            ...response.data.result,
          };

          return createFamilyWithMeta(realm, completeData, []);
        } else {
          // If API didn't return an ID, create with locally generated ID
          return createFamilyWithMeta(realm, sanitizedFamilyData, []);
        }
      } catch (apiError) {
        console.error("Error submitting family to API:", apiError);
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
    console.error("Error in saveFamilyToAPI:", error);
    throw error;
  }
};

// Function to sync temporary families with the server
export const syncTemporaryFamilies = async (
  realm: Realm,
  apiUrl: string
): Promise<void> => {
  if (!isOnline()) {
    console.log("Cannot sync temporary families - offline");
    return;
  }

  // Find all temporary families (those marked with is_temporary flag)
  const tempFamilies = realm.objects<Families>(Families).filtered("is_temporary == true");

  for (const family of tempFamilies) {
    try {
      // Extract data to send to API
      const apiData = {
        hh_id: family.hh_id, // Will be null for unsynced records
        hh_head_fullname: family.hh_head_fullname,
        village_name: family.village_name,
        cohort: family.cohort,
        location: family.location ? JSON.parse(family.location) : null,
        ...family.meta, // Spread meta fields to top level
      };

      // Submit to API
      const response = await baseInstance.post(apiUrl, apiData);

      if (response.data?.result?.id) {
        // Update the temporary record with API data (especially hh_id)
        replaceTemporaryFamily(realm, family, {
          ...apiData,
          id: family.id, // Keep the same local ID
          hh_id: response.data.result.hh_id, // Update hh_id from API
          ...response.data.result,
        });
        console.log(
          `Successfully synced temporary family ${family.id} to server, updated with hh_id: ${response.data.result.hh_id}`
        );
      }
    } catch (error) {
      console.error(`Failed to sync temporary family ${family.id}:`, error);
      // Continue with other records - this one will be tried again next sync
    }
  }
};
