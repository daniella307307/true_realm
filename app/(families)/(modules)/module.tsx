import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import React from "react";
import { useGetCategories } from "~/services/category";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomInput from "~/components/ui/input";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { ICategories } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";

const SkeletonLoader = () => {
  return (
    <View className="p-4 border flex-row items-center mb-4 border-gray-200 rounded-xl bg-gray-200 animate-pulse">
      <View className="w-6 h-6 bg-gray-400 rounded-full" />
      <View className="ml-4 flex-1">
        <View className="w-3/4 h-4 bg-gray-400 rounded-md mb-2" />
        <View className="w-1/2 h-3 bg-gray-300 rounded-md" />
      </View>
    </View>
  );
};

const ModuleScreen = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: useGetCategories,
  });
  const { t } = useTranslation();
  const { control } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("Search Module")}
        keyboardType="default"
        accessibilityLabel={t("CohortPage.search_module")}
      />

      {isLoading ? (
        <>
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </>
      ) : (
        <>
          <Pressable
            onPress={() => router.push("/(families)/(forms)/forms")}
            className="p-4 border flex-row items-center mb-4 border-red-500 rounded-xl bg-red-50"
          >
            <TabBarIcon
              name="warning"
              family="MaterialIcons"
              size={24}
              color="#D92020"
            />
            <View className="ml-4">
              <Text className="text-lg font-semibold text-red-500">
                Risk of Harm
              </Text>
              <Text className="text-sm text-red-600">
                This module is a high priority for your attention.
              </Text>
            </View>
          </Pressable>
          <FlatList
            data={categories?.data}
            keyExtractor={(item: ICategories) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push("/(families)/(forms)/forms")}
                className="p-4 border flex-row items-center mb-4 border-gray-200 rounded-xl"
              >
                <TabBarIcon
                  name="chat"
                  family="MaterialIcons"
                  size={24}
                  color="#71717A"
                />
                <View className="ml-4">
                  <Text className="text-lg font-semibold">{item.name}</Text>
                  <Text className="text-sm text-gray-600">
                    {item.description}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </>
      )}
    </View>
  );
};

export default ModuleScreen;
