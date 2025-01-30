import React, { useState, useTransition } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { IFamilies } from "~/types";
import { useTranslation } from "react-i18next";
import CustomInput from "~/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TabBarIcon } from "~/components/ui/tabbar-icon";

const izuMembers = [
  {
    id: "01",
    name: "Nyirakanani Donata",
    location: "Kigali",
  },
  {
    id: "02",
    name: "Mukamana Marie",
    location: "Kigali",
  },
  {
    id: "03",
    name: "Mahoro Nkarimo",
    location: "Kigali",
  },
  {
    id: "04",
    name: "Uwimana Alice",
    location: "Kigali",
  },
];

const StatisticsScreen = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-xl font-bold mb-4">Izu Statistics</Text>
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("Search Izu")}
        keyboardType="default"
        accessibilityLabel={t("searchIzu")}
      />
      <FlatList
        data={izuMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push("/(families)/(modules)/module")}
            className="p-4 border flex-row items-center justify-between mb-4 border-gray-200 rounded-xl"
          >
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold">{item.id}</Text>
              <Text className="text-lg ml-2 font-semibold">{item.name}</Text>
            </View>
            <Pressable
              onPress={() => {}}
            >
              <TabBarIcon name="arrow-down-left" family="Feather" size={24} color="#71717A" />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
};

export default StatisticsScreen;
