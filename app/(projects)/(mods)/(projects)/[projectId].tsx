import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
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
import { useGetModulesByProjectId } from "~/services/project";
import { Button } from "~/components/ui/button";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import HeaderNavigation from "~/components/ui/header";
import { useGetFormByProjectAndModule } from "~/services/formElements";
import { Survey } from "~/models/surveys/survey";

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

  const { modules, isLoading, refresh } = useGetModulesByProjectId(
    Number(projectId)
  );
  console.log("Modules: ", JSON.stringify(modules, null, 2));
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
  const uncategorizedModule = modules.find(
    (module: IModule | null) =>
      module !== null &&
      module.module_name.toLowerCase().includes('uncategorize') &&
      module.project_id === Number(projectId)
  );

  // Get forms for the uncategorized module if it exists
  const { filteredForms: uncategorizedForms, isLoading: isUncategorizedFormsLoading } = useGetFormByProjectAndModule(
    uncategorizedModule?.project_id || 0,
    uncategorizedModule?.source_module_id || 0,
    uncategorizedModule?.id || 0
  );

  const filteredModules = modules
    .filter(
      (module: IModule | null) =>
        module !== null &&
        module.module_status !== 0 &&
        module.module_name.toLowerCase() !== 'uncategorize' &&
        (!searchQuery ||
          module.module_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          module.module_description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    )
    .filter((module): module is IModule => module !== null)
    .sort(
      (a: IModule, b: IModule) =>
        (a?.order_list || 0) - (b?.order_list || 0)
    );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: IModule | Survey }) => {
    if ('module_name' in item) {
      // This is a module
      return (
        <TouchableOpacity
          onPress={() => router.push(`/(projects)/(mods)/(projects)/(forms)/${item.source_module_id}?project_id=${projectId}`)}
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
          {/* <Text className="py-2 text-xs/1 text-gray-600">
            {item.module_description}
          </Text> */}
        </TouchableOpacity>
      );
    } else {
      // This is a form
      return (
        <TouchableOpacity
          onPress={() => router.push(`/(projects)/(mods)/(projects)/(form-element)/${item.id}?project_id=${uncategorizedModule?.project_id}&source_module_id=${uncategorizedModule?.source_module_id}&project_module_id=${uncategorizedModule?.id}`)}
          className="p-4 border mb-4 border-gray-200 rounded-xl"
        >
          <View className="flex-row items-center pr-4 justify-start">
            <TabBarIcon
              name="description"
              family="MaterialIcons"
              size={24}
              color="#71717A"
            />
            <Text className="text-lg ml-2 font-semibold">
              {item.name}
            </Text>
          </View>
          {/* <Text className="py-2 text-xs/1 text-gray-600">
            FORM
          </Text> */}
        </TouchableOpacity>
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("ModulePage.title")}
      />
      <View className="flex-1 p-4 bg-white">
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("ModulePage.search_module")}
          keyboardType="default"
          accessibilityLabel={t("ModulePage.search_module")}
        />

        {isLoading || isUncategorizedFormsLoading ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : (
          <FlatList<IModule | Survey>
            data={uncategorizedModule ? uncategorizedForms || [] : filteredModules}
            keyExtractor={(item, index) => `${item?.id}-${index}`}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <EmptyDynamicComponent message="No related modules" />
            )}
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

export default ProjectModuleScreens;
