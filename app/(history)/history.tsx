import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { useState, useMemo } from "react";
import { router } from "expo-router";
import { useGetAllProjects } from "~/services/project";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { useGetAllLocallyCreatedFamilies } from "~/services/families";
import CustomInput from "~/components/ui/input";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { IProject } from "~/types";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import HeaderNavigation from "~/components/ui/header";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { useGetAllLocallyCreatedIzus } from "~/services/izus";

const HistoryProjectScreen = () => {
  const storedProjects = useGetAllProjects();

  const {
    surveySubmissions,
    isLoading: isLoadingSubmissions,
    refresh: refetchSurveySubmissions,
  } = useGetAllSurveySubmissions();

  const {
    locallyCreatedFamilies,
    isLoading: isLoadingFamilies,
    refresh: refreshFamilies,
  } = useGetAllLocallyCreatedFamilies();

  const {
    locallyCreatedIzus,
    isLoading: isLoadingIzus,
    refresh: refreshIzus,
  } = useGetAllLocallyCreatedIzus();

  // console.log("locallyCreatedIzus", JSON.stringify(locallyCreatedIzus, null, 2));
  const { t } = useTranslation();

  const { control, watch } = useForm({
    defaultValues: {
      searchQuery: "",
    },
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await storedProjects.refresh();
    await refetchSurveySubmissions();
    await refreshFamilies();
    await refreshIzus();
    setRefreshing(false);
  };

  const organizedProjects = useMemo(() => {
    if (
      !storedProjects?.projects ||
      !surveySubmissions ||
      !locallyCreatedFamilies
    )
      return [];

    // Get unique project IDs from locally created families
    const locallyCreatedFamilyProjectIds = new Set(
      locallyCreatedFamilies.map((family) => family.form_data?.project_id)
    );

    // Get unique project IDs from survey submissions
    const projectIdsWithSubmissions = new Set(
      surveySubmissions.map((submission) => submission.form_data?.project_id)
    );

    // Get unique project IDs from locally created izus
    const locallyCreatedIzuProjectIds = new Set(
      locallyCreatedIzus.map((izu) => izu.form_data?.project_id)
    );

    // Filter projects that have survey submissions
    const activeProjects = storedProjects.projects.filter(
      (project) =>
        project?.status !== 0 &&
        (projectIdsWithSubmissions.has(project.id) ||
          locallyCreatedFamilyProjectIds.has(project.id) ||
          locallyCreatedIzuProjectIds.has(project.id))
    );

    if (!searchQuery) {
      // Split projects into risk management and others
      const riskProjects = activeProjects.filter((project) =>
        project.name?.toLowerCase().includes("risk of harm management")
      );
      const otherProjects = activeProjects.filter(
        (project) =>
          !project.name?.toLowerCase().includes("risk of harm management")
      );

      return [...riskProjects, ...otherProjects];
    }

    return activeProjects.filter((project) =>
      project.name?.toLowerCase().includes(searchQuery?.toLowerCase() || "")
    );
  }, [storedProjects.projects, surveySubmissions, searchQuery]);

  const renderItem = ({ item, index }: { item: IProject; index: number }) => {
    const isRiskManagement =
      item.name?.toLowerCase()?.includes("risk of harm management") || false;
    const isFirstItem = index === 0;

    // Get submissions for this project
    const projectSubmissions =
      surveySubmissions?.filter(
        (submission) => submission?.form_data?.project_id === item?.id
      ) || [];

    const locallyCreatedFamilySubmissions =
      locallyCreatedFamilies?.filter(
        (family) => family.form_data?.project_id === item?.id
      ) || [];

    const locallyCreatedIzuSubmissions =
      locallyCreatedIzus?.filter(
        (izu) => izu.form_data?.project_id === item?.id
      ) || [];

    const totalSubmissions =
      projectSubmissions.length +
      locallyCreatedFamilySubmissions.length +
      locallyCreatedIzuSubmissions.length;

    console.log("The item is:", JSON.stringify(item, null, 2));
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(mods)/(projects)/${item.id}`)}
        className={`p-4 border mb-4 rounded-xl
          ${isRiskManagement ? "border-red-500" : "border-gray-200"}
          ${isRiskManagement && isFirstItem ? "mt-4" : ""}`}
      >
        <View className="flex flex-row pr-4 items-center">
          <TabBarIcon
            name="chat"
            family="MaterialIcons"
            size={24}
            color={isRiskManagement ? "#EF4444" : "#71717A"}
          />
          <Text
            className={`text-lg ml-4 font-semibold ${
              isRiskManagement ? "text-red-500" : ""
            }`}
          >
            {item.name || ""}
          </Text>
        </View>
        <View className="flex flex-col justify-between items-start mt-2">
          <Text className="text-sm text-gray-500">
            {t("History.submissions", "Submissions")}: {totalSubmissions}
          </Text>
          <Text className="text-sm text-gray-500">
            {t("History.lastSubmission", "Last submission")}:{" "}
            {projectSubmissions.length > 0 ||
            locallyCreatedFamilySubmissions.length > 0
              ? (() => {
                  // Find the most recent submission from either array
                  let latestDate: Date | null = new Date();

                  // Check project submissions
                  if (projectSubmissions.length > 0 &&
                    projectSubmissions[projectSubmissions.length - 1]
                      ?.sync_data?.submitted_at
                  ) {
                    const submissionDate = projectSubmissions[projectSubmissions.length - 1].sync_data?.submitted_at
                    // @ts-ignore
                    if (submissionDate && (!latestDate || submissionDate > latestDate)) {
                      latestDate = new Date(submissionDate.toLocaleString());
                    }
                  }

                  // Check family submissions
                  if (locallyCreatedFamilySubmissions.length > 0 && 
                    locallyCreatedFamilySubmissions[locallyCreatedFamilySubmissions.length - 1]
                      ?.sync_data?.submitted_at
                  ) {
                    const submissionDate = locallyCreatedFamilySubmissions[locallyCreatedFamilySubmissions.length - 1].sync_data?.submitted_at;
                    // @ts-ignore
                    if (submissionDate && (!latestDate || submissionDate > latestDate)) {
                      // @ts-ignore
                      latestDate = submissionDate;
                    }
                  }

                  // Check izus submissions
                  if (locallyCreatedIzuSubmissions.length > 0 &&
                    locallyCreatedIzuSubmissions[locallyCreatedIzuSubmissions.length - 1]
                      ?.sync_data?.submitted_at
                  ) {
                    const submissionDate = locallyCreatedIzuSubmissions[locallyCreatedIzuSubmissions.length - 1].sync_data?.submitted_at;
                    // @ts-ignore
                    if (submissionDate && (!latestDate || submissionDate > latestDate)) {
                      // @ts-ignore
                      latestDate = submissionDate;
                    }
                  }

                  return latestDate
                    ? latestDate.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : t("History.noSubmissions", "No submissions");
                })()
              : t("History.noSubmissions", "No submissions")}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => {
    const hasRiskProject = organizedProjects.some((project) =>
      project.name?.toLowerCase().includes("risk management")
    );

    if (!hasRiskProject) return null;

    return (
      <View className="bg-red-50 p-4 rounded-xl mb-4">
        <Text className="text-red-500 font-semibold">
          {t("ProjectPage.risk_management_section")}
        </Text>
      </View>
    );
  };

  const transformedProjects = organizedProjects.map((project) => ({
    id: project.id,
    name: project.name || "",
    duration: project.duration || "",
    progress: project.progress || "",
    description: project.description || "",
    status: project.status,
    beneficiary: project.beneficiary || "",
    projectlead: project.projectlead || "",
    has_modules: project.has_modules,
    created_at: project.created_at
      ? new Date(project.created_at).toDateString()
      : undefined,
    updated_at: project.updated_at
      ? new Date(project.updated_at).toDateString()
      : undefined,
    project_modules: Array.isArray(project.project_modules)
      ? Array.from(project.project_modules)
      : [],
  }));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("HistoryProjectPage.title")}
      />
      <View className="px-4">
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("HistoryProjectPage.search_history_project")}
          keyboardType="default"
          accessibilityLabel={t("HistoryProjectPage.search_history_project")}
        />

        {isLoadingSubmissions || isLoadingFamilies ? (
          <View>
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
          </View>
        ) : transformedProjects?.length === 0 ? (
          <EmptyDynamicComponent />
        ) : (
          <FlatList
            data={transformedProjects || []}
            ListHeaderComponent={ListHeader}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => `${item?.id || index}-${index}`}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default HistoryProjectScreen;
