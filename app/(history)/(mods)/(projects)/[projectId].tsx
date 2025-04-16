import React, { useState, useMemo } from "react";

import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import CustomInput from "~/components/ui/input";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import HeaderNavigation from "~/components/ui/header";
import Skeleton from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { IModule } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useForm } from "react-hook-form";
import { useGetAllModules } from "~/services/project";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetFormByProjectAndModule } from "~/services/formElements";
import { Survey } from "~/models/surveys/survey";

const ProjectModuleScreens = () => {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  console.log("Project ID: ", projectId);
  if (!projectId) {
    return (
      <View>
        <Text>Missing project Id</Text>
        <Button onPress={() => router.replace("/(home)")}>
          <Text>Go to home</Text>
        </Button>
      </View>
    );
  }

  const {
    modules,
    isLoading: modulesLoading,
    refresh: refreshModules,
  } = useGetAllModules();
  const {
    surveySubmissions,
    isLoading: surveySubmissionsLoading,
    refresh: refreshSubmissions,
  } = useGetAllSurveySubmissions();
  const isLoading = modulesLoading || surveySubmissionsLoading;
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

  // Find the uncategorized module
  const uncategorizedModule = modules?.find(
    (module: IModule | null) =>
      module !== null &&
      module.module_name.toLowerCase().includes("uncategorize") &&
      module.project_id === Number(projectId)
  );

  console.log(
    "Uncategorized Module: ",
    JSON.stringify(uncategorizedModule, null, 2)
  );

  // Get forms for the uncategorized module if it exists
  const {
    filteredForms: uncategorizedForms,
    isLoading: isUncategorizedFormsLoading,
  } = useGetFormByProjectAndModule(
    uncategorizedModule?.project_id || 0,
    uncategorizedModule?.source_module_id || 0,
    uncategorizedModule?.id || 0
  );

  // Get modules that have submissions
  const filteredModules = useMemo(() => {
    if (!modules || !surveySubmissions) return [];

    console.log(
      "Survey Submissions: ",
      JSON.stringify(surveySubmissions, null, 2)
    );

    // Get module IDs that have submissions for this project
    const moduleIdsWithSubmissions = new Set(
      surveySubmissions
        .filter((submission) => submission.project_id === Number(projectId))
        .map((submission) => submission.source_module_id)
    );

    console.log(
      "Module IDs with Submissions: ",
      JSON.stringify(moduleIdsWithSubmissions, null, 2)
    );

    return modules
      .filter(
        (module: IModule | null): module is IModule =>
          module !== null &&
          module.project_id === Number(projectId) &&
          module.module_status !== 0 &&
          moduleIdsWithSubmissions.has(module.source_module_id) &&
          (!searchQuery ||
            module.module_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            module.module_description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => a.order_list - b.order_list);
  }, [modules, surveySubmissions, projectId, searchQuery]);

  console.log("filteredModules", JSON.stringify(filteredModules, null, 2));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshModules(), refreshSubmissions()]);
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

  const renderItem = ({ item }: { item: IModule | Survey }) => {
    if ("module_name" in item) {
      // This is a module
      const moduleSubmissions = surveySubmissions.filter(
        (submission) => submission.source_module_id === item.source_module_id
      );

      const sortedSubmissions = [...moduleSubmissions].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      const lastSubmission =
        sortedSubmissions.length > 0 ? sortedSubmissions[0].submittedAt : null;

      return (
        <TouchableOpacity
          onPress={() => router.push(`/(history)/(sub-survey)/${item.id}`)}
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
          <View className="flex flex-col justify-between items-start mt-2">
            <Text className="text-sm text-gray-500">
              {t("History.submissions", "Submissions")}:{" "}
              {moduleSubmissions.length}
            </Text>
            <Text className="text-sm text-gray-500">
              Last Submisasion:{" "}
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
    } else {
      // This is a form (including uncategorized forms)
      const formSubmissions = surveySubmissions.filter(
        (submission) =>
          submission.project_module_id === item.project_module_id ||
          (uncategorizedModule &&
            submission.source_module_id === uncategorizedModule.id)
      );

      const sortedSubmissions = [...formSubmissions].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      const lastSubmission =
        sortedSubmissions.length > 0 ? sortedSubmissions[0].submittedAt : null;

      return (
        <TouchableOpacity
          onPress={() =>
            router.push(`/(history)/(sub-survey)/${item.project_module_id}`)
          }
          className="p-4 border mb-4 border-gray-200 rounded-xl"
        >
          <View className="flex-row items-center pr-4 justify-start">
            <TabBarIcon
              name="description"
              family="MaterialIcons"
              size={24}
              color="#71717A"
            />
            <Text className="text-lg ml-2 font-semibold">{item.name}</Text>
          </View>
          {/* <Text className="py-2 text-xs/1 text-gray-600">
            {uncategorizedModule ? "Form" : "FORM"}
          </Text> */}
          <View className="flex flex-col justify-between items-start mt-2">
            <Text className="text-sm text-gray-500">
              {t("History.submissions", "Submissions")}:{" "}
              {formSubmissions.length}
            </Text>
            <Text className="text-sm text-gray-500">
              Last Submission:{" "}
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
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("HistoryModulePage.title")}
      />
      <View className="p-4">
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("HistoryModulePage.search_history_module")}
          keyboardType="default"
          accessibilityLabel={t("HistoryModulePage.search_history_module")}
        />

        {isLoading || isUncategorizedFormsLoading ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : (
          <FlatList<IModule | Survey>
            data={
              uncategorizedModule ? uncategorizedForms || [] : filteredModules
            }
            keyExtractor={(item, index) => `${item?.id}-${index}`}
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
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#000000"
                title="Pull to refresh"
                titleColor="#000000"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ProjectModuleScreens;
