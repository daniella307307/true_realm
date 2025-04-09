import React, { useState } from "react";
import { View, FlatList, TouchableOpacity, TextInput } from "react-native";
import { Text } from "./text";
import { ICohort } from "~/models/cohorts/cohort";
import { useGetCohorts } from "~/services/cohorts";
import { Ionicons } from "@expo/vector-icons";
import { getLocalizedTitle } from "../DynamicForm";
import i18n from "~/utils/i18n";

interface CohortSelectorProps {
  onSelect: (value: ICohort) => void;
  initialValue?: ICohort;
}

const CohortItem = ({
  cohort,
  isSelected,
  onSelect,
}: {
  cohort: ICohort;
  isSelected: boolean;
  onSelect: (cohort: ICohort) => void;
}) => {
  if (!cohort || typeof cohort !== "object") return null;

  // Create a safe local copy of the cohort object
  const cohortData = { ...cohort };
  return (
    <TouchableOpacity
      onPress={() => onSelect(cohort)}
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
      <Text
        className={`text-lg ${
          isSelected ? "text-primary font-medium" : "text-gray-700"
        }`}
      >
        {cohortData.cohort || "Unknown Cohort"}
      </Text>
    </TouchableOpacity>
  );
};

const CohortSelector: React.FC<CohortSelectorProps> = ({
  onSelect,
  initialValue,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCohort, setSelectedCohort] = useState<ICohort | undefined>(
    initialValue
  );
  const { data: cohorts, isLoading } = useGetCohorts();
  const language = i18n.language;

  const handleSelect = (cohort: ICohort) => {
    // Create a fresh copy to avoid reference issues
    const cohortCopy = { ...cohort };
    setSelectedCohort(cohortCopy);
    onSelect(cohortCopy);
  };

  const filteredCohorts = cohorts?.filter((cohort) => {
    if (!searchQuery) {
      return true;
    }
    return cohort.cohort.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <View className="flex-1 p-4">
        <Text>Loading Cohorts...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <Text className="mb-2 text-md font-medium text-[#050F2B]">
        {getLocalizedTitle(
          {
            en: "Select Cohorts",
            kn: "Hitamo Icyiciro",
            default: "Select Cohorts",
          },
          language
        )}
        <Text className="text-primary"> *</Text>
      </Text>
      {/* Search input */}
      <View className="flex-row items-center space-x-2">
        <Ionicons name="search" size={20} color="#A0A3BD" className="mr-2" />
        <TextInput
          className=" w-11/12 px-4 py-3 border rounded-lg border-[#E4E4E7] bg-white mb-2"
          placeholder="Search IZU codes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredCohorts}
        keyExtractor={(item) => `cohort-${item?.id || Math.random()}`}
        renderItem={({ item }) => {
          if (!item) return null;

          const isSelected = selectedCohort?.id === item.id;

          return (
            <CohortItem
              cohort={item}
              isSelected={isSelected}
              onSelect={handleSelect}
            />
          );
        }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500">No cohorts available</Text>
          </View>
        }
        // Add these to help with performance and reduce potential issues
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
    </View>
  );
};

export default CohortSelector;
