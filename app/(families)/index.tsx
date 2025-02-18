import { useQuery } from "@tanstack/react-query";
import { Href, router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useGetFamilies } from "~/services/families";
import { IFamilies } from "~/types";

const CohortPage = () => {
  const { t } = useTranslation();

  const {
    data: families,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["families"],
    queryFn: useGetFamilies,
  });

  const totalFamilies = families?.families.length || 0;

  // Group families by cohort
  const familiesByCohort = families?.families.reduce((acc, family) => {
    if (!acc[parseInt(family.cohort)]) {
      acc[parseInt(family.cohort)] = [];
    }
    acc[parseInt(family.cohort)].push(family);
    return acc;
  }, {} as Record<number, IFamilies[]>);

  const cohortData = Object.entries(familiesByCohort ?? {}).map(
    ([cohort, families]) => ({
      cohort: Number(cohort),
      count: families.length,
    })
  );

  return (
    <ScrollView className="bg-white pt-6">
      <View className="flex-row flex-wrap justify-between px-6">
        <Pressable
          // When we click on all cohorts we should navigate to the (cohorts)/${all cohorts combined}
          // page where we can see all the cohorts combined
          onPress={() => router.push("/(cohorts)/all")}
          className="flex flex-col bg-[#A23A910D] border border-[#0000001A] justify-between gap-6 p-6 rounded-xl w-[48%] mb-4"
        >
          <TabBarIcon name="family-restroom" family="MaterialIcons" />
          <View>
            <Text className="text-sm py-2 text-[#71717A]">
              {totalFamilies} {t("HomePage.families")}
            </Text>
            <Text className="text-md font-semibold">
              {t("CohortPage.all_cohorts")}
            </Text>
          </View>
        </Pressable>

        {cohortData.map((data, index) => (
          <TouchableOpacity
            onPress={() => router.push(`/(cohorts)/${data.cohort}`)}
            key={index}
            className="flex flex-col bg-[#A23A910D] border border-[#0000001A] justify-between gap-6 p-6 rounded-xl w-[48%] mb-4"
          >
            <TabBarIcon name="family-restroom" family="MaterialIcons" />
            <View>
              <Text className="text-sm py-2 text-[#71717A]">
                {t("CohortPage.cohort")} {data.cohort}
              </Text>
              <Text className="text-md font-semibold">
                {data.count} {t("HomePage.families")}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default CohortPage;
