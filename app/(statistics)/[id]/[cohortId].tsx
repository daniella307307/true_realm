import { SafeAreaView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { useGetIzuById } from "~/services/izus";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { Card } from "~/components/ui/card";

interface IRiskOfHarm {
  id: string;
  status: "followup" | "pending" | "resolved";
  description: string;
  familyId: string | null;
}

const CohortStatisticsScreen = () => {
  const { t } = useTranslation();
  const { id, cohortId } = useLocalSearchParams();
  const { izu, isLoading: izuLoading } = useGetIzuById(Number(id));
  const { surveySubmissions, isLoading: surveySubmissionsLoading } =
    useGetAllSurveySubmissions();

  const isLoading = izuLoading || surveySubmissionsLoading;

  // Calculate visits
  const calculateVisits = () => {
    if (!surveySubmissions || !izu) return { done: 0, total: 0 };

    const izuSurveys = surveySubmissions.filter(
      (s) => s.form_data?.izucode === izu.user_code
    );
    const uniqueFamilies = new Set(izuSurveys.map((s) => s.form_data?.family));
    const totalFamilies = uniqueFamilies.size;

    console.log("izuSurveys", JSON.stringify(izuSurveys, null, 2));

    // Count completed visits (all forms in a module submitted)
    const completedVisits = izuSurveys.reduce((acc, survey) => {
      const moduleForms = izuSurveys.filter(
        (s) =>
          s.form_data?.project_module_id === survey.form_data?.project_module_id &&
          s.form_data?.family === survey.form_data?.family
      );
      return moduleForms.length === 4 ? acc + 1 : acc;
    }, 0);

    return {
      done: completedVisits,
      total: totalFamilies * 16, // 16 modules per family
    };
  };

  const visits = calculateVisits();

  // Calculate risk of harms based on survey_id 6 and formStatus
  const riskOfHarms = surveySubmissions
    .filter((s) => s.form_data?.survey_id === 6 && s.form_data?.izucode === izu?.user_code)
    .map((s) => ({
      id: s._id.toString(),
      status: s.form_data?.form_status as "followup" | "pending" | "resolved",
      description: s.answers?.description || "No description provided",
      familyId: s.form_data?.family,
    }));

  const groupedRisks = riskOfHarms.reduce((acc, risk) => {
    if (!acc[risk.status]) {
      acc[risk.status] = [];
    }
    // Convert undefined familyId to null before pushing
    acc[risk.status].push({
      ...risk,
      familyId: risk.familyId ?? null
    });
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
            <SimpleSkeletonItem key={index} />
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
        <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
          <Text className="text-lg font-semibold mb-2">
            {t("StatisticsPage.families", "Families")}
          </Text>
          <Text className="text-2xl font-bold text-primary">
            {visits.total / 16}
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
                {visits.done}
              </Text>
              <Text className="text-gray-500">
                {t("StatisticsPage.visits_done", "Visits Done")}
              </Text>
            </View>
            <View>
              <Text className="text-2xl font-bold text-black">
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

        {/* Now categorize the risk of harms by status, show the number of risk of harms submitted under each status */}
        {Object.entries(groupedRisks).map(([status, risks]) => (
          <Card
            key={status}
            className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]"
          >
            <Text className="text-lg font-semibold mb-2">
              {status === "followup"
                ? t("StatisticsPage.followup", "Submitted")
                : status === "pending"
                ? t("StatisticsPage.pending", "Pending")
                : t("StatisticsPage.resolved", "Resolved")}
            </Text>
            <Text className="text-2xl font-bold text-primary">
              {risks.length}
            </Text>
          </Card>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default CohortStatisticsScreen;
