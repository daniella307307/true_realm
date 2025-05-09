import { SafeAreaView, View, ScrollView, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { Card } from "~/components/ui/card";
import { useGetIzuStatistics } from "~/services/statistics";
import { NotFound } from "~/components/ui/not-found";
import { useState } from "react";

// Define interface for monitoring response
interface MonitoringResponseData {
  id: number;
  family_id: string;
  date_recorded: string;
  type: string;
  score_data: {
    total: number;
    possible: number;
    percentage: number;
    fields_count: number;
    details: Record<string, any>;
  };
}

const IzuIndexStatisticsScreen = () => {
  const { t } = useTranslation();
  const { _id, izu_name, izucode } = useLocalSearchParams<{
    _id: string;
    izu_name: string;
    izucode: string;
  }>();
  
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  
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
  console.log("izucode", izucode);

  const selectedIzuId = parseInt(_id);
  const { 
    statistics: izuStatistics, 
    score, 
    totalPoints, 
    isLoading,
    monitoringResponses 
  } = useGetIzuStatistics(selectedIzuId);

  console.log("score", score);
  console.log("totalPoints", totalPoints);
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

  // Function to get score color based on percentage
  const getScoreColor = (scoreValue: number, maxValue: number) => {
    const percentage = (scoreValue / maxValue) * 100;
    if (percentage >= 75) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("StatisticsPage.izu_statistics")}
      />
      <ScrollView className="flex-1 p-4 bg-white">
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

        {/* Performance Score Card */}
        <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
          <Text className="text-lg font-semibold mb-2">
            {t("StatisticsPage.performance_score", "Performance Score")}
          </Text>
          <View className="flex-row justify-between items-center">
            {totalPoints > 0 ? (
              <>
                <Text className={`text-2xl font-bold ${getScoreColor(score, totalPoints)}`}>
                  {score}/{totalPoints}
                </Text>
                <Text className={`text-lg font-medium ${getScoreColor(score, totalPoints)}`}>
                  {Math.round((score / totalPoints) * 100)}%
                </Text>
              </>
            ) : (
              <Text className="text-2xl font-bold text-gray-500">The score of izu below:</Text>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={() => setShowScoreDetails(!showScoreDetails)}
            className="mt-2 py-2"
          >
            <Text className="text-primary font-medium">
              {showScoreDetails ? "Hide details" : "Show details"}
            </Text>
          </TouchableOpacity>
          
          {showScoreDetails && monitoringResponses && monitoringResponses.length > 0 && (
            <View className="mt-2">
              <Text className="font-semibold mb-2">Monitoring History</Text>
              {monitoringResponses.map((response: MonitoringResponseData, index: number) => (
                <View key={index} className="mb-3 p-2 bg-white rounded-md">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-700">
                      {formatDate(response.date_recorded)}
                    </Text>
                    <View className="flex-row">
                      <Text className={`font-semibold ${getScoreColor(
                        response.score_data?.total || 0, 
                        response.score_data?.possible || 1
                      )}`}>
                        {response.score_data?.percentage || 0}%
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-500 text-sm">
                    Score: {response.score_data?.total || 0}/{response.score_data?.possible || 0}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Fields scored: {response.score_data?.fields_count || 0}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default IzuIndexStatisticsScreen;
