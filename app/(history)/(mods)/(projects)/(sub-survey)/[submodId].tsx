import { View, FlatList, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
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
import { CheckCheckIcon } from "lucide-react-native";

type SubmissionItem = {
  _id: string;
  table_name: string;
  sync_status: boolean;
  survey_id: number;
  source_module_id: number;
  submittedAt: Date;
};

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
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const storedModules = useGetAllModules();

  const currentModule = storedModules.modules.find(
    (module: IModule) => module.id === parseInt(submodId)
  );
  if (!currentModule) {
    return (
      <View>
        <Text>Module not found</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFormByProjectAndModuleFromRemote(
      currentModule?.project_id,
      parseInt(submodId)
    );
    setRefreshing(false);
  };

  const searchQuery = watch("searchQuery");

  const filteredSubmissions = surveySubmissions
    .filter((submission: any) => {
      // Filter by module ID
      if (submission.source_module_id !== parseInt(submodId)) return false;

      // Filter by search query
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          submission.table_name?.toLowerCase().includes(searchLower) ||
          submission.survey_id.toString().includes(searchLower)
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
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

  const renderTab = (tab: "all" | "synced" | "pending", label: string) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      className={`px-4 py-3 flex-1 items-center justify-center rounded-full ${
        activeTab === tab ? "bg-primary" : "bg-white"
      }`}
    >
      <Text className={`font-medium ${activeTab === tab ? "text-white" : "text-gray-700"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("History.search_form")}
        keyboardType="default"
        accessibilityLabel={t("History.search_form")}
      />

      <View className="flex flex-row justify-between items-center p-2 gap-4 rounded-full mb-4 bg-gray-100">
        {renderTab("all", t("History.all", "All"))}
        {renderTab("synced", t("History.synced", "Synced"))}
        {renderTab("pending", t("History.pending", "Pending"))}
      </View>

      <FlatList
        data={filteredSubmissions}
        keyExtractor={(item: any) => item._id.toString()}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => <EmptyDynamicComponent />}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity className="p-4 border mb-4 border-gray-200 rounded-xl">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold">{item.table_name}</Text>
              <View
                className={`px-2 py-1 rounded ${
                  item.sync_status ? "bg-green-100" : "bg-yellow-100"
                }`}
              >
                <Text
                  className={`text-sm ${
                    item.sync_status ? "text-green-700" : "text-yellow-700"
                  }`}
                >
                  {item.sync_status ? (
                    <>
                      <CheckCheckIcon size={24} color="green" />
                    </>
                  ) : (
                    t("History.pending", "Pending")
                  )}
                </Text>
              </View>
            </View>
            <View className="space-y-1">
              <Text className="text-sm text-gray-600">
                {t("History.surveyId", "Survey ID")}: {item.survey_id}
              </Text>
              <Text className="text-sm text-gray-600">
                {t("History.moduleId", "Module ID")}: {item.source_module_id}
              </Text>
              <Text className="text-sm text-gray-600">
                {t("History.createdAt", "Created At")}:{" "}
                {new Date(item.submittedAt).toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

export default SubmissionListByModuleScreen;
