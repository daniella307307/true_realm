import React, { useState, useMemo } from "react";
import { View, FlatList, TouchableOpacity, TextInput } from "react-native";
import { Text } from "./text";
import { useGetStakeholders } from "~/services/stakeholders";
import { IStakeholder } from "~/models/stakeholders/stakeholder";
import { Ionicons } from "@expo/vector-icons";
import { getLocalizedTitle } from "../DynamicForm";
import i18n from "~/utils/i18n";

interface StakeholderSelectorProps {
  onSelect: (value: IStakeholder[]) => void;
  onBack: () => void;
  initialValue?: IStakeholder[];
}

const StakeholderItem = ({
  stakeholder,
  isSelected,
  onSelect,
}: {
  stakeholder: IStakeholder;
  isSelected: boolean;
  onSelect: (stakeholder: IStakeholder) => void;
}) => (
  <TouchableOpacity
    onPress={() => onSelect(stakeholder)}
    className={`flex-row items-center mb-2 p-4 rounded-lg border ${
      isSelected ? "border-primary bg-primary/10" : "border-gray-200 bg-white"
    }`}
  >
    <View className="mr-4">
      <Ionicons
        name={isSelected ? "checkbox" : "square-outline"}
        size={24}
        color={isSelected ? "#A23A91" : "#A0A3BD"}
      />
    </View>
    <Text
      className={`text-lg ${
        isSelected ? "text-primary font-medium" : "text-gray-700"
      }`}
    >
      {stakeholder.name}
    </Text>
  </TouchableOpacity>
);

const StakeholderSelector: React.FC<StakeholderSelectorProps> = ({
  onSelect,
  onBack,
  initialValue,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStakeholders, setSelectedStakeholders] = useState<
    IStakeholder[]
  >(initialValue || []);
  const { stakeholders, isLoading } = useGetStakeholders();
  const language = i18n.language;

  const handleSelect = (stakeholder: IStakeholder) => {
    setSelectedStakeholders((prev) => {
      const isAlreadySelected = prev.some((s) => s.id === stakeholder.id);
      if (isAlreadySelected) {
        return prev.filter((s) => s.id !== stakeholder.id);
      }
      return [...prev, stakeholder];
    });
  };

  const handleNext = () => {
    if (selectedStakeholders.length > 0) {
      onSelect(selectedStakeholders);
    }
  };

  const filteredStakeholders = useMemo(() => {
    if (!stakeholders) return [];
    return stakeholders.filter(
      (stakeholder: IStakeholder) =>
        stakeholder.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        stakeholder.is_stakeholder === 1
    );
  }, [stakeholders, searchQuery]);

  if (isLoading) {
    return (
      <View className="flex-1 p-4">
        <Text>Loading Stakeholders...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <Text className="mb-2 text-md font-medium text-[#050F2B]">
        {getLocalizedTitle(
          {
            en: "Select Stakeholders",
            kn: "Hitamo Abafatanyabikorwa",
            default: "Select Stakeholders",
          },
          language
        )}
        <Text className="text-primary"> *</Text>
      </Text>
      {/* Search input */}
      <View className="flex-row items-center space-x-2">
        <Ionicons name="search" size={20} color="#A0A3BD" className="mr-2" />
        <TextInput
          className="w-11/12 px-4 py-3 border rounded-lg border-[#E4E4E7] bg-white dark:bg-[#1E1E1E] dark:text-white mb-2"
          placeholder="Search stakeholders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredStakeholders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <StakeholderItem
            stakeholder={item}
            isSelected={selectedStakeholders.some((s) => s.id === item.id)}
            onSelect={handleSelect}
          />
        )}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500">No stakeholders available</Text>
          </View>
        }
      />
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
          disabled={selectedStakeholders.length === 0}
          className={`flex-1 py-4 rounded-lg ${
            selectedStakeholders.length > 0 ? "bg-primary" : "bg-gray-300"
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
    </View>
  );
};

export default StakeholderSelector;
