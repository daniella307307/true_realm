import React, { useState, useEffect } from "react";

import { View, ScrollView, TouchableOpacity } from "react-native";

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

  // Call onSelect whenever any selection changes
  useEffect(() => {
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
    selectedVillage
  ]);

  const language = i18n.language;

  return (
    <ScrollView className="flex-1 p-4">
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

      {/* Province Select */}
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
          data={
            // Filter province don't show the province where the name is N/A
            provinces?.filter((province) => province.province_name !== "N/A")
              .map((province) => ({
                value: province.id,
                label: province.province_name,
              })) || []
          }
          onChange={(item) => {
            const province = provinces?.find((p) => p.id === item.value);
            setSelectedProvince(province || null);
          }}
          placeholder={selectedProvince?.province_name || "Select Province"}
          disabled={provincesLoading}
        />
      </View>

      {/* District Select */}
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
          data={
            districts?.map((district) => ({
              value: district.id,
              label: district.district_name,
            })) || []
          }
          onChange={(item) => {
            const district = districts?.find((d) => d.id === item.value);
            setSelectedDistrict(district || null);
          }}
          placeholder={selectedDistrict?.district_name || "Select District"}
          disabled={!selectedProvince || districtsLoading}
        />
      </View>

      {/* Sector Select */}
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
          data={
            sectors?.map((sector) => ({
              value: sector.id,
              label: sector.sector_name,
            })) || []
          }
          onChange={(item) => {
            const sector = sectors?.find((s) => s.id === item.value);
            setSelectedSector(sector || null);
          }}
          placeholder={selectedSector?.sector_name || "Select Sector"}
          disabled={!selectedDistrict || sectorsLoading}
        />
      </View>

      {/* Cell Select */}
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
          data={
            cells?.map((cell) => ({
              value: cell.id,
              label: cell.cell_name,
            })) || []
          }
          onChange={(item) => {
            const cell = cells?.find((c) => c.id === item.value);
            setSelectedCell(cell || null);
          }}
          placeholder={selectedCell?.cell_name || "Select Cell"}
          disabled={!selectedSector || cellsLoading}
        />
      </View>

      {/* Village Select */}
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
          data={
            villages?.map((village) => ({
              value: village.id,
              label: village.village_name,
            })) || []
          }
          onChange={(item) => {
            const village = villages?.find((v) => v.id === item.value);
            setSelectedVillage(village || null);
          }}
          placeholder={selectedVillage?.village_name || "Select Village"}
          disabled={!selectedCell || villagesLoading}
        />
      </View>
    </ScrollView>
  );
};

export default LocationSelector;
