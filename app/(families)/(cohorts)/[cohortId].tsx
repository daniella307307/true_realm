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

const CohortIndexScreen = () => {
  const { cohortId } = useLocalSearchParams();
  const { t } = useTranslation();
  const { control, handleSubmit, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery").toLowerCase();

  // Filter families based on cohortId
  const filteredFamilies = families
    .filter(
      (family) => cohortId === "all" || family.cohort === Number(cohortId)
    )
    .filter(
      (family) =>
        family.name.toLowerCase().includes(searchQuery) ||
        family.id.toLowerCase().includes(searchQuery)
    );

  if (!cohortId) {
    return (
      <View>
        <Text>Missing cohortId</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-xl font-bold mb-4">
        {cohortId === "all" ? "All Cohorts" : `Cohort ${cohortId}`}
      </Text>
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
              <Text className="text-sm py-2 text-gray-600">{item.id}</Text>
              <Text className="text-lg font-semibold">{item.name}</Text>
              <Text className="text-sm py-2 text-gray-600">
                {item.location}
              </Text>
            </View>
            <View>
              <Text className="text-sm py-2 text-gray-600">
                {t("CohortPage.cohort")} {item.cohort}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
};

export default CohortIndexScreen;
