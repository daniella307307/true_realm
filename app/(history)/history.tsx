import React from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { IFamilies } from "~/types";
import { useTranslation } from "react-i18next";
import CustomInput from "~/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { useQuery } from "@tanstack/react-query";
import { useGetFamilies } from "~/services/families";

const HistoryScreen = () => {
  const cohortId: number | "all" = 1;
  const { t } = useTranslation();
  const { control, handleSubmit, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery");

  const {
    data: families,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["families"],
    queryFn: useGetFamilies,
  });
  // Filter families based on cohortId
  const filteredFamilies = families?.families
    .filter(
      (family) =>
        cohortId.toString() === "all" || parseInt(family.cohort) === cohortId
    )
    .filter((family) =>
      !searchQuery || family.hh_head_fullname.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
        placeholder={t("HistoryPage.search_family")}
        keyboardType="default"
        accessibilityLabel={t("HistoryPage.search_family")}
      />
      <FlatList
        data={filteredFamilies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {}}
            className="p-4 border flex-row justify-between mb-4 border-gray-200 rounded-xl"
          >
            <View>
              <Text className="text-sm text-gray-600">{item.hh_id}</Text>
              <Text className="text-lg font-semibold">{item.hh_head_fullname}</Text>
              <Text className="text-sm text-gray-600">{item.village_name}</Text>
            </View>
            <View>
              {item.village_name === "Bweranka" ? (
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
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default HistoryScreen;
