import React, { useState, useMemo } from "react";
import { View, FlatList, TouchableOpacity, TextInput } from "react-native";
import { Text } from "./text";
import { useGetFamilies } from "~/services/families";
import { IFamilies } from "~/types";
import { Ionicons } from "@expo/vector-icons";
import { getLocalizedTitle } from "../DynamicForm";
import i18n from "~/utils/i18n";

interface FamilySelectorProps {
  onSelect: (value: IFamilies) => void;
  onBack: () => void;
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
}) => (
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

      {family.village_name && (
        <Text
          className={`text-sm ${isSelected ? "text-primary" : "text-gray-600"}`}
        >
          {family.village_name}
        </Text>
      )}
    </View>
  </TouchableOpacity>
);

const FamilySelector: React.FC<FamilySelectorProps> = ({
  onSelect,
  onBack,
  initialValue,
}) => {
  const [selectedFamily, setSelectedFamily] = useState<IFamilies | null>(initialValue || null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: families, isLoading } = useGetFamilies();

  const handleSelect = (family: IFamilies) => {
    setSelectedFamily(family);
  };

  const handleNext = () => {
    if (selectedFamily) {
      onSelect(selectedFamily);
    }
  };

  // Filter families based on search query
  const filteredFamilies = useMemo(() => {
    if (!families) return [];
    return families.filter(
      (family) =>
        family.hh_head_fullname
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        family.hh_id.toLowerCase().includes(searchQuery.toLowerCase())
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
    <View className="p-4 flex-1">
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
          className="w-11/12 px-4 py-3 border rounded-lg border-[#E4E4E7] bg-white dark:bg-[#1E1E1E] dark:text-white"
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
            family={item}
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
        className="h-1/2"
      />

      <View className="flex-row justify-between mt-4 gap-4">
        <TouchableOpacity
          onPress={onBack}
          className="flex-1 py-4 rounded-lg bg-gray-200"
        >
          <Text className="text-center text-gray-700 font-medium">
            Previous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!selectedFamily}
          className={`flex-1 py-4 rounded-lg ${
            selectedFamily ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <Text className="text-center text-white font-medium">Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FamilySelector;
