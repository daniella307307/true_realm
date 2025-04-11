import {
  FlatList,
  Pressable,
  SafeAreaView,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import Skeleton from "~/components/ui/skeleton";
import { useGetIzuById } from "~/services/izus";
import { useGetCohorts } from "~/services/cohorts";
import { ICohort } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";

const StatisticsDetailScreen = () => {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const { izu, isLoading } = useGetIzuById(Number(id));
  const { data: cohorts, isLoading: cohortsLoading } = useGetCohorts();

  const groupedCohorts =
    cohorts?.reduce<Record<string, ICohort[]>>(
      (acc: Record<string, ICohort[]>, cohortt) => {
        if (!acc[cohortt.cohort]) {
          acc[cohortt.cohort] = [];
        }
        acc[cohortt.cohort].push({
          id: cohortt.id,
          cohort: cohortt.cohort,
        });
        return acc;
      },
      {}
    ) || {};
  const cohortTypes = Object.keys(groupedCohorts);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <HeaderNavigation
          showLeft={true}
          showRight={true}
          title={t("StatisticsPage.statistics")}
        />
        <View className="flex-1 p-4 bg-white">
          {[1, 2, 3, 4].map((index) => (
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
        title={t("StatisticsPage.statistics")}
      />
      <View className="flex-1 p-4 bg-white">
        {/* All Cohorts Card */}
        <Pressable
          onPress={() => router.push(`/statistics/${id}/${izu?.id}`)}
          className="p-4 border border-primary rounded-xl mb-4"
        >
          <Text className="text-lg font-semibold text-primary">
            {t("StatisticsPage.all_cohorts", "All Cohorts")}
          </Text>
          <Text className="text-gray-500 mt-1">
            {t("StatisticsPage.view_all_cohorts", "View all cohorts")}
          </Text>
        </Pressable>

        {/* Grouped Cohorts */}
        {cohortTypes.map((type) => (
          <View key={type}>
            <FlatList
              data={groupedCohorts[type]}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    router.push(`/(statistics)/${id}/${item.cohort}`);
                  }}
                  className="flex flex-row items-center bg-[#A23A910D] border border-[#0000001A] mb-3 py-4 px-4 rounded-xl"
                >
                  <View className="mr-4">
                    <TabBarIcon
                      name="account-star"
                      family="MaterialCommunityIcons"
                    />
                  </View>
                  <Text className="text-sm font-semibold text-gray-600 flex-1">
                    {item.cohort}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default StatisticsDetailScreen;
