import { useEffect, useMemo } from "react";
import { Realm } from "@realm/react";
import provincesData from "~/mocks/provinces.json";
import districtsData from "~/mocks/districts.json";
import sectorsData from "~/mocks/sectors.json";
import cellsData from "~/mocks/cells.json";
import villagesData from "~/mocks/villages.json";
import { Province } from "~/models/locations/province";
import { District } from "~/models/locations/district";
import { Sector } from "~/models/locations/sector";
import { Cell } from "~/models/locations/cell";
import { Village } from "~/models/locations/village";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useQuery as useReactQuery } from "@tanstack/react-query";

const { useRealm, useQuery: useQueryRealm } = RealmContext;

/**
 * Common logic for initializing location data
 */
const useInitLocationData = <T extends Realm.Object>(
  realmCollection: Realm.Results<T>,
  mockData: any[],
  schemaName: string
) => {
  const realm = useRealm();

  useEffect(() => {
    if (realmCollection.length === 0) {
      realm.write(() => {
        mockData.forEach((item) => {
          // Ensure all IDs are stored as strings to avoid type mismatches
          const itemWithStringId = {
            ...item,
            id: item.id.toString(),
          };
          realm.create(
            schemaName as any,
            itemWithStringId,
            Realm.UpdateMode.Modified
          );
        });
      });
    }
  }, [realm, realmCollection, mockData, schemaName]);

  return {
    data: realmCollection,
    isInitialized: realmCollection.length > 0,
  };
};

/**
 * Flexible query helper that tries both string and numeric ID comparisons
 */
const getEntityById = <T extends Realm.Object>(
  realm: Realm,
  schema: string,
  id: string | number
): T | null => {
  if (id === undefined || id === null) return null;

  const idStr = id.toString();
  const idNum = typeof id === "string" ? parseInt(id, 10) : id;

  // Try string comparison first (preferred)
  const resultsStr = realm.objects<T>(schema).filtered("id == $0", idStr);

  // If not found, try numeric comparison
  const resultsNum =
    resultsStr.length === 0
      ? realm.objects<T>(schema).filtered("id == $0", idNum)
      : null;

  return resultsStr.length > 0
    ? resultsStr[0]
    : resultsNum && resultsNum.length > 0
    ? resultsNum[0]
    : null;
};

export function useGetProvinces() {
  const realm = useRealm();
  const storedProvinces = useQueryRealm(Province);

  const { isInitialized } = useInitLocationData(
    storedProvinces,
    provincesData,
    "Province"
  );

  return {
    data: storedProvinces,
    isLoading: !isInitialized,
    getById: (id: string | number) =>
      getEntityById<Province>(realm, "Province", id),
  };
}

export function useGetDistricts(provinceId?: string) {
  const realm = useRealm();
  const storedDistricts = useQueryRealm(District);

  const { isInitialized } = useInitLocationData(
    storedDistricts,
    districtsData,
    "District"
  );

  const filteredDistricts = useMemo(
    () =>
      provinceId
        ? storedDistricts.filtered("province_id == $0", provinceId)
        : storedDistricts,
    [provinceId, storedDistricts]
  );

  return {
    data: filteredDistricts,
    isLoading: !isInitialized,
    getById: (id: string | number) =>
      getEntityById<District>(realm, "District", id),
  };
}

export function useGetSectors(districtId?: string) {
  const realm = useRealm();
  const storedSectors = useQueryRealm(Sector);

  const { isInitialized } = useInitLocationData(
    storedSectors,
    sectorsData,
    "Sector"
  );

  const filteredSectors = useMemo(
    () =>
      districtId
        ? storedSectors.filtered("district_id == $0", districtId)
        : storedSectors,
    [districtId, storedSectors]
  );

  return {
    data: filteredSectors,
    isLoading: !isInitialized,
    getById: (id: string | number) =>
      getEntityById<Sector>(realm, "Sector", id),
  };
}

export function useGetCells(sectorId?: string) {
  const realm = useRealm();
  const storedCells = useQueryRealm(Cell);

  const { isInitialized } = useInitLocationData(storedCells, cellsData, "Cell");

  const filteredCells = useMemo(
    () =>
      sectorId
        ? storedCells.filtered("sector_id == $0", sectorId)
        : storedCells,
    [sectorId, storedCells]
  );

  return {
    data: filteredCells,
    isLoading: !isInitialized,
    getById: (id: string | number) => getEntityById<Cell>(realm, "Cell", id),
  };
}

export function useGetVillages(cellId?: string) {
  const realm = useRealm();
  const storedVillages = useQueryRealm(Village);

  const { isInitialized } = useInitLocationData(
    storedVillages,
    villagesData,
    "Village"
  );

  const filteredVillages = useMemo(
    () =>
      cellId
        ? storedVillages.filtered("cells_id == $0", cellId)
        : storedVillages,
    [cellId, storedVillages]
  );

  return {
    data: filteredVillages,
    isLoading: !isInitialized,
    getById: (id: string | number) =>
      getEntityById<Village>(realm, "Village", id),
  };
}

/**
 * A unified hook for retrieving location data by ID
 * Useful for the Settings screen where we have IDs but need to display names
 */
export function useGetLocationById() {
  const realm = useRealm();

  // Initialize all location data
  const { isLoading: isLoadingProvinces } = useGetProvinces();
  const { isLoading: isLoadingDistricts } = useGetDistricts();
  const { isLoading: isLoadingSectors } = useGetSectors();
  const { isLoading: isLoadingCells } = useGetCells();
  const { isLoading: isLoadingVillages } = useGetVillages();

  const isLoading =
    isLoadingProvinces ||
    isLoadingDistricts ||
    isLoadingSectors ||
    isLoadingCells ||
    isLoadingVillages;

  return {
    isLoading,
    getProvince: (id: string | number) =>
      getEntityById<Province>(realm, "Province", id),
    getDistrict: (id: string | number) =>
      getEntityById<District>(realm, "District", id),
    getSector: (id: string | number) =>
      getEntityById<Sector>(realm, "Sector", id),
    getCell: (id: string | number) => getEntityById<Cell>(realm, "Cell", id),
    getVillage: (id: string | number) =>
      getEntityById<Village>(realm, "Village", id),
  };
}

/**
 * A unified hook that provides all location data with optimized loading states
 * and data access patterns.
 */
export function useLocalLocation() {
  const {
    data: provinces,
    isLoading: isLoadingProvinces,
    getById: getProvinceById,
  } = useGetProvinces();

  return {
    provinces: {
      data: provinces,
      isLoading: isLoadingProvinces,
      getById: getProvinceById,
    },
    districts: {
      getForProvince: (provinceId: string) => {
        const { data, isLoading, getById } = useGetDistricts(provinceId);
        return { data, isLoading, getById };
      },
      getById: (id: string | number) => {
        const realm = useRealm();
        return getEntityById<District>(realm, "District", id);
      },
    },
    sectors: {
      getForDistrict: (districtId: string) => {
        const { data, isLoading, getById } = useGetSectors(districtId);
        return { data, isLoading, getById };
      },
      getById: (id: string | number) => {
        const realm = useRealm();
        return getEntityById<Sector>(realm, "Sector", id);
      },
    },
    cells: {
      getForSector: (sectorId: string) => {
        const { data, isLoading, getById } = useGetCells(sectorId);
        return { data, isLoading, getById };
      },
      getById: (id: string | number) => {
        const realm = useRealm();
        return getEntityById<Cell>(realm, "Cell", id);
      },
    },
    villages: {
      getForCell: (cellId: string) => {
        const { data, isLoading, getById } = useGetVillages(cellId);
        return { data, isLoading, getById };
      },
      getById: (id: string | number) => {
        const realm = useRealm();
        return getEntityById<Village>(realm, "Village", id);
      },
    },
  };
}

interface ILocationDerivedByVillageId {
  province: {
    id: number;
    province_name: string;
  };
  district: {
    id: number;
    district_name: string;
  };
  sector: {
    id: number;
    sector_name: string;
  };
  cell: {
    id: number;
    cell_name: string;
  };
  village: {
    id: number;
    village_name: string;
  };
}

const fetchLocationVillageById = async (
  villageId: string
): Promise<ILocationDerivedByVillageId> => {
  const response = await baseInstance.get(`/locations/village/${villageId}`);
  return response.data;
};

export function useGetLocationByVillageId(
  villageId: string,
  forceSync: boolean = false
) {
  const { data, isLoading, error } = useReactQuery({
    queryKey: ["location-village", villageId],
    queryFn: () => fetchLocationVillageById(villageId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: forceSync ? false : 5 * 60 * 1000,
  });

  return { data, isLoading, error };
}
