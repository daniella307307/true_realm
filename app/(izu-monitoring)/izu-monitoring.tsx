import React, { useState, useTransition } from "react";
import { FlatList, Pressable, SafeAreaView, View } from "react-native";
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
import { useQuery } from "@tanstack/react-query";
import { useGetIZUser } from "~/services/user";
import Skeleton from "~/components/ui/skeleton";
import HeaderNavigation from "~/components/ui/header";

const IzuMonitoringScreen = () => {
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
    data: izuMembers,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["izuMembers"],
    queryFn: useGetIZUser,
  });

  const filteredIzuMembers = izuMembers?.izus.filter((member) => {
    if (!searchQuery) return true;
    return member.name.toLowerCase().includes(searchQuery);
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("IzuMonitoringPage.title")}
      />
      <View className="flex-1 p-4 bg-white">
        <Text className="text-xl font-bold mb-4">
          {t("IzuMonitoringPage.all_izu")}
        </Text>
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("IzuMonitoringPage.search_izu")}
          keyboardType="default"
          accessibilityLabel={t("IzuMonitoringPage.search_izu")}
        />
        {isLoading ? (
          [1, 2, 3, 4].map((index) => <Skeleton key={index} />)
        ) : (
          <FlatList
            data={filteredIzuMembers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push("/(forms)/form-izu")}
                className="p-4 border flex-row items-center justify-between mb-4 border-gray-200 rounded-xl"
              >
                <View className="flex-row items-center">
                  <Text className="text-lg font-semibold">{item.id}</Text>
                  <Text className="text-lg ml-2 font-semibold">
                    {item.name}
                  </Text>
                </View>
                <Pressable onPress={() => {}}>
                  <TabBarIcon
                    name="arrow-down-left"
                    family="Feather"
                    size={24}
                    color="#71717A"
                  />
                </Pressable>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default IzuMonitoringScreen;
