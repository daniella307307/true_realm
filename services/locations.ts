import { useEffect, useMemo } from "react";
import { Realm } from "@realm/react";
import provincesData from "~/mocks/provinces.json";
import districtsData from "~/mocks/districts.json";
import sectorsData from "~/mocks/sectors.json";
import cellsData from "~/mocks/cells.json";
import villagesData from "~/mocks/villages.json";
import { Province, IProvince } from "~/models/locations/province";
import { District, IDistrict } from "~/models/locations/district";
import { Sector, ISector } from "~/models/locations/sector";
import { Cell, ICell } from "~/models/locations/cell";
import { Village, IVillage } from "~/models/locations/village";
import { RealmContext } from "~/providers/RealContextProvider";
const { useRealm, useQuery } = RealmContext;

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
          realm.create(schemaName as any, item, Realm.UpdateMode.Modified);
        });
      });
    }
  }, [realm, realmCollection, mockData, schemaName]);
  
  return {
    data: realmCollection,
    isInitialized: realmCollection.length > 0
  };
};

export function useGetProvinces() {
  const realm = useRealm();
  const storedProvinces = useQuery(Province);
  
  const { isInitialized } = useInitLocationData(
    storedProvinces,
    provincesData,
    "Province"
  );

  return {
    data: storedProvinces,
    isLoading: !isInitialized
  };
}

export function useGetDistricts(provinceId?: string) {
  const realm = useRealm();
  const storedDistricts = useQuery(District);
  
  const { isInitialized } = useInitLocationData(
    storedDistricts,
    districtsData,
    "District"
  );

  const filteredDistricts = useMemo(() => 
    provinceId ? storedDistricts.filtered("province_id == $0", provinceId) : storedDistricts,
  [provinceId, storedDistricts]);

  return {
    data: filteredDistricts,
    isLoading: !isInitialized
  };
}

export function useGetSectors(districtId?: string) {
  const realm = useRealm();
  const storedSectors = useQuery(Sector);
  
  const { isInitialized } = useInitLocationData(
    storedSectors,
    sectorsData,
    "Sector"
  );

  const filteredSectors = useMemo(() => 
    districtId ? storedSectors.filtered("district_id == $0", districtId) : storedSectors,
  [districtId, storedSectors]);

  return {
    data: filteredSectors,
    isLoading: !isInitialized
  };
}

export function useGetCells(sectorId?: string) {
  const realm = useRealm();
  const storedCells = useQuery(Cell);
  
  const { isInitialized } = useInitLocationData(
    storedCells,
    cellsData,
    "Cell"
  );

  const filteredCells = useMemo(() => 
    sectorId ? storedCells.filtered("sector_id == $0", sectorId) : storedCells,
  [sectorId, storedCells]);

  return {
    data: filteredCells,
    isLoading: !isInitialized
  };
}

export function useGetVillages(cellId?: string) {
  const realm = useRealm();
  const storedVillages = useQuery(Village);
  
  const { isInitialized } = useInitLocationData(
    storedVillages,
    villagesData,
    "Village"
  );

  const filteredVillages = useMemo(() => 
    cellId ? storedVillages.filtered("cells_id == $0", cellId) : storedVillages,
  [cellId, storedVillages]);

  return {
    data: filteredVillages,
    isLoading: !isInitialized
  };
}

/**
 * A unified hook that provides all location data with optimized loading states
 * and data access patterns.
 */
export function useLocalLocation() {
  const { data: provinces, isLoading: isLoadingProvinces } = useGetProvinces();
  
  return {
    provinces: {
      data: provinces,
      isLoading: isLoadingProvinces,
      getById: (id: string) => provinces.find(p => p.id === id) || null
    },
    districts: {
      getForProvince: (provinceId: string) => {
        const { data, isLoading } = useGetDistricts(provinceId);
        return { data, isLoading };
      },
      getById: (id: string) => {
        const allDistricts = useQuery(District);
        return allDistricts.find(d => d.id === id) || null;
      }
    },
    sectors: {
      getForDistrict: (districtId: string) => {
        const { data, isLoading } = useGetSectors(districtId);
        return { data, isLoading };
      },
      getById: (id: string) => {
        const allSectors = useQuery(Sector);
        return allSectors.find(s => s.id === id) || null;
      }
    },
    cells: {
      getForSector: (sectorId: string) => {
        const { data, isLoading } = useGetCells(sectorId);
        return { data, isLoading };
      },
      getById: (id: string) => {
        const allCells = useQuery(Cell);
        return allCells.find(c => c.id === id) || null;
      }
    },
    villages: {
      getForCell: (cellId: string) => {
        const { data, isLoading } = useGetVillages(cellId);
        return { data, isLoading };
      },
      getById: (id: string) => {
        const allVillages = useQuery(Village);
        return allVillages.find(v => v.id === id) || null;
      }
    }
  };
} 