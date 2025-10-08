import { useEffect, useState, useMemo } from "react";
import provincesData from "~/mocks/provinces.json";
import districtsData from "~/mocks/districts.json";
import sectorsData from "~/mocks/sectors.json";
import cellsData from "~/mocks/cells.json";
import villagesData from "~/mocks/villages.json";
import { useSQLite } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

interface BaseLocation {
  id: string;
  [key: string]: any;
}

// Changed from hook-like name to regular function name
const initLocationDataSQLite = async (tableName: string, mockData: BaseLocation[], createFn: any) => {
  const records = await createFn.getAll(tableName);
  if (records.length === 0) {
    await createFn.batchCreate(tableName, mockData.map(d => ({ ...d, id: d.id.toString() })));
    return mockData.map(d => ({ ...d, id: d.id.toString() }));
  }
  return records;
};

const getEntityByIdSQLite = (records: BaseLocation[], id: string | number) => {
  if (!id) return null;
  return records.find(r => r.id.toString() === id.toString()) || null;
};

// ------------------- PROVINCES -------------------
export function useGetProvinces() {
  const { getAll, batchCreate } = useSQLite();
  const [data, setData] = useState<BaseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const records = await initLocationDataSQLite("Provinces", provincesData, { getAll, batchCreate });
      setData(records);
      setIsLoading(false);
    };
    load();
  }, [getAll, batchCreate]);

  return {
    data,
    isLoading,
    getById: (id: string | number) => getEntityByIdSQLite(data, id),
  };
}

// ------------------- DISTRICTS -------------------
export function useGetDistricts(provinceId?: string) {
  const { getAll, batchCreate } = useSQLite();
  const [data, setData] = useState<BaseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const records = await initLocationDataSQLite("Districts", districtsData, { getAll, batchCreate });
      setData(records);
      setIsLoading(false);
    };
    load();
  }, [getAll, batchCreate]);

  const filteredData = useMemo(() => {
    return provinceId ? data.filter(d => d.province_id.toString() === provinceId) : data;
  }, [provinceId, data]);

  return {
    data: filteredData,
    isLoading,
    getById: (id: string | number) => getEntityByIdSQLite(data, id),
  };
}

// ------------------- SECTORS -------------------
export function useGetSectors(districtId?: string) {
  const { getAll, batchCreate } = useSQLite();
  const [data, setData] = useState<BaseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const records = await initLocationDataSQLite("Sectors", sectorsData, { getAll, batchCreate });
      setData(records);
      setIsLoading(false);
    };
    load();
  }, [getAll, batchCreate]);

  const filteredData = useMemo(() => {
    return districtId ? data.filter(d => d.district_id.toString() === districtId) : data;
  }, [districtId, data]);

  return {
    data: filteredData,
    isLoading,
    getById: (id: string | number) => getEntityByIdSQLite(data, id),
  };
}

// ------------------- CELLS -------------------
export function useGetCells(sectorId?: string) {
  const { getAll, batchCreate } = useSQLite();
  const [data, setData] = useState<BaseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const records = await initLocationDataSQLite("Cells", cellsData, { getAll, batchCreate });
      setData(records);
      setIsLoading(false);
    };
    load();
  }, [getAll, batchCreate]);

  const filteredData = useMemo(() => {
    return sectorId ? data.filter(d => d.sector_id.toString() === sectorId) : data;
  }, [sectorId, data]);

  return {
    data: filteredData,
    isLoading,
    getById: (id: string | number) => getEntityByIdSQLite(data, id),
  };
}

// ------------------- VILLAGES -------------------
export function useGetVillages(cellId?: string) {
  const { getAll, batchCreate } = useSQLite();
  const [data, setData] = useState<BaseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const records = await initLocationDataSQLite("Villages", villagesData, { getAll, batchCreate });
      setData(records);
      setIsLoading(false);
    };
    load();
  }, [getAll, batchCreate]);

  const filteredData = useMemo(() => {
    return cellId ? data.filter(v => v.cells_id.toString() === cellId) : data;
  }, [cellId, data]);

  return {
    data: filteredData,
    isLoading,
    getById: (id: string | number) => getEntityByIdSQLite(data, id),
  };
}

// ------------------- GET LOCATION BY VILLAGE OFFLINE -------------------
export function useGetLocationByVillageIdOffline(villageId: string) {
  const { getAll } = useSQLite();
  const [locationData, setLocationData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!villageId) {
        setIsLoading(false);
        return;
      }

      // Load all required tables
      const [villages, cells, sectors, districts, provinces] = await Promise.all([
        getAll("Villages"),
        getAll("Cells"),
        getAll("Sectors"),
        getAll("Districts"),
        getAll("Provinces"),
      ]);

      const village = villages.find(v => v.id.toString() === villageId);
      if (!village) {
        setIsLoading(false);
        return;
      }

      const cell = cells.find(c => c.id.toString() === village.cells_id);
      const sector = sectors.find(s => s.id.toString() === cell?.sector_id);
      const district = districts.find(d => d.id.toString() === sector?.district_id);
      const province = provinces.find(p => p.id.toString() === district?.province_id);

      if (!cell || !sector || !district || !province) {
        setIsLoading(false);
        return;
      }

      setLocationData({
        location: {
          province: { id: Number(province.id), province_name: province.province_name },
          district: { id: Number(district.id), district_name: district.district_name },
          sector: { id: Number(sector.id), sector_name: sector.sector_name },
          cell: { id: Number(cell.id), cell_name: cell.cell_name },
          village: { id: Number(village.id), village_name: village.village_name },
        },
      });

      setIsLoading(false);
    };

    load();
  }, [villageId, getAll]);

  return { data: locationData, isLoading };
}