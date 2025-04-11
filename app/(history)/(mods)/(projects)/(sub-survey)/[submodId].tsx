import {
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import React, { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomInput from "~/components/ui/input";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { IExistingForm, IModule } from "~/types";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { useGetAllModules } from "~/services/project";
import {
  fetchFormByProjectAndModuleFromRemote,
  useGetFormByProjectAndModule,
} from "~/services/formElements";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { RefreshControl } from "react-native";
import { Survey } from "~/models/surveys/survey";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { CheckCheckIcon, CrossIcon } from "lucide-react-native";
import HeaderNavigation from "~/components/ui/header";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetFamilies } from "~/services/families";
import { IFamilies } from "~/types";
import { ListRenderItemInfo } from "react-native";
import { Entypo } from "@expo/vector-icons";

interface ProcessedSubmission {
  _id: string;
  table_name?: string | null;
  sync_status: boolean;
  survey_id: number;
  source_module_id: number;
  submittedAt?: Date | null;
  family?: string | null;
  lastSyncAttempt?: Date | null;
}

const SubmissionListByModuleScreen = () => {
  const { submodId } = useLocalSearchParams<{
    submodId: string;
  }>();

  const [activeTab, setActiveTab] = useState<"all" | "synced" | "pending">(
    "all"
  );
  const { surveySubmissions } = useGetAllSurveySubmissions();

  if (!submodId) {
    return (
      <View>
        <Text>Missing module or family id</Text>
        <Button onPress={() => router.replace("/(home)")}>
          <Text>Go to Home</Text>
        </Button>
      </View>
    );
  }

  const storedModules = useGetAllModules();

  const currentModule = storedModules.modules.find(
    (module: IModule | null) => module?.id === parseInt(submodId)
  );
  if (!currentModule) {
    return (
      <View>
        <Text>Module not found</Text>
        <Button onPress={() => router.replace("/(home)")}>
          <Text>Go to Home</Text>
        </Button>
      </View>
    );
  }

  const { t } = useTranslation();
  const { control, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  const [refreshing, setRefreshing] = useState(false);
  const { families, isLoading: familiesLoading } = useGetFamilies();

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFormByProjectAndModuleFromRemote(
      currentModule?.project_id,
      parseInt(submodId)
    );
    setRefreshing(false);
  };

  const searchQuery = watch("searchQuery");

  const filteredAndSortedSubmissions = useMemo(() => {
    const processed: ProcessedSubmission[] = Array.from(surveySubmissions).map(
      (sub: any) => ({
        // Cast sub to any
        _id: sub._id.toString(),
        table_name: sub.table_name,
        sync_status: sub.sync_status,
        survey_id: sub.survey_id,
        source_module_id: sub.source_module_id,
        submittedAt: sub.submittedAt,
        family: sub.family,
        lastSyncAttempt: sub.lastSyncAttempt,
      })
    );

    const filtered = processed.filter((submission: ProcessedSubmission) => {
      if (submission.source_module_id !== parseInt(submodId)) return false;

      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const foundFamily = families?.find(
          (fam: IFamilies) => fam.hh_id === submission.family
        );
        return (
          foundFamily?.hh_head_fullname?.toLowerCase().includes(searchLower) ||
          foundFamily?.village_name?.toLowerCase().includes(searchLower) ||
          submission.family?.toLowerCase().includes(searchLower)
        );
      }

      // Filter by sync status
      switch (activeTab) {
        case "synced":
          return submission.sync_status;
        case "pending":
          return !submission.sync_status;
        default:
          return true;
      }
    });

    return filtered.sort(
      (a: ProcessedSubmission, b: ProcessedSubmission) =>
        (b.submittedAt ? new Date(b.submittedAt).getTime() : 0) -
        (a.submittedAt ? new Date(a.submittedAt).getTime() : 0)
    );
  }, [surveySubmissions, submodId, searchQuery, activeTab]);

  const renderTab = (tab: "all" | "synced" | "pending", label: string) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      className={`py-3 flex-1 items-center justify-center rounded-full ${
        activeTab === tab ? "bg-primary" : "bg-white"
      }`}
    >
      <Text
        className={`text-sm whitespace-nowrap ${
          activeTab === tab ? "text-white" : "text-gray-700"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const insets = useSafeAreaInsets();

  const ListHeaderComponent = useCallback(
    () => (
      <>
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("History.search_form")}
          keyboardType="default"
          accessibilityLabel={t("History.search_form")}
        />

        <View className="flex flex-row justify-between items-center p-2 gap-2 rounded-full mb-4 bg-gray-100">
          {renderTab("all", t("History.all", "All"))}
          {renderTab("synced", t("History.synced", "Synced"))}
          {renderTab("pending", t("History.pending", "Pending"))}
        </View>
      </>
    ),
    [control, t, activeTab]
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("History.submissions")}
      />

      <FlatList
        data={filteredAndSortedSubmissions}
        keyExtractor={(item: ProcessedSubmission) => item._id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={{ paddingHorizontal: 0, paddingTop: 16 }}
        ListEmptyComponent={() => <EmptyDynamicComponent />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        }}
        renderItem={({ item }: ListRenderItemInfo<ProcessedSubmission>) => {
          const foundFamily = families?.find(
            (fam: IFamilies) => fam.hh_id === item.family
          );

          return (
            <TouchableOpacity
              onPress={() => router.push(`/(sub-detail)/${item._id}`)}
              className="p-4 border mb-4 border-gray-200 rounded-xl bg-white"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-semibold text-gray-800">
                  {foundFamily?.hh_id ?? item.family ?? "Unknown Family"}
                </Text>
                <View
                  className={`px-2 py-1 rounded-full ${
                    item.sync_status ? "bg-green-100" : "bg-yellow-100"
                  }`}
                >
                  {item.sync_status ? (
                    <View className="flex-row items-center">
                      <CheckCheckIcon
                        size={24}
                        color="green"
                        className="mr-1"
                      />
                    </View>
                  ) : (
                    <View>
                      <Entypo name="circle-with-cross" size={24} color="red" />
                    </View>
                  )}
                </View>
              </View>
              <View className="space-y-1 mb-3">
                {foundFamily && (
                  <>
                    <Text className="text-sm text-gray-600">
                      {t("Common.headName", "Head Name")}:{" "}
                      {foundFamily.hh_head_fullname}
                    </Text>
                    {foundFamily.village_name && (
                      <Text className="text-sm text-gray-600">
                        {t("Common.village", "Village")}:{" "}
                        {foundFamily.village_name}
                      </Text>
                    )}
                  </>
                )}
                <Text className="text-sm text-gray-600">
                  {t("History.surveyId", "Survey ID")}: {item.survey_id}
                </Text>
                <Text className="text-sm text-gray-600">
                  {t("History.moduleId", "Module ID")}: {item.source_module_id}
                </Text>
                <Text className="text-sm text-gray-600">
                  {t("History.createdAt", "Created At")}:{" "}
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleString()
                    : "-"}
                </Text>
                {item.lastSyncAttempt && (
                  <Text className="text-sm text-gray-600">
                    {t("History.lastSync", "Last Synced")}:{" "}
                    {item.lastSyncAttempt
                      ? new Date(item.lastSyncAttempt).toLocaleString()
                      : "-"}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default SubmissionListByModuleScreen;
