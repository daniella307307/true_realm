import React from "react";
import { View } from "react-native";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";

const CohortStatisticsScreen = () => {
  const { t } = useTranslation();

  const families = [
    { id: 1, name: "Family A", monitored: true },
    { id: 2, name: "Family B", monitored: false },
    { id: 3, name: "Family C", monitored: true },
    { id: 4, name: "Family D", monitored: true },
    { id: 5, name: "Family E", monitored: false },
    { id: 6, name: "Family F", monitored: true },
    { id: 7, name: "Family G", monitored: true },
    { id: 8, name: "Family H", monitored: false },
    { id: 9, name: "Family I", monitored: true },
    { id: 10, name: "Family J", monitored: true },
  ];

  const totalFamilies = families.length;
  const monitoredFamilies = families.filter(
    (family) => family.monitored
  ).length;
  const monitoringPercentage = (
    (monitoredFamilies / totalFamilies) *
    100
  ).toFixed(2);

  return (
    <View className="flex-1 p-4 bg-background">
      <View className="flex-row justify-between">
        <View className="flex flex-col bg-[#A23A910D] border border-[#0000001A] items-center gap-6 py-6 rounded-xl w-[48%] mb-4">
          <Text className="text-2xl font-bold text-primary">
            {monitoredFamilies} / {totalFamilies}
          </Text>
          <Text className="text-gray-500">
            {t("StatisticsPage.number_of_families_visited")}
          </Text>
        </View>

        <View className="flex flex-col bg-[#A23A910D] border border-[#0000001A] items-center gap-6 py-6 rounded-xl w-[48%] mb-4">
          <Text className="text-2xl font-bold text-primary">
            {monitoringPercentage}%
          </Text>
          <Text className="text-gray-500">{t("StatisticsPage.monitoring_behaviors")}</Text>
        </View>
      </View>
    </View>
  );
};

export default CohortStatisticsScreen;
