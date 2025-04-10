import { FlatList, Pressable, SafeAreaView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { useGetIzuById } from "~/services/izus";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import Skeleton from "~/components/ui/skeleton";
import { Card } from "~/components/ui/card";
import { SurveySubmission } from "~/models/surveys/survey-submission";

interface IRiskOfHarm {
  id: number;
  status: "follow-up" | "pending" | "resolved";
  description: string;
  familyId: number;
}

const CohortStatisticsScreen = () => {
  const { t } = useTranslation();
  const { id, cohortId } = useLocalSearchParams();
  const { data: izu, isLoading: izuLoading } = useGetIzuById(Number(id));
  const { surveySubmissions, isLoading: surveySubmissionsLoading } = useGetAllSurveySubmissions();

  const isLoading = izuLoading || surveySubmissionsLoading;

  // Calculate visits
  const calculateVisits = () => {
    if (!surveySubmissions || !izu) return { done: 0, total: 0 };

    const izuSurveys = surveySubmissions.filter((s) => s.izucode === izu.user_code);
    const uniqueFamilies = new Set(izuSurveys.map((s) => s.family));
    const totalFamilies = uniqueFamilies.size;
    
    // Count completed visits (all forms in a module submitted)
    const completedVisits = izuSurveys.reduce((acc, survey) => {
      const moduleForms = izuSurveys.filter(
        (s) => s.project_module_id === survey.project_module_id && s.family === survey.family
      );
      return moduleForms.length === 4 ? acc + 1 : acc;
    }, 0);

    return {
      done: completedVisits,
      total: totalFamilies * 16 // 16 modules per family
    };
  };

  const visits = calculateVisits();

  // Mock risk of harms data - replace with actual data
  const riskOfHarms: IRiskOfHarm[] = [
    { id: 1, status: "follow-up", description: "Child malnutrition", familyId: 1 },
    { id: 2, status: "pending", description: "Domestic violence", familyId: 2 },
    { id: 3, status: "resolved", description: "School dropout", familyId: 3 },
  ];

  const groupedRisks = riskOfHarms.reduce((acc, risk) => {
    if (!acc[risk.status]) {
      acc[risk.status] = [];
    }
    acc[risk.status].push(risk);
    return acc;
  }, {} as Record<string, IRiskOfHarm[]>);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <HeaderNavigation
          showLeft={true}
          showRight={true}
          title={t("StatisticsPage.cohort_statistics")}
        />
        <View className="flex-1 p-4 bg-white">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("StatisticsPage.cohort_statistics", "Cohort Statistics")}
      />
      <View className="flex-1 p-4 bg-white">
        <Text className="text-xl font-bold mb-4">
          {izu?.name} - {cohortId}
        </Text>

        {/* Family Card */}
        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-2">
            {t("StatisticsPage.families", "Families")}
          </Text>
          <Text className="text-2xl font-bold text-primary">
            {visits.total / 16} {/* Total families = total visits / 16 modules */}
          </Text>
          <Text className="text-gray-500">
            {t("StatisticsPage.total_families", "Total Families")}
          </Text>
        </Card>

        {/* Visits Card */}
        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold mb-2">
            {t("StatisticsPage.visits", "Visits")}
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-2xl font-bold text-primary">
                {visits.done}
              </Text>
              <Text className="text-gray-500">
                {t("StatisticsPage.visits_done", "Visits Done")}
              </Text>
            </View>
            <View>
              <Text className="text-2xl font-bold text-gray-500">
                {visits.total}
              </Text>
              <Text className="text-gray-500">
                {t("StatisticsPage.total_visits", "Total Visits")}
              </Text>
            </View>
          </View>
        </Card>

        {/* Risk of Harms Section */}
        <Text className="text-lg font-semibold mb-4">
          {t("StatisticsPage.risk_of_harms", "Risk of Harms")}
        </Text>

        {/* <View className="mb-4">
          <Text className="text-md font-semibold mb-2 text-yellow-600">
            {t("StatisticsPage.follow_up", "Follow-up")} ({groupedRisks["follow-up"]?.length || 0})
          </Text>
          <FlatList
            data={groupedRisks["follow-up"]}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Card className="p-3 mb-2">
                <Text>{item.description}</Text>
                <Text className="text-gray-500">Family ID: {item.familyId}</Text>
              </Card>
            )}
          />
        </View>

        <View className="mb-4">
          <Text className="text-md font-semibold mb-2 text-red-600">
            {t("StatisticsPage.pending", "Pending")} ({groupedRisks["pending"]?.length || 0})
          </Text>
          <FlatList
            data={groupedRisks["pending"]}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Card className="p-3 mb-2">
                <Text>{item.description}</Text>
                <Text className="text-gray-500">Family ID: {item.familyId}</Text>
              </Card>
            )}
          />
        </View>

        <View className="mb-4">
          <Text className="text-md font-semibold mb-2 text-green-600">
            {t("StatisticsPage.resolved", "Resolved")} ({groupedRisks["resolved"]?.length || 0})
          </Text>
          <FlatList
            data={groupedRisks["resolved"]}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Card className="p-3 mb-2">
                <Text>{item.description}</Text>
                <Text className="text-gray-500">Family ID: {item.familyId}</Text>
              </Card>
            )}
          />
        </View> */}
      </View>
    </SafeAreaView>
  );
};

export default CohortStatisticsScreen; 