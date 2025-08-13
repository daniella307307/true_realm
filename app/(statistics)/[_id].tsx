import { SafeAreaView, View, ScrollView, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { Card } from "~/components/ui/card";
import { NotFound } from "~/components/ui/not-found";
import { useState, useMemo } from "react";
import { useGetFamilies } from "~/services/families";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { useGetIzuStatisticsByMonitoringResponse } from "~/services/monitoring/monitoring-responses";

// Define interface for monitoring response
interface MonitoringResponseData {
  id: number;
  family_id: string;
  date_recorded: string;
  type: string;
  form_id: string;
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
        title={t("StatisticsPage.not_found")}
        description={t("StatisticsPage.check_url")}
        redirectTo={() => router.back()}
      />
    );
  }

  const selectedIzuId = parseInt(_id);
  const { monitoringResponses } =
    useGetIzuStatisticsByMonitoringResponse(selectedIzuId);

  const { families } = useGetFamilies();
  const { submissions: surveySubmissions } = useGetAllSurveySubmissions(true);

  // Calculate total families for this IZU
  const totalFamilies = families.filter(
    (family) => family.izucode === izucode
  ).length;

  // Calculate visits done for this IZU grouped by source module
  const visitsByModule = useMemo(() => {
    const moduleGroups = surveySubmissions
      .filter(
        (submission) =>
          submission.form_data?.izucode === izucode &&
          submission.form_data?.project_id === 3 &&
          submission.form_data?.source_module_id !== 22
      )
      .reduce<Record<string, number>>((acc, submission) => {
        const moduleId = String(submission.form_data?.source_module_id || 'unknown');
        acc[moduleId] = (acc[moduleId] || 0) + 1;
        return acc;
      }, {});

    return moduleGroups;
  }, [surveySubmissions, izucode]);

  // Calculate total visits done
  const totalVisitsDone = Object.values(visitsByModule).reduce((sum: number, count: number) => sum + count, 0);

  // Calculate total visits (families * 16 modules)
  const totalVisits = totalFamilies * 16;

  // Calculate average percentage from monitoring responses
  const averagePercentage =
    monitoringResponses?.length > 0
      ? monitoringResponses.reduce(
          (acc, curr) => acc + (curr.score_data?.percentage || 0),
          0
        ) / monitoringResponses.length
      : 0;

  // Calculate risk of harms - now just using the unified surveySubmissions
  const riskOfHarmsSubmissions = surveySubmissions.filter(
    (submission) =>
      submission.form_data?.project_module_id === 177 &&
      submission.form_data?.project_id === 17 &&
      submission.form_data?.izucode === izucode
  );
  const riskOfHarms = riskOfHarmsSubmissions.length;

  // Function to get score color based on percentage
  const getScoreColor = (scoreValue: number, maxValue: number) => {
    const percentage = (scoreValue / maxValue) * 100;
    if (percentage >= 50) return "text-green-600";
    return "text-red-600";
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Function to navigate to monitoring responses detail
  const navigateToMonitoringDetail = (type: 'visits' | 'risk', submissions: any[]) => {
    router.push({
      pathname: "/monitoring-detail" as any,
      params: {
        type,
        submissions: JSON.stringify(submissions)
      }
    });
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
            {t("StatisticsPage.families")}
          </Text>
          <Text className="text-2xl font-bold text-primary">
            {totalFamilies}
          </Text>
          <Text className="text-gray-500">
            {t("StatisticsPage.total_families")}
          </Text>
        </Card>

        {/* Visits Card */}
        <TouchableOpacity 
          onPress={() => {
            const visitSubmissions = surveySubmissions.filter(
              (submission) =>
                submission.form_data?.izucode === izucode &&
                submission.form_data?.project_id === 3 &&
                submission.form_data?.source_module_id !== 22
            );
            navigateToMonitoringDetail('visits', visitSubmissions);
          }}
        >
          <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
            <Text className="text-lg font-semibold mb-2">
              {t("StatisticsPage.visits")}
            </Text>
            <View className="flex-row justify-between mb-4">
            <View className="w-[160px]">
            <Text className="text-2xl font-bold text-primary">
                  {totalVisitsDone}
                </Text>
                <Text className="text-gray-500">
                  {t("StatisticsPage.visits_done")}
                </Text>
              </View>
              <View className="w-[160px]">
                <Text className="text-2xl font-bold text-black">
                  {totalVisits}
                </Text>
                <Text className="text-gray-500">
                  {t("StatisticsPage.total_visits")}
                </Text>
              </View>
            </View>
            
            {/* Module-wise breakdown */}
            <View className="mt-2">
              <Text className="text-md font-semibold mb-2">
                {t("StatisticsPage.visits_by_module", "Visits by Module")}
              </Text>
              {Object.entries(visitsByModule).map(([moduleId, count]) => (
                <View key={moduleId} className="flex-row justify-between py-1">
                  <Text className="text-gray-600">
                    {t("StatisticsPage.module", "Module")} {moduleId}
                  </Text>
                  <Text className="font-medium">{count}</Text>
                </View>
              ))}
            </View>
          </Card>
        </TouchableOpacity>

        {/* Performance Score Card */}
        <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
          <Text className="text-lg font-semibold mb-2">
            {t("StatisticsPage.performance_score")}
          </Text>
          <View className="flex-row justify-between items-center">
            {monitoringResponses && monitoringResponses.length > 0 ? (
              <>
                <Text
                  className={`text-2xl font-bold ${getScoreColor(
                    averagePercentage,
                    100
                  )}`}
                >
                  {Math.round(averagePercentage)}%
                </Text>
                <Text
                  className={`text-lg font-medium ${getScoreColor(
                    averagePercentage,
                    100
                  )}`}
                >
                  {t("StatisticsPage.average_score")}
                </Text>
              </>
            ) : (
              <Text className="text-2xl font-bold text-gray-500">
                {t("StatisticsPage.no_monitoring_data")}
              </Text>
            )}
          </View>

          {monitoringResponses && monitoringResponses.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowScoreDetails(!showScoreDetails)}
              className="mt-2 py-2"
            >
              <Text className="text-primary font-medium">
                {showScoreDetails
                  ? t("StatisticsPage.hide_details")
                  : t("StatisticsPage.show_details")}
              </Text>
            </TouchableOpacity>
          )}

          {showScoreDetails &&
            monitoringResponses &&
            monitoringResponses.length > 0 && (
              <View className="mt-2">
                <Text className="font-semibold mb-2">
                  {t("StatisticsPage.monitoring_history", "Monitoring History")}
                </Text>
                {monitoringResponses.map((response: MonitoringResponseData, index: number) => (
                  <TouchableOpacity
                    key={index}
                    className="mb-3 p-2 bg-white rounded-md"
                    onPress={() => {
                      // Navigate to score details page
                      router.push({
                        pathname: "/score-details" as any,
                        params: {
                          score_data: JSON.stringify(response.score_data),
                          date: response.date_recorded,
                          form_id: response.form_id,
                        },
                      });
                    }}
                  >
                    <View className="flex-row justify-between">
                      <Text className="text-gray-700">
                        {formatDate(response.date_recorded)}
                      </Text>
                      <View className="flex-row">
                        <Text
                          className={`font-semibold ${getScoreColor(
                            response.score_data?.total || 0,
                            response.score_data?.possible || 1
                          )}`}
                        >
                          {response.score_data?.percentage || 0}%
                        </Text>
                      </View>
                    </View>
                    <Text className="text-gray-500 text-sm">
                      {t("StatisticsPage.score")}:{" "}
                      {response.score_data?.total || 0}/
                      {response.score_data?.possible || 0}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {t("StatisticsPage.fields_scored")}:{" "}
                      {response.score_data?.fields_count || 0}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
        </Card>

        {/* Risk of Harms Card */}
        <TouchableOpacity 
          onPress={() => navigateToMonitoringDetail('risk', riskOfHarmsSubmissions)}
        >
          <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
            <Text className="text-lg font-semibold mb-2">
              {t("StatisticsPage.risk_of_harms")}
            </Text>
            <Text className="text-2xl font-bold text-primary">{riskOfHarms}</Text>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default IzuIndexStatisticsScreen;
