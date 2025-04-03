import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { Text } from "./text";
import { Button } from "./button";
import HeaderNavigation from "./header";
import {
  useGetProvinces,
  useGetDistricts,
  useGetSectors,
  useGetCells,
  useGetVillages,
} from "~/services/locations";
import { IProvince } from "~/models/locations/province";
import { IDistrict } from "~/models/locations/district";
import { ICell } from "~/models/locations/cell";
import { ISector } from "~/models/locations/sector";
import { IVillage } from "~/models/locations/village";
import { getLocalizedTitle } from "../DynamicForm";
import i18n from "~/utils/i18n";
import Dropdown from "./select";

interface LocationSelectorProps {
  onSelect: (value: {
    province: IProvince | null;
    district: IDistrict | null;
    sector: ISector | null;
    cell: ICell | null;
    village: IVillage | null;
  }) => void;
  onBack: () => void;
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
  onBack,
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

  const handleNext = () => {
    if (
      selectedProvince &&
      selectedDistrict &&
      selectedSector &&
      selectedCell &&
      selectedVillage
    ) {
      onSelect({
        province: selectedProvince,
        district: selectedDistrict,
        sector: selectedSector,
        cell: selectedCell,
        village: selectedVillage,
      });
    }
  };

  const isComplete =
    selectedProvince &&
    selectedDistrict &&
    selectedSector &&
    selectedCell &&
    selectedVillage;

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
            provinces?.map((province) => ({
              value: province.id,
              label: province.province_name,
            })) || []
          }
          onChange={(item) => {
            const province = provinces?.find((p) => p.id === item.value);
            setSelectedProvince(province || null);
            setSelectedDistrict(null);
          }}
          placeholder="Select Province"
          disabled={provincesLoading}
          // value={selectedProvince?.id}
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
            setSelectedSector(null);
          }}
          placeholder="Select District"
          disabled={!selectedProvince || districtsLoading}
          // value={selectedDistrict?.id}
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
            setSelectedCell(null);
          }}
          placeholder="Select Sector"
          disabled={!selectedDistrict || sectorsLoading}
          // value={selectedSector?.id}
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
            setSelectedVillage(null);
          }}
          placeholder="Select Cell"
          disabled={!selectedSector || cellsLoading}
          // value={selectedCell?.id}
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
          placeholder="Select Village"
          disabled={!selectedCell || villagesLoading}
          // value={selectedVillage?.id}
        />
      </View>

      <View className="flex-row justify-between mt-4 gap-4">
        <TouchableOpacity
          onPress={onBack}
          className="flex-1 py-4 rounded-lg bg-gray-200"
        >
          <Text className="text-center text-gray-700 font-medium">
            {getLocalizedTitle(
              { en: "Previous", kn: "Gusubira inyuma", default: "Previous" },
              language
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isComplete}
          className={`flex-1 py-4 rounded-lg ${
            isComplete ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <Text className="text-center text-white font-medium">
            {getLocalizedTitle(
              { en: "Next", kn: "Komeza", default: "Next" },
              language
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default LocationSelector;
