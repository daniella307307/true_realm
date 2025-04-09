import { useEffect } from "react";
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

export function useGetProvinces() {
  const realm = useRealm();
  const storedProvinces = useQuery(Province);

  useEffect(() => {
    if (storedProvinces.length === 0) {
      realm.write(() => {
        provincesData.forEach((province: IProvince) => {
          realm.create("Province", province, Realm.UpdateMode.Modified);
        });
      });
    }
  }, [storedProvinces]);

  return {
    data: storedProvinces,
    isLoading: storedProvinces.length === 0,
  };
}

export function useGetDistricts(provinceId?: string) {
  const realm = useRealm();
  const storedDistricts = useQuery(District);

  console.log("Province ID", provinceId);
  useEffect(() => {
    if (storedDistricts.length === 0) {
      realm.write(() => {
        districtsData.forEach((district: IDistrict) => {
          realm.create("District", district, Realm.UpdateMode.Modified);
        });
      });
    }
  }, [storedDistricts]);

  const filteredDistricts = provinceId
    ? storedDistricts.filtered("province_id == $0", provinceId)
    : storedDistricts;

  return {
    data: filteredDistricts,
    isLoading: storedDistricts.length === 0,
  };
}

export function useGetSectors(districtId?: string) {
  const realm = useRealm();
  const storedSectors = useQuery(Sector);

  useEffect(() => {
    if (storedSectors.length === 0) {
      realm.write(() => {
        sectorsData.forEach((sector: ISector) => {
          realm.create("Sector", sector, Realm.UpdateMode.Modified);
        });
      });
    }
  }, [storedSectors]);

  const filteredSectors = districtId
    ? storedSectors.filtered("district_id == $0", districtId)
    : storedSectors;

  return {
    data: filteredSectors,
    isLoading: storedSectors.length === 0,
  };
}

export function useGetCells(sectorId?: string) {
  const realm = useRealm();
  const storedCells = useQuery(Cell);

  useEffect(() => {
    if (storedCells.length === 0) {
      realm.write(() => {
        cellsData.forEach((cell: ICell) => {
          realm.create("Cell", cell, Realm.UpdateMode.Modified);
        });
      });
    }
  }, [storedCells]);

  const filteredCells = sectorId
    ? storedCells.filtered("sector_id == $0", sectorId)
    : storedCells;

  return {
    data: filteredCells,
    isLoading: storedCells.length === 0,
  };
}

export function useGetVillages(cellId?: string) {
  const realm = useRealm();
  const storedVillages = useQuery(Village);

  useEffect(() => {
    if (storedVillages.length === 0) {
      realm.write(() => {
        villagesData.forEach((village: IVillage) => {
          realm.create("Village", village, Realm.UpdateMode.Modified);
        });
      });
    }
  }, [storedVillages]);

  const filteredVillages = cellId
    ? storedVillages.filtered("cells_id == $0", cellId)
    : storedVillages;

  return {
    data: filteredVillages,
    isLoading: storedVillages.length === 0,
  };
} 