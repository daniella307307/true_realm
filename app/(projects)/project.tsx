import { View, FlatList, Pressable, TouchableOpacity } from "react-native";
import React from "react";
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
  const { data: projects, isLoading } = useQuery({
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

  const filteredProjects = projects?.data.data
    .filter((project) => project.status === 1)
    .filter((project) => {
      if (!searchQuery) return true;
      return project.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

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
          data={filteredProjects}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item: IProject) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(modules)/(projects)/${item.id}`)}
              className="p-4 border flex-row items-center mb-4 border-gray-200 rounded-xl"
            >
              <TabBarIcon
                name="chat"
                family="MaterialIcons"
                size={24}
                color="#71717A"
              />
              <View className="ml-4">
                <Text className="text-lg font-semibold">{item.name}</Text>
                <Text className="text-sm py-2 text-gray-600">
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default ProjectScreen;
