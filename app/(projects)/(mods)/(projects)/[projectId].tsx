import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
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
import { useGetModulesByProjectId } from "~/services/project";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import HeaderNavigation from "~/components/ui/header";
import { useGetFormByProjectAndModule } from "~/services/formElements";
import { Survey } from "~/models/surveys/survey";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { NotFound } from "~/components/ui/not-found";

const ProjectModuleScreens = () => {
  const { t, i18n } = useTranslation();
  const { projectId } = useLocalSearchParams<{ 
    projectId: string;
  }>();
  
  if (!projectId) {
    return (
      <NotFound
        title={t("ProjectModulePage.no_project_id")}
        description={t("ProjectModulePage.go_back_and_try_again")}
        redirectTo={() => router.back()}
      />
    );
  }

  const { modules, isLoading, refresh } = useGetModulesByProjectId(
    Number(projectId)
  );
  
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

  const filteredModules = useMemo(() => {
    // For regular projects
    const filtered = modules
      .filter(
        (module: IModule | null) => {
          if (!module) {
            console.log("Skipping null module");
            return false;
          }
          console.log("Checking module:", module.module_name, {
            status: module.module_status,
            isUncategorized: module.module_name.toLowerCase() === 'uncategorize'
          });
          // Exclude modules with status 0 and any module containing 'uncategorize'
          if (module.module_status === 0 || module.module_name.toLowerCase().includes('uncategorize')) {
            return false;
          }
          
          // Only include modules that match the search query if one exists
          if (searchQuery) {
            return module.module_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   module.module_description.toLowerCase().includes(searchQuery.toLowerCase());
          }
          
          return true;
        }
      )
      .filter((module): module is IModule => module !== null)
      .sort(
        (a: IModule, b: IModule) =>
          (a?.order_list || 0) - (b?.order_list || 0)
      );
    return filtered;
  }, [modules, searchQuery]);

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
          onPress={() => {
            router.push({
              pathname: "/(projects)/(mods)/(projects)/(forms)/[modId]",
              params: {
                modId: item.source_module_id.toString(),
                project_id: projectId
              }
            });
          }}
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
              {i18n.language === "rw-RW" ? item.kin_title || item.module_name : item.module_name}
            </Text>
          </View>
        </TouchableOpacity>
      );
    } else {
      // console.log("Item: ", JSON.stringify(item, null, 2));
      // This is a form
      return (
        <TouchableOpacity
          onPress={() => router.push({
            pathname: "/(projects)/(mods)/(projects)/(form-element)/[formId]",
            params: {
              formId: item.id.toString(),
              project_id: uncategorizedModule?.project_id.toString() || "",
              source_module_id: uncategorizedModule?.source_module_id.toString() || "",
              project_module_id: uncategorizedModule?.id.toString() || ""
            }
          })}
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
              {i18n.language === "rw-RW" ? item.name_kin || item.name : item.name}
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
          <View className="flex-1 justify-center items-center">
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
          </View>
        ) : (
          <FlatList<IModule | Survey>
            data={uncategorizedModule && uncategorizedForms?.length > 0 ? uncategorizedForms : filteredModules}
            keyExtractor={(item, index) => `${item?.id}-${index}`}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
                <EmptyDynamicComponent message={t("ProductModulePage.no_related_modules")} />
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
