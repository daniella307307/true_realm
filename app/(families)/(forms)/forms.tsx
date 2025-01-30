import { View, Text, FlatList, Pressable } from "react-native";
import React, { useState } from "react";
import { useGetForms } from "~/services/forms";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomInput from "~/components/ui/input";
import { useTranslation } from "react-i18next";
import { Href, router } from "expo-router";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { IForms } from "~/types";

const FormsScreen = () => {
  const { data: forms, isLoading } = useQuery({
    queryKey: ["forms"],
    queryFn: useGetForms,
  });
  const { t } = useTranslation();
  const { control } = useForm({
    resolver: zodResolver(z.object({ searchQuery: z.string() })),
    mode: "onChange",
  });

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("Search for forms")}
        keyboardType="default"
        accessibilityLabel={t("search_forms")}
      />

      {isLoading ? (
        // Skeleton Loader while fetching data
        <View className="mt-6">
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              className="p-4 border border-gray-200 flex-row items-center mb-4 rounded-xl bg-gray-100 animate-pulse"
            >
              <View className="w-6 h-6 bg-gray-300 rounded-full" />
              <View className="ml-4 flex-1">
                <View className="h-4 w-3/5 bg-gray-300 rounded-md mb-2" />
                <View className="h-3 w-2/3 bg-gray-300 rounded-md" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={forms?.data?.data || []}
          keyExtractor={(item: IForms) => item.id.toString()}
          ListEmptyComponent={() => (
            <Text className="text-center text-gray-500 mt-6">
              {t("No forms available")}
            </Text>
          )}
          renderItem={({ item }: { item: IForms }) => (
            <Pressable
              onPress={() =>
                router.push(
                  `/(families)/(forms)/(elements)/${item.id}` as Href<string>
                )
              }
              className="p-4 border flex-row items-center mb-4 border-gray-200 rounded-xl"
            >
              <TabBarIcon
                name="description"
                family="MaterialIcons"
                size={24}
                color="#71717A"
              />
              <View className="ml-4">
                <Text className="text-lg font-semibold">{item.name}</Text>
                <Text className="text-sm text-gray-600">
                  {item.description || "No description available"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

export default FormsScreen;
