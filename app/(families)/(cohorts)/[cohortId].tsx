import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import CustomInput from "~/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetFamilies, fetchFamiliesFromRemote } from "~/services/families";
import Skeleton from "~/components/ui/skeleton";

const CohortIndexScreen = () => {
  const { cohortId } = useLocalSearchParams();
  const { t } = useTranslation();
  const { control, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string().optional(),
      })
    ),
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery");

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const families = useGetFamilies();

  useEffect(() => {
    if (families.length > 0) {
      setIsLoading(false);
    }
  }, [families]);

  const filteredFamilies = families
    .filter((family) => cohortId === "all" || family.cohort === cohortId)
    .filter((family) =>
      searchQuery
        ? family.hh_head_fullname.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFamiliesFromRemote();
    setRefreshing(false);
  };

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
      {isLoading ? (
        <View className="mt-6">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} />
          ))}
        </View>
      ) : filteredFamilies.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">{t("CohortPage.no_families")}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFamilies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(modules)/(families)/${item.id}`)}
              className="p-4 border flex-row justify-between mb-4 border-gray-200 rounded-xl"
            >
              <View>
                <Text className="text-sm py-2 text-gray-600">{item.hh_id}</Text>
                <Text className="text-lg font-semibold">
                  {item.hh_head_fullname}
                </Text>
                <Text className="text-sm py-2 text-gray-600">{item.village_name}</Text>
              </View>
              <View>
                <Text className="text-sm py-2 text-gray-600">
                  {t("CohortPage.cohort")} {item.cohort}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

export default CohortIndexScreen;
