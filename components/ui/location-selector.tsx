import React, { useState, useEffect, useCallback, useMemo } from "react";

import { View, ScrollView } from "react-native";

import i18n from "~/utils/i18n";
import {
  useGetProvinces,
  useGetDistricts,
  useGetSectors,
  useGetCells,
  useGetVillages,
} from "~/services/locations";
import { ICell } from "~/models/locations/cell";
import { IDistrict } from "~/models/locations/district";
import { IProvince } from "~/models/locations/province";
import { ISector } from "~/models/locations/sector";
import { IVillage } from "~/models/locations/village";

import Dropdown from "./select";
import { Text } from "./text";
import { getLocalizedTitle } from "~/utils/form-utils";
import { useTranslation } from "react-i18next";

interface LocationSelectorProps {
  onSelect: (value: {
    province: IProvince | null;
    district: IDistrict | null;
    sector: ISector | null;
    cell: ICell | null;
    village: IVillage | null;
  }) => void;
  initialValues?: {
    province?: IProvince | null;
    district?: IDistrict | null;
    sector?: ISector | null;
    cell?: ICell | null;
    village?: IVillage | null;
  };
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  onSelect,
  initialValues,
}) => {
  const { t } = useTranslation();
  const [selectedProvince, setSelectedProvince] = useState<IProvince | null>(
    initialValues?.province || null
  );
  const [selectedDistrict, setSelectedDistrict] = useState<IDistrict | null>(
    initialValues?.district || null
  );
  const [selectedSector, setSelectedSector] = useState<ISector | null>(
    initialValues?.sector || null
  );
  const [selectedCell, setSelectedCell] = useState<ICell | null>(
    initialValues?.cell || null
  );
  const [selectedVillage, setSelectedVillage] = useState<IVillage | null>(
    initialValues?.village || null
  );

  // Fetch data with React Query hooks
  const { data: provinces, isLoading: provincesLoading } = useGetProvinces();
  const { data: districts, isLoading: districtsLoading } = useGetDistricts(
    selectedProvince?.id
  );
  const { data: sectors, isLoading: sectorsLoading } = useGetSectors(
    selectedDistrict?.id
  );
  const { data: cells, isLoading: cellsLoading } = useGetCells(
    selectedSector?.id
  );
  const { data: villages, isLoading: villagesLoading } = useGetVillages(
    selectedCell?.id
  );

  // Memoize the province options
  const provinceOptions = useMemo(() => {
    if (!provinces) return [];
    return provinces
      .filter((province) => province.province_name !== "N/A")
      .map((province) => ({
        value: province.id,
        label: province.province_name,
      }));
  }, [provinces]);

  // Memoize the district options
  const districtOptions = useMemo(() => {
    if (!districts) return [];
    return districts.map((district) => ({
      value: district.id,
      label: district.district_name,
    }));
  }, [districts]);

  // Memoize the sector options
  const sectorOptions = useMemo(() => {
    if (!sectors) return [];
    return sectors.map((sector) => ({
      value: sector.id,
      label: sector.sector_name,
    }));
  }, [sectors]);

  // Memoize the cell options
  const cellOptions = useMemo(() => {
    if (!cells) return [];
    return cells.map((cell) => ({
      value: cell.id,
      label: cell.cell_name,
    }));
  }, [cells]);

  // Memoize the village options
  const villageOptions = useMemo(() => {
    if (!villages) return [];
    return villages.map((village) => ({
      value: village.id,
      label: village.village_name,
    }));
  }, [villages]);

  // Memoize the handlers
  const handleProvinceChange = useCallback((item: { value: string; label: string }) => {
    const province = provinces?.find((p) => p.id === item.value);
    setSelectedProvince(province || null);
  }, [provinces]);

  const handleDistrictChange = useCallback((item: { value: string; label: string }) => {
    const district = districts?.find((d) => d.id === item.value);
    setSelectedDistrict(district || null);
  }, [districts]);

  const handleSectorChange = useCallback((item: { value: string; label: string }) => {
    const sector = sectors?.find((s) => s.id === item.value);
    setSelectedSector(sector || null);
  }, [sectors]);

  const handleCellChange = useCallback((item: { value: string; label: string }) => {
    const cell = cells?.find((c) => c.id === item.value);
    setSelectedCell(cell || null);
  }, [cells]);

  const handleVillageChange = useCallback((item: { value: string; label: string }) => {
    const village = villages?.find((v) => v.id === item.value);
    setSelectedVillage(village || null);
  }, [villages]);

  // Reset dependent fields when province changes
  useEffect(() => {
    if (selectedProvince === null) {
      setSelectedDistrict(null);
      setSelectedSector(null);
      setSelectedCell(null);
      setSelectedVillage(null);
    }
  }, [selectedProvince]);

  // Reset dependent fields when district changes
  useEffect(() => {
    if (selectedDistrict === null) {
      setSelectedSector(null);
      setSelectedCell(null);
      setSelectedVillage(null);
    }
  }, [selectedDistrict]);

  // Reset dependent fields when sector changes
  useEffect(() => {
    if (selectedSector === null) {
      setSelectedCell(null);
      setSelectedVillage(null);
    }
  }, [selectedSector]);

  // Reset dependent field when cell changes
  useEffect(() => {
    if (selectedCell === null) {
      setSelectedVillage(null);
    }
  }, [selectedCell]);

  // Add useRef for tracking if this is the first render
  const isFirstRender = React.useRef(true);

  // Replace the problematic useEffect with this version
  useEffect(() => {
    // Skip the first render to avoid unnecessary calls with initial null values
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const currentSelection = {
      province: selectedProvince,
      district: selectedDistrict,
      sector: selectedSector,
      cell: selectedCell,
      village: selectedVillage,
    };
    
    onSelect(currentSelection);
  }, [
    selectedProvince,
    selectedDistrict,
    selectedSector,
    selectedCell,
    selectedVillage,
    // Remove onSelect from dependencies
  ]);

  const language = i18n.language;

  return (
    <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={true}>
      <Text className="mb-2 text-md font-medium text-[#050F2B]">
        {getLocalizedTitle(
          {
            en: "Select Location",
            kn: "Hitamo Ahantu",
            default: "Select Location",
          },
          language
        )}
        <Text className="text-primary"> *</Text>
      </Text>

      <View className="mb-4 relative">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(
            {
              en: "Province",
              kn: "Intara",
              default: "Province",
            },
            language
          )}
          <Text className="text-primary"> *</Text>
        </Text>
        <Dropdown
          data={provinceOptions}
          onChange={handleProvinceChange}
          placeholder={selectedProvince?.province_name || t("location_selector.select_province")}
          disabled={provincesLoading}
        />
      </View>

      <View className="mb-4 relative">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(
            {
              en: "District",
              kn: "Akarere",
              default: "District",
            },
            language
          )}
          <Text className="text-primary"> *</Text>
        </Text>
        <Dropdown
          data={districtOptions}
          onChange={handleDistrictChange}
          placeholder={selectedDistrict?.district_name || t("location_selector.select_district")}
          disabled={!selectedProvince || districtsLoading}
        />
      </View>

      <View className="mb-4 relative">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(
            {
              en: "Sector",
              kn: "Umurenge",
              default: "Sector",
            },
            language
          )}
          <Text className="text-primary"> *</Text>
        </Text>
        <Dropdown
          data={sectorOptions}
          onChange={handleSectorChange}
          placeholder={selectedSector?.sector_name || t("location_selector.select_sector")}
          disabled={!selectedDistrict || sectorsLoading}
        />
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(
            {
              en: "Cell",
              kn: "Akagari",
              default: "Cell",
            },
            language
          )}
          <Text className="text-primary"> *</Text>
        </Text>
        <Dropdown
          data={cellOptions}
          onChange={handleCellChange}
          placeholder={selectedCell?.cell_name || t("location_selector.select_cell")}
          disabled={!selectedSector || cellsLoading}
        />
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(
            {
              en: "Village",
              kn: "Umudugudu",
              default: "Village",
            },
            language
          )}
          <Text className="text-primary"> *</Text>
        </Text>
        <Dropdown
          data={villageOptions}
          onChange={handleVillageChange}
          placeholder={selectedVillage?.village_name || t("location_selector.select_village")}
          disabled={!selectedCell || villagesLoading}
        />
      </View>
    </ScrollView>
  );
};

export default LocationSelector;
