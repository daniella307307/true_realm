import { SafeAreaView, View, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { Card } from "~/components/ui/card";
import { useGetMonitoringForms } from "~/services/monitoring/monitoring-forms";

interface ScoreData {
  total: number;
  possible: number;
  percentage: number;
  fields_count: number;
  details: Record<
    string,
    {
      key: string;
      score: number;
      possible: number;
    }
  >;
}

interface FormComponent {
  key: string;
  label?: string;
  title?: {
    kn?: string;
    en?: string;
    default?: string;
  };
  type: string;
}

const ScoreDetailsScreen = () => {
  const { t, i18n } = useTranslation();
  const { score_data, date, form_id } = useLocalSearchParams<{
    score_data: string;
    form_id: string;
    date: string;
  }>();

  const { monitoringForms } = useGetMonitoringForms();
  const form = monitoringForms.find((form) => form.id === parseInt(form_id));

  // Parse form components to get labels
  const formComponents: FormComponent[] = form
    ? JSON.parse(form.json2).components
    : [];
  const keyToLabelMap = formComponents.reduce((acc, component) => {
    if (component.type !== "button") {
      // Skip submit button
      const isKinyarwanda = i18n.language === "rw-RW";

      // Use title object if available with language fallbacks
      if (component.title) {
        if (isKinyarwanda && component.title.kn) {
          acc[component.key] = component.title.kn;
        } else if (component.title.en) {
          acc[component.key] = component.title.en;
        } else if (component.title.default) {
          acc[component.key] = component.title.default;
        } else {
          acc[component.key] = component.label || component.key;
        }
      } else {
        acc[component.key] = component.label || component.key;
      }
    }
    return acc;
  }, {} as Record<string, string>);

  if (!score_data) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <HeaderNavigation
          showLeft={true}
          showRight={true}
          title={t("StatisticsPage.score_details")}
        />
        <View className="flex-1 p-4">
          <Text>{t("StatisticsPage.no_score_data")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const parsedScoreData: ScoreData = JSON.parse(score_data);

  // Function to get score color based on percentage
  const getScoreColor = (score: number, possible: number) => {
    const percentage = (score / possible) * 100;
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
        title={t("StatisticsPage.score_details")}
      />
      <ScrollView
        className="flex-1 p-4 bg-white"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text className="text-xl font-bold mb-4">
          {(t("StatisticsPage.score_details_date"), formatDate(date))}
        </Text>

        {/* Overall Score Card */}
        <Card className="p-4 mb-4 bg-[#A23A910D] border border-[#0000001A]">
          <Text className="text-lg font-semibold mb-2">
            {t("StatisticsPage.overall_score")}
          </Text>
          <View className="flex-row justify-between items-center">
            <Text
              className={`text-2xl font-bold ${getScoreColor(
                parsedScoreData.total,
                parsedScoreData.possible
              )}`}
            >
              {parsedScoreData.total}/{parsedScoreData.possible}
            </Text>
            <Text
              className={`text-lg font-medium ${getScoreColor(
                parsedScoreData.total,
                parsedScoreData.possible
              )}`}
            >
              {parsedScoreData.percentage}%
            </Text>
          </View>
          <Text className="text-gray-500 mt-2">
            {t("StatisticsPage.fields_scored")}: {parsedScoreData.fields_count}
          </Text>
        </Card>

        {/* Detailed Scores */}
        <Text className="text-lg font-semibold mb-4">
          {t("StatisticsPage.detailed_scores")}
        </Text>
        {Object.entries(parsedScoreData.details).map(([key, detail]) => (
          <Card key={key} className="p-4 mb-3 bg-white border border-[#E4E4E7]">
            <Text className="font-medium mb-2">
              {keyToLabelMap[key] || key}
            </Text>
            <View className="flex-row justify-between items-center">
              <Text
                className={`font-semibold ${getScoreColor(
                  detail.score,
                  detail.possible
                )}`}
              >
                {detail.score}/{detail.possible}
              </Text>
              <Text
                className={`font-medium ${getScoreColor(
                  detail.score,
                  detail.possible
                )}`}
              >
                {Math.round((detail.score / detail.possible) * 100)}%
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ScoreDetailsScreen;
