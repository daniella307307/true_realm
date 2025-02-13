import { View, FlatList, Pressable } from "react-native";
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
  // console.log("Projects: ", JSON.stringify(projects, null, 2));
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

  const filteredProjects = projects?.data.data.filter((project) => {
    if (!searchQuery) return true;
    return project.name.toLowerCase().includes(searchQuery);
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
        <>
          {/* <Pressable
            onPress={() => router.push("/(modules)/projects")}
            className="p-4 border flex-row items-center mb-4 border-red-500 rounded-xl bg-red-50"
          >
            <TabBarIcon
              name="warning"
              family="MaterialIcons"
              size={24}
              color="#D92020"
            />
            <View className="ml-4">
              <Text className="text-lg font-semibold text-red-500">
                {t("SettingsPage.risk_of_harm")}
              </Text>
              <Text className="text-sm py-2 text-red-600">
                {t("SettingsPage.risk_of_harm_description")}
              </Text>
            </View>
          </Pressable> */}
          <FlatList
            data={filteredProjects}
            keyExtractor={(item: IProject) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push("/(forms)/form-family")}
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
              </Pressable>
            )}
          />
        </>
      )}
    </View>
  );
};

export default ProjectScreen;
