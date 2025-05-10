import React, { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Text } from "./text";
import { useGetIzus } from "~/services/izus";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import i18n from "~/utils/i18n";
import { getLocalizedTitle } from "~/utils/form-utils";
import { Izus } from "~/types";
import { useFocusEffect } from "@react-navigation/native";
import { useGetIzuStatisticsByMonitoringResponse } from "~/services/monitoring/monitoring-responses";

interface IzuSelectorProps {
  onSelect: (value: Izus) => void;
  initialValue?: Izus;
}

const IzuCodeItem = ({
  item,
  onSelect,
  isSelected,
}: {
  item: Izus;
  onSelect: (code: string) => void;
  isSelected: boolean;
}) => {
  const { monitoringResponses } = useGetIzuStatisticsByMonitoringResponse(item.id);

  // Calculate average percentage from monitoring responses
  const averagePercentage =
    monitoringResponses?.length > 0
      ? monitoringResponses.reduce(
          (acc, curr) => acc + (curr.score_data?.percentage || 0),
          0
        ) / monitoringResponses.length
      : 0;

  // Determine arrow direction based on percentage
  const arrowIcon = averagePercentage >= 50 ? "arrowup" : "arrowdown";
  const arrowColor = averagePercentage >= 50 ? "green" : "red";
  const arrowRotation = averagePercentage >= 50 ? "rotate-45" : "rotate-135";

  return (
    <TouchableOpacity
      onPress={() => onSelect(item?.izucode || "")}
      className={`px-4 py-3 mb-2 rounded-lg ${
        isSelected ? "bg-primary bg-opacity-20" : "bg-white"
      } border border-[#E4E4E7]`}
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text
            className={`font-medium ${
              isSelected ? "text-white" : "text-black"
            }`}
          >
            {item.izucode}
          </Text>
          <Text
            className={`text-sm text-gray-500 ${
              isSelected ? "text-white" : "text-black"
            }`}
          >
            {item.name}
          </Text>
        </View>
        <AntDesign
          name={arrowIcon}
          size={24}
          color={arrowColor}
          className={arrowRotation}
        />
      </View>
    </TouchableOpacity>
  );
};

const IzuSelector: React.FC<IzuSelectorProps> = ({
  onSelect,
  initialValue,
}) => {
  const [selectedIzu, setSelectedIzu] = useState<Izus | null>(
    initialValue || null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const { izus: izus, isLoading, refresh } = useGetIzus();

  // Add focus effect to refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Refresh the data when the screen comes into focus
      refresh();
      return () => {};
    }, [refresh])
  );

  const filteredIzus = izus?.filter((izu) => {
    if (!searchQuery) return true;
    return (
      izu?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      izu?.izucode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const language = i18n.language;

  const handleSelect = (izu: Izus) => {
    setSelectedIzu(izu);
    onSelect(izu);
  };

  if (isLoading) {
    return (
      <View className="flex-1 p-4">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <Text className="mb-2 text-md font-medium text-[#050F2B]">
        {getLocalizedTitle(
          { en: "Select Izu", kn: "Hitamo Izu", default: "Select Izus" },
          language
        )}
        <Text className="text-primary"> *</Text>
      </Text>

      {/* Selected IZU Code Input */}
      <TextInput
        className={`w-full px-4 py-4 border rounded-lg border-[#E4E4E7] bg-white mb-2`}
        value={selectedIzu?.izucode || ""}
        placeholder="Select an IZU code"
        editable={false}
      />

      {/* Search input */}
      <View className="flex-row items-center space-x-2">
        <Ionicons name="search" size={20} color="#A0A3BD" className="mr-2" />
        <TextInput
          className="w-11/12 px-4 py-3 border rounded-lg border-[#E4E4E7] bg-white mb-2"
          placeholder="Search IZU codes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Scrollable list of IZU codes */}
      <View className="flex-1 border rounded-lg border-[#E4E4E7] bg-gray-50">
        <FlatList
          data={(filteredIzus as unknown as Izus[]).filter(
            (izu) => izu.izucode && izu.izucode.trim() !== ""
          )}
          keyExtractor={(item: Izus) =>
            `${item.izucode || ""}:${item.id || ""}`
          }
          renderItem={({ item }) => (
            <IzuCodeItem
              item={item}
              onSelect={() => handleSelect(item)}
              isSelected={selectedIzu?.izucode === item.izucode}
            />
          )}
          contentContainerStyle={{ padding: 8 }}
          ListEmptyComponent={
            <View className="py-4 items-center">
              <Text className="text-gray-500">No IZU codes found</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

export default IzuSelector;
