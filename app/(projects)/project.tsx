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
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import HeaderNavigation from "~/components/ui/header";
import EmptyDynamicComponent from "~/components/EmptyDynamic";

const ProjectScreen = () => {
  const { projects, isLoading, refresh } = useGetAllProjects();
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
    await refresh();
    setRefreshing(false);
  };

  // Filter and organize projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    // Filter active projects
    const activeProjects = projects.filter((project) => project.status !== 0);

    // Apply search filter if exists
    if (searchQuery) {
      return activeProjects.filter((project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Organize: Risk management first, then others
    const riskProjects = activeProjects.filter((project) =>
      project.name.toLowerCase().includes("risk of harm management")
    );
    const otherProjects = activeProjects.filter(
      (project) =>
        !project.name.toLowerCase().includes("risk of harm management")
    );

    return [...riskProjects, ...otherProjects];
  }, [projects, searchQuery]);

  const renderItem = ({ item, index }: { item: IProject; index: number }) => {
    const isRiskManagement = item.name
      .toLowerCase()
      .includes("risk of harm management");

    // Skip risk management projects in the list
    if (isRiskManagement) {
      return null;
    }

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(mods)/(projects)/${item.id}`)}
        className="p-4 border border-gray-200 mb-4 rounded-xl"
      >
        <View className="flex flex-row pr-4 items-center">
          <TabBarIcon
            name="chat"
            family="MaterialIcons"
            size={24}
            color="#71717A"
          />
          <Text className="text-lg ml-4 font-semibold">
            {i18n.language === "rw-RW" ? item.kin_name || item.name : item.name}
          </Text>
        </View>
        {item.description && (
          <Text className="text-sm py-2 text-gray-600">
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View className="flex-1 justify-center items-center py-20">
      <EmptyDynamicComponent message={searchQuery
          ? t("Project.no_projects_found")
          : t("ProjectPage.empty_projects")}/>
    </View>
  );

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
            data={filteredProjects}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item: IProject) => item.id.toString()}
            renderItem={renderItem}
            ListEmptyComponent={ListEmptyComponent}
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