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

const families: IFamilies[] = [
  {
    id: "F-023456-12347",
    name: "John Doe",
    location: "Kigali",
    cohort: 1,
  },
  {
    id: "F-143456-12347",
    name: "Jane Doe",
    location: "Kigali",
    cohort: 2,
  },
  {
    id: "F-823456-12347",
    name: "John Smith",
    location: "Musanze",
    cohort: 2,
  },
  {
    id: "F-423456-12347",
    name: "Jane Smith",
    location: "Rubavu",
    cohort: 1,
  },
  {
    id: "F-148456-12347",
    name: "Jackson Munyentwari",
    location: "Karongi",
    cohort: 1,
  },
  {
    id: "F-101456-12347",
    name: "Mihigo David",
    location: "Nyagatare",
    cohort: 1,
  },
];

const HistoryScreen = () => {
  const cohortId: number | "all" = 1;
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

  // Filter families based on cohortId
  const filteredFamilies =
    cohortId.toString() === "all"
      ? families
      : families.filter((family) => family.cohort === Number(cohortId));

  if (!cohortId) {
    return (
      <View className="flex-1 bg-white justify-center items-center gap-6">
        <View className="flex-col justify-center items-center">
          <Text className="font-semibold text-xl text-center">
            Missing cohortId
          </Text>
          <Text className="bg-gray-200 text-center p-4 rounded-xl">
            Please provide a cohortId to view families, so we can help you
            better and faster. Thank you! 🚀
          </Text>
        </View>
        <Button onPress={() => router.replace("/(home)")}>
          <Text>Go back home</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("CohortPage.search_family")}
        keyboardType="default"
        accessibilityLabel={t("CohortPage.search_family")}
      />
      <FlatList
        data={filteredFamilies}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push("/(families)/(modules)/module")}
            className="p-4 border flex-row justify-between mb-4 border-gray-200 rounded-xl"
          >
            <View>
              <Text className="text-sm text-gray-600">{item.id}</Text>
              <Text className="text-lg font-semibold">{item.name}</Text>
              <Text className="text-sm text-gray-600">{item.location}</Text>
            </View>
            <View>
              {item.location === "Kigali" ? (
                <View className="flex-col justify-center items-center h-8 w-8 bg-green-500 rounded-full">
                  <TabBarIcon
                    name="check"
                    family="MaterialIcons"
                    size={16}
                    color="#fff"
                  />
                </View>
              ) : (
                <View className="flex-col justify-center items-center h-8 w-8 bg-red-500 rounded-full">
                  <TabBarIcon
                    name="close"
                    family="MaterialIcons"
                    size={16}
                    color="#fff"
                  />
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
};

export default HistoryScreen;
