import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";
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
import { fetchActiveModulesFromRemote, useGetAllModules } from "~/services/project";
import { Button } from "~/components/ui/button";
import EmptyDynamicComponent from "~/components/EmptyDynamic";

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
  const isLoading = storedModules.length === 0;
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
  const filteredModules = storedModules
    .filter(
      (module: IModule) =>
        module.project_id === Number(projectId) &&
        module.module_status !== 0 &&
        (!searchQuery ||
          module.module_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          module.module_description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => a.order_list - b.order_list);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActiveModulesFromRemote();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("ModulePage.search_module")}
        keyboardType="default"
        accessibilityLabel={t("ModulePage.search_module")}
      />

      {isLoading ? (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </>
      ) : (
        <FlatList
          data={filteredModules.sort((a, b) => a.order_list - b.order_list)}
          keyExtractor={(item: IModule, index) => `${item.id}-${index}`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <EmptyDynamicComponent message="No related modules" />
          )}
          ListHeaderComponent={() => (
            <TouchableOpacity
              onPress={() => router.push("/(forms)/form-family")}
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
                  {t("ModulePage.risk_of_harm")}
                </Text>
              </View>
              <Text className="text-sm py-2 text-red-600">
                {t("ModulePage.risk_of_harm_description")}
              </Text>
            </TouchableOpacity>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(forms)/${item.id}`)}
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
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

export default ProjectModuleScreens;
