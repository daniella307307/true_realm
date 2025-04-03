import React, { useState } from "react";
import { View, TextInput, FlatList, TouchableOpacity } from "react-native";
import { Text } from "./text";
import { IIzu } from "~/models/izus/izu";
import { useGetIzus } from "~/services/izus";
import { Ionicons } from "@expo/vector-icons";
import { getLocalizedTitle } from "../DynamicForm";
import i18n from "~/utils/i18n";

interface IzuSelectorProps {
  onSelect: (value: IIzu) => void;
  onBack: () => void;
  onNext: () => void;
  initialValue?: IIzu;
}
const IzuCodeItem = ({
  item,
  onSelect,
  isSelected,
}: {
  item: {
    user_code: string;
    name: string;
  };
  onSelect: (code: string) => void;
  isSelected: boolean;
}) => (
  <TouchableOpacity
    onPress={() => onSelect(item.user_code)}
    className={`px-4 py-3 mb-2 rounded-lg ${
      isSelected ? "bg-primary bg-opacity-20" : "bg-white"
    } border border-[#E4E4E7]`}
  >
    <Text className={`font-medium ${isSelected ? "text-white" : "text-black"}`}>
      {item.user_code}
    </Text>
    <Text
      className={`text-sm text-gray-500 ${
        isSelected ? "text-white" : "text-black"
      }`}
    >
      {item.name}
    </Text>
  </TouchableOpacity>
);

const IzuSelector: React.FC<IzuSelectorProps> = ({ onSelect, onBack, initialValue }) => {
  const [selectedIzu, setSelectedIzu] = useState<IIzu | null>(initialValue || null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: izus, isLoading } = useGetIzus();

  const filteredIzus = izus?.filter(
    (izu) =>
      izu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      izu.user_code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const language = i18n.language;

  const handleSelect = (izu: IIzu) => {
    setSelectedIzu(izu);
  };

  if (isLoading) {
    return (
      <View className="flex-1 p-4">
        <Text>Loading IZUs...</Text>
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
        className={`w-full px-4 py-4 border rounded-lg border-[#E4E4E7] bg-white dark:bg-[#1E1E1E] dark:text-white mb-2`}
        value={selectedIzu?.user_code || ""}
        placeholder="Select an IZU code"
        editable={false}
      />

      {/* Search input */}
      <View className="flex-row items-center space-x-2">
        <Ionicons name="search" size={20} color="#A0A3BD" className="mr-2" />
        <TextInput
          className=" w-11/12 px-4 py-3 border rounded-lg border-[#E4E4E7] bg-white dark:bg-[#1E1E1E] dark:text-white mb-2"
          placeholder="Search IZU codes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Scrollable list of IZU codes */}
      <View className="flex-1 border rounded-lg border-[#E4E4E7] bg-gray-50">
        <FlatList
          data={filteredIzus}
          keyExtractor={(item: IIzu) => item.user_code}
          renderItem={({ item }) => (
            <IzuCodeItem
              item={item}
              onSelect={() => handleSelect(item)}
              isSelected={selectedIzu?.user_code === item.user_code}
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

      {/* Next Button */}
      <TouchableOpacity
        onPress={() => selectedIzu && onSelect(selectedIzu)}
        disabled={!selectedIzu}
        className={`mt-4 py-4 rounded-lg ${
          selectedIzu ? "bg-primary" : "bg-gray-300"
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
  );
};

export default IzuSelector;
