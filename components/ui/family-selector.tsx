import React, { useState, useMemo } from "react";
import { View, FlatList, TouchableOpacity, TextInput } from "react-native";
import { Text } from "./text";
import { useGetFamilies } from "~/services/families";
import { IFamilies } from "~/types";
import { Ionicons } from "@expo/vector-icons";
import i18n from "~/utils/i18n";
import { getLocalizedTitle } from "~/utils/form-utils";
import { RealmContext } from "~/providers/RealContextProvider";
import { Province } from "~/models/locations/province";
import { District } from "~/models/locations/district";
import { Sector } from "~/models/locations/sector";
import { Cell } from "~/models/locations/cell";
import { Village } from "~/models/locations/village";

interface FamilySelectorProps {
  onSelect: (value: IFamilies) => void;
  initialValue?: IFamilies;
}

const FamilyItem = ({
  family,
  isSelected,
  onSelect,
}: {
  family: IFamilies;
  isSelected: boolean;
  onSelect: (family: IFamilies) => void;
}) => {
  const { useRealm } = RealmContext;
  const realm = useRealm();
  
  let villageName = family.village_name;
  
  // Try to get village name from location data if available
  if (family.location && family.location.village) {
    const village = realm.objectForPrimaryKey(
      Village,
      family.location.village.toString()
    );
    if (village) {
      villageName = village.village_name;
    }
  }
  
  return (
    <TouchableOpacity
      onPress={() => onSelect(family)}
      className={`flex-row items-center mb-2 p-4 rounded-lg border ${
        isSelected ? "border-primary bg-primary/10" : "border-gray-200 bg-white"
      }`}
    >
      <View className="mr-4">
        <Ionicons
          name={isSelected ? "radio-button-on" : "radio-button-off"}
          size={24}
          color={isSelected ? "#A23A91" : "#A0A3BD"}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm ${isSelected ? "text-primary" : "text-gray-600"}`}
        >
          {family.hh_id}
        </Text>
        <Text
          className={`text-lg font-medium ${
            isSelected ? "text-primary" : "text-gray-700"
          }`}
        >
          {family.hh_head_fullname}
        </Text>

        {villageName && (
          <Text
            className={`text-[12px] ${isSelected ? "text-primary" : "text-gray-600"}`}
          >
            Village: {villageName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const FamilySelector: React.FC<FamilySelectorProps> = ({
  onSelect,
  initialValue,
}) => {
  const [selectedFamily, setSelectedFamily] = useState<IFamilies | null>(initialValue || null);
  const [searchQuery, setSearchQuery] = useState("");
  const { families, isLoading } = useGetFamilies();

  const handleSelect = (family: IFamilies) => {
    setSelectedFamily(family);
    onSelect(family);
  };

  // Filter families based on search query
  const filteredFamilies = useMemo(() => {
    if (!families) return [];
    return families.filter(
      (family) =>
        (family.hh_head_fullname?.toLowerCase() || "")
          .includes(searchQuery.toLowerCase()) ||
        (family.hh_id?.toLowerCase() || "")
          .includes(searchQuery.toLowerCase())
    );
  }, [families, searchQuery]);

  if (isLoading) {
    return (
      <View className="flex-1 p-4">
        <Text>Loading Families...</Text>
      </View>
    );
  }

  const language = i18n.language;

  return (
    <View className="flex-1 p-4">
      <Text className="mb-2 text-md font-medium text-[#050F2B]">
        {getLocalizedTitle(
          { en: "Select Family", kn: "Hitamo Umuryango", default: "Select Family" },
          language
        )}
        <Text className="text-primary"> *</Text>
      </Text>
      {/* Search Input */}
      <View className="flex-row items-center space-x-2 mb-4">
        <Ionicons name="search" size={20} color="#A0A3BD" className="mr-2" />
        <TextInput
          className="w-11/12 px-4 py-3 border rounded-lg border-[#E4E4E7] bg-white"
          placeholder="Search families..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredFamilies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <FamilyItem
            family={item as IFamilies}
            isSelected={selectedFamily?.id === item.id}
            onSelect={handleSelect}
          />
        )}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500">No families found</Text>
          </View>
        }
      />
    </View>
  );
};

export default FamilySelector;
