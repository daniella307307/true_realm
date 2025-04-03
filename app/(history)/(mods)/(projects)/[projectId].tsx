import { View, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomInput from "~/components/ui/input";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import { IModule } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import {
  fetchActiveModulesFromRemote,
  useGetAllModules,
} from "~/services/project";
import { Button } from "~/components/ui/button";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";

const ProjectModuleScreens = () => {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  console.log("Project ID: ", projectId);
  if (!projectId) {
    return (
      <View>
        <Text>Missing project Id</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const storedModules = useGetAllModules();
  const { surveySubmissions, isLoading: surveySubmissionsLoading } =
    useGetAllSurveySubmissions();
  const isLoading =
    storedModules.modules.length === 0 || surveySubmissionsLoading;
  const { t } = useTranslation();
  const { control, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery");
  const [refreshing, setRefreshing] = useState(false);

  // Get modules that have submissions
  const filteredModules = useMemo(() => {
    if (!storedModules.modules || !surveySubmissions) return [];

    // Get module IDs that have submissions for this project
    const moduleIdsWithSubmissions = new Set(
      surveySubmissions
        .filter((submission) => submission.project_id === Number(projectId))
        .map((submission) => submission.source_module_id)
    );

    return storedModules.modules
      .filter(
        (module: IModule) =>
          module.project_id === Number(projectId) &&
          module.module_status !== 0 &&
          moduleIdsWithSubmissions.has(module.id) &&
          (!searchQuery ||
            module.module_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            module.module_description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => a.order_list - b.order_list);
  }, [storedModules.modules, surveySubmissions, projectId, searchQuery]);

  console.log("Filtered Modules: ", filteredModules);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActiveModulesFromRemote();
    setRefreshing(false);
  };

  // Check if there's a risk of harm module with submissions
  const hasRiskOfHarmWithSubmissions = useMemo(() => {
    if (!surveySubmissions) return false;

    // Check if there are any risk of harm submissions for this project
    return surveySubmissions.some(
      (submission) =>
        submission.project_id === Number(projectId) &&
        submission.source_module_id === 24
    );
  }, [surveySubmissions, projectId]);

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("HistoryModulePage.search_history_module")}
        keyboardType="default"
        accessibilityLabel={t("HistoryModulePage.search_history_module")}
      />

      {isLoading ? (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      ) : (
        <FlatList
          data={filteredModules}
          keyExtractor={(item: IModule, index) => `${item.id}-${index}`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <EmptyDynamicComponent message="No modules with submissions found" />
          )}
          ListHeaderComponent={() =>
            hasRiskOfHarmWithSubmissions ? (
              <TouchableOpacity
                onPress={() => router.push(`/(sub-survey)/24`)}
                className="p-4 border mb-4 border-red-500 rounded-xl"
              >
                <View className="flex-row items-center pr-4 justify-start">
                  <TabBarIcon
                    name="warning"
                    family="MaterialIcons"
                    size={24}
                    color="#D92020"
                  />
                  <Text className="text-lg font-semibold ml-2 text-red-500">
                    {t("HistoryModulePage.risk_of_harm")}
                  </Text>
                </View>
                <Text className="text-sm py-2 text-red-600">
                  {t("HistoryModulePage.risk_of_harm_description")}
                </Text>
                <View className="flex flex-row justify-between items-center mt-2">
                  <Text className="text-sm text-gray-500">
                    {t("History.submissions", "Submissions")}:{" "}
                    {
                      surveySubmissions.filter(
                        (submission) =>
                          submission.project_id === Number(projectId) &&
                          submission.source_module_id === 24 
                      ).length
                    }
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {t("History.lastSubmission", "Last submission")}:{" "}
                    {(() => {
                      const riskSubmissions = surveySubmissions
                        .filter(
                          (submission) =>
                            submission.project_id === Number(projectId) &&
                            submission.source_module_id === 24
                        )
                        .sort(
                          (a, b) =>
                            new Date(b.submittedAt).getTime() -
                            new Date(a.submittedAt).getTime()
                        );

                      return riskSubmissions.length > 0
                        ? new Date(
                            riskSubmissions[0].submittedAt
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                        : t("History.noSubmissions", "No submissions");
                    })()}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const moduleSubmissions = surveySubmissions.filter(
              (submission) => submission.source_module_id === item.id
            );

            // Sort submissions by date (most recent first)
            const sortedSubmissions = [...moduleSubmissions].sort(
              (a, b) =>
                new Date(b.submittedAt).getTime() -
                new Date(a.submittedAt).getTime()
            );

            const lastSubmission =
              sortedSubmissions.length > 0
                ? sortedSubmissions[0].submittedAt
                : null;

            return (
              <TouchableOpacity
                onPress={() => router.push(`/(sub-survey)/${item.id}`)}
                className="p-4 border mb-4 border-gray-200 rounded-xl"
              >
                <View className="flex-row items-center pr-4 justify-start">
                  <TabBarIcon
                    name="chat"
                    family="MaterialIcons"
                    size={24}
                    color="#71717A"
                  />
                  <Text className="text-lg ml-2 font-semibold">
                    {item.module_name}
                  </Text>
                </View>
                <Text className="py-2 text-xs/1 text-gray-600">
                  {item.module_description}
                </Text>
                <View className="flex flex-row justify-between items-center mt-2">
                  <Text className="text-sm text-gray-500">
                    {t("History.submissions", "Submissions")}:{" "}
                    {moduleSubmissions.length}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {lastSubmission
                      ? new Date(lastSubmission).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })
                      : t("History.noSubmissions", "No submissions")}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

export default ProjectModuleScreens;
