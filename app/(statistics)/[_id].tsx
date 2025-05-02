import { SafeAreaView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { Card } from "~/components/ui/card";
import { useGetStatistics } from "~/services/statistics";
import { NotFound } from "~/components/ui/not-found";

const IzuIndexStatisticsScreen = () => {
  const { t } = useTranslation();
  const { _id, izu_name } = useLocalSearchParams<{
    _id: string;
    izu_name: string;
  }>();
  if (!_id) {
    return (
      <NotFound
        title="Statistics not found"
        description="Please check the URL and try again."
        redirectTo={() => router.back()}
      />
    );
  }
  console.log("id", _id);
  console.log("izu_name", izu_name);

  const { statistics, isLoading } = useGetStatistics();

  console.log("statistics", JSON.stringify(statistics, null, 2));
  const izuStatistics = statistics?.find((stat) => stat.izucode === _id);

  console.log("izuStatistics", JSON.stringify(izuStatistics, null, 2));

  if (isLoading) {
    return (
      <View className="flex-1 bg-background flex-col items-center justify-center">
        {[1, 2, 3].map((index) => (
          <SimpleSkeletonItem key={index} />
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("StatisticsPage.izu_statistics")}
      />
      <View className="flex-1 p-4 bg-white">
        <Text className="text-xl font-bold mb-4">{izu_name || "Izu"}</Text>

        {/* Family Card */}
        <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
          <Text className="text-lg font-semibold mb-2">
            {t("StatisticsPage.families", "Families")}
          </Text>
          <Text className="text-2xl font-bold text-primary">
            {izuStatistics?.izu_statistics?.total_families}
          </Text>
          <Text className="text-gray-500">
            {t("StatisticsPage.total_families", "Total Families")}
          </Text>
        </Card>

        {/* Visits Card */}
        <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
          <Text className="text-lg font-semibold mb-2">
            {t("StatisticsPage.visits", "Visits")}
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-2xl font-bold text-primary">
                {izuStatistics?.izu_statistics?.visits_done}
              </Text>
              <Text className="text-gray-500">
                {t("StatisticsPage.visits_done", "Visits Done")}
              </Text>
            </View>
            <View>
              <Text className="text-2xl font-bold text-black">
                {izuStatistics?.izu_statistics?.all_visits_to_make}
              </Text>
              <Text className="text-gray-500">
                {t("StatisticsPage.total_visits", "Total Visits")}
              </Text>
            </View>
          </View>
        </Card>

        {/* Risk of Harms Section */}
        {izuStatistics?.izu_statistics?.riskofharms !== 0 && (
          <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
            <Text className="text-lg font-semibold mb-2">
              {t("StatisticsPage.risk_of_harms", "Risk of Harms")}
            </Text>
            <Text className="text-2xl font-bold text-primary">
              {izuStatistics?.izu_statistics?.riskofharms}
            </Text>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
};

export default IzuIndexStatisticsScreen;
