import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomInput from "~/components/ui/input";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { IProject } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useGetAllProjects } from "~/services/project";
import { SimpleSkeletonItem, Skeleton } from "~/components/ui/skeleton";
import HeaderNavigation from "~/components/ui/header";

// Projects to exclude from this screen (they are shown on Home)
const EXCLUDED_PROJECT_IDS = new Set<number>([5, 3, 6, 7, 8, 11, 12, 13]);

const ProjectScreen = () => {
  const { projects: storedProjects, isLoading, refresh } = useGetAllProjects();
  const { t, i18n } = useTranslation();
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
  const onRefresh = async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  };

  const organizedProjects = useMemo(() => {
    if (!storedProjects) return [];

    const activeProjects = storedProjects.filter(
      (project) => project.status != 0
      //  && !EXCLUDED_PROJECT_IDS.has(project.id)
    );

    if (!searchQuery) {
      // Split projects into risk management and others
      const riskProjects = activeProjects.filter((project) =>
        project.name.toLowerCase().includes("risk of harm management")
      );
      const otherProjects = activeProjects.filter(
        (project) =>
          !project.name.toLowerCase().includes("risk of harm management")
      );

      return [...riskProjects, ...otherProjects];
    }

    return activeProjects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [storedProjects, searchQuery]);

  const renderItem = ({ item, index }: { item: IProject; index: number }) => {
    const isRiskManagement = item.name
      .toLowerCase()
      .includes("risk of harm management");
    //   const isRiskManagement = item.name .toLowerCase() .includes("risk of harm management"); const isFirstItem = index === 0;
    if (isRiskManagement) {
      // ❌ Skip risky projects
      return null;
    }
    const isFirstItem = index === 0;

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
            className={`text-lg ml-4 font-semibold ${isRiskManagement ? "text-red-500" : ""
              }`}
          >
            {i18n.language === "rw-RW" ? item.kin_name || item.name : item.name}
          </Text>
        </View>
        {/* <Text className="text-sm py-2 text-gray-600">{item.description}</Text> */}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => {
    const hasRiskProject = organizedProjects.some((project) =>
      project.name.toLowerCase().includes("risk management")
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

  const transformedProjects: IProject[] = organizedProjects.map((project) => ({
    id: project.id,
    name: project.name,
    kin_name: project.kin_name,
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
    project_modules: Array.from(project.project_modules),
  }));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("HomePage.projects")}
      />
      <View className="flex-1 p-4 bg-white">
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("ProjectPage.search_project")}
          keyboardType="default"
          accessibilityLabel={t("ProjectPage.search_project")}
        />

        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
          </View>
        ) : (
          <FlatList
            data={transformedProjects}
            ListHeaderComponent={ListHeader}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item: IProject, index) => `${item.id}-${index}`}
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

export default ProjectScreen;
