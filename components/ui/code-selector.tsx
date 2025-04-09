import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Controller } from "react-hook-form";
import { Text } from "./text";
import { FormField } from "~/types";
import { useQuery } from "@tanstack/react-query";
import { useGetIZUser } from "~/services/user";
import { TabBarIcon } from "./tabbar-icon";
import { Ionicons } from "@expo/vector-icons";

const getLocalizedTitle = (
  title: { en: string; kn: string; default: string },
  locale = "en-US"
): string => {
  // Convert locale to the language code used in your title object
  const language = locale.startsWith("rw") ? "kn" : "en";
  return title[language as keyof typeof title] || title.default;
};
// IZU Code Item component
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

// IZU Code Selector Component
const IzuCodeSelector = ({
  field,
  control,
  language = "en-US",
}: {
  field: FormField;
  control: any;
  language?: string;
}) => {
  const {
    data: izuMembers,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["izuMembers"],
    queryFn: useGetIZUser,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCodes, setFilteredCodes] = useState(izuMembers?.izus || []);

  // Filter IZU codes based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCodes(izuMembers?.izus || []);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = izuMembers?.izus.filter((code) =>
        code.name.toLowerCase().includes(query)
      );
      setFilteredCodes(filtered || []);
    }
  }, [searchQuery, izuMembers]);

  return (
    <Controller
      control={control}
      name={field.key}
      rules={{
        required: field.validate?.required
          ? field.validate.customMessage || "This field is required"
          : false,
      }}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View className="mb-4">
          <Text className="mb-2 text-md font-medium text-[#050F2B]">
            {getLocalizedTitle(field.title, language)}
            {field.validate?.required && (
              <Text className="text-primary"> *</Text>
            )}
          </Text>

          {/* Selected IZU Code Input */}
          <TextInput
            className={`w-full px-4 py-4 border rounded-lg ${
              error ? "border-primary" : "border-[#E4E4E7]"
            } bg-white mb-2`}
            value={value}
            onChangeText={onChange}
            placeholder="Select an IZU code"
            editable={false} // Make it read-only since selection is from the list
          />

          {/* Search input */}
          <View className="flex-row items-center space-x-2">
            <Ionicons 
                name="search"
                size={20}
                color="#A0A3BD"
                className="mr-2"
            />
            <TextInput
              className=" w-11/12 px-4 py-3 border rounded-lg border-[#E4E4E7] bg-white mb-2"
              placeholder="Search IZU codes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Scrollable list of IZU codes */}
          <View className="h-64 border rounded-lg border-[#E4E4E7] bg-gray-50">
            <FlatList
              data={filteredCodes}
              keyExtractor={(item) => item.user_code}
              renderItem={({ item }) => (
                <IzuCodeItem
                  item={item}
                  onSelect={onChange}
                  isSelected={value === item.user_code}
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

          {error && (
            <Text className="text-red-500 mt-2">
              {error.message || "This field is required"}
            </Text>
          )}
        </View>
      )}
    />
  );
};

export default IzuCodeSelector;
