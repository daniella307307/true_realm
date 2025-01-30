import { Href, router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { IFamilies } from "~/types";

const families: IFamilies[] = [
  {
    id: "F-143456-12347",
    name: "John Doe",
    cohort: 1,
  },
  {
    id: "F-123456-12347",
    name: "Jane Doe",
    cohort: 2,
  },
  {
    id: "F-113456-12347",
    name: "John Smith",
    cohort: 2,
  },
  {
    id: "F-193456-12347",
    name: "Jane Smith",
    cohort: 1,
  },
  {
    id: "F-148456-12347",
    name: "Jane Smith",
    cohort: 1,
  },
  {
    id: "F-101456-12347",
    name: "Jane Smith",
    cohort: 1,
  },
];

const CohortPage = () => {
  const { t } = useTranslation();
  // Calculate total number of families
  const totalFamilies = families.length;

  // Group families by cohort
  const familiesByCohort = families.reduce((acc, family) => {
    if (!acc[family.cohort]) {
      acc[family.cohort] = [];
    }
    acc[family.cohort].push(family);
    return acc;
  }, {} as Record<number, IFamilies[]>);

  // Create an array of cohort data
  const cohortData = Object.entries(familiesByCohort).map(
    ([cohort, families]) => ({
      cohort: Number(cohort),
      count: families.length,
    })
  );

  return (
    <ScrollView className="bg-white pt-6">
      <View className="flex-row flex-wrap justify-between px-6">
        <Pressable
          onPress={() => {}}
          className="flex flex-col bg-[#A23A910D] border border-[#0000001A] justify-between gap-6 p-6 rounded-xl w-[48%] mb-4"
        >
          <TabBarIcon name="family-restroom" family="MaterialIcons" />
          <View>
            <Text className="text-sm text-[#71717A]">
              {totalFamilies} {t("HomePage.families")}
            </Text>
            <Text className="text-md font-semibold">
              {t("CohortPage.all_cohorts")}
            </Text>
          </View>
        </Pressable>

        {cohortData.map((data, index) => (
          <Pressable
            onPress={() => router.push(`/(cohorts)/${data.cohort}`)}
            key={index}
            className="flex flex-col bg-[#A23A910D] border border-[#0000001A] justify-between gap-6 p-6 rounded-xl w-[48%] mb-4"
          >
            <TabBarIcon name="family-restroom" family="MaterialIcons" />
            <View>
              <Text className="text-sm text-[#71717A]">
                {t("CohortPage.cohort")} {data.cohort}
              </Text>
              <Text className="text-md font-semibold">
                {data.count} {t("HomePage.families")}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

export default CohortPage;
