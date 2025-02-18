import { View, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import Skeleton from "~/components/ui/skeleton";

const ProjectScreen = () => {
  const {
    data: projects,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: useGetAllProjects,
  });

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

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Organize projects with Risk Management at the top
  const organizedProjects = useMemo(() => {
    if (!projects?.data.data) return [];

    const activeProjects = projects.data.data.filter(
      (project) => project.status === 1
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

    // If there's a search query, filter all projects
    return activeProjects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects?.data.data, searchQuery]);

  const renderItem = ({ item, index }: { item: IProject; index: number }) => {
    const isRiskManagement = item.name
      .toLowerCase()
      .includes("isk of harm management");
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
            className={`text-lg ml-4 font-semibold ${
              isRiskManagement ? "text-red-500" : ""
            }`}
          >
            {item.name}
          </Text>
        </View>
        <Text className="text-sm py-2 text-gray-600">{item.description}</Text>
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

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("ProjectPage.search_project")}
        keyboardType="default"
        accessibilityLabel={t("ProjectPage.search_project")}
      />

      {isLoading ? (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      ) : (
        <FlatList
          data={organizedProjects}
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
  );
};

export default ProjectScreen;
