import { useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomInput from "~/components/ui/input";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { IModule } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { useGetAllModules, useGetAllProjects } from "~/services/project";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import HeaderNavigation from "~/components/ui/header";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetFormByProjectAndModule } from "~/services/formElements";
import { Survey } from "~/models/surveys/survey";

const FamiliesPage = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { control, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  const {
    projects: storedProjects,
    isLoading: isProjectsLoading,
    refresh: refreshProjects,
  } = useGetAllProjects();

  const {
    modules,
    isLoading: isModulesLoading,
    refresh: refreshModules,
  } = useGetAllModules();

  const searchQuery = watch("searchQuery");

  // Find the risk of harm module
  const riskOfHarmModule = modules?.find(
    (module: IModule | null) => module?.id === 177 && module?.project_id === 17
  );

  const riskOfHarmModuleId = riskOfHarmModule?.source_module_id;

  // Filter and sort modules
  const filteredModules = modules
    ?.filter(
      (module: IModule | null) =>
        module?.project_id === 3 &&
        module?.module_status !== 0 &&
        (!searchQuery ||
          module?.module_name.toLowerCase().includes(searchQuery))
    )
    .filter((module: IModule | null): module is IModule => module !== null)
    .sort(
      (a: IModule, b: IModule) => (a?.order_list || 0) - (b?.order_list || 0)
    );

  // Check if we have an uncategorized module
  const uncategorizedModule = filteredModules?.find((module) =>
    module.module_name.toLowerCase().includes("uncategorize")
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

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProjects(), refreshModules()]);
    setRefreshing(false);
  };

  const ListHeaderComponent = () => (
    <View>
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("ModulePage.search_module")}
        keyboardType="default"
        accessibilityLabel={t("ModulePage.search_module")}
      />
      {riskOfHarmModule && !uncategorizedModule && (
        <TouchableOpacity
          onPress={() =>
            router.push(
              `/(forms)/${riskOfHarmModuleId}?project_id=${riskOfHarmModule?.project_id}&source_module_id=${riskOfHarmModule?.source_module_id}&project_module_id=${riskOfHarmModule?.id}`
            )
          }
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
          {/* <Text className="text-sm py-2 text-red-600">
            {t("ModulePage.risk_of_harm_description")}
          </Text> */}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderContent = () => {
    if (isModulesLoading || isProjectsLoading || isUncategorizedFormsLoading) {
      return (
        <View>
          {[1, 2, 3].map((item) => (
            <SimpleSkeletonItem key={item} />
          ))}
        </View>
      );
    }

    return null;
  };

  const renderItem = ({ item }: { item: IModule | Survey }) => {
    if ("module_name" in item) {
      // This is a module
      return (
        <TouchableOpacity
          onPress={() =>
            router.push(
              `/(forms)/${item.id}?project_id=${item.project_id}&source_module_id=${item.source_module_id}&project_module_id=${item.id}`
            )
          }
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
          {/* <Text numberOfLines={3} className="py-2 text-xs/1 text-gray-600">
            {item.module_description}
          </Text> */}
        </TouchableOpacity>
      );
    } else {
      // This is a form
      return (
        <TouchableOpacity
          onPress={() =>
            router.push(
              `/(form-element)/${item.id}?project_id=${uncategorizedModule?.project_id}&source_module_id=${uncategorizedModule?.source_module_id}&project_module_id=${uncategorizedModule?.id}`
            )
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
            <Text className="text-lg ml-2 font-semibold">
              {i18n.language === "rw-RW" ? item.name_kin || item.name : item.name}
            </Text>
          </View>
          <Text numberOfLines={3} className="py-2 text-xs/1 text-gray-600">
            {t("ModulePage.form_type")}
          </Text>
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
      <FlatList
        data={
          uncategorizedModule ? uncategorizedForms || [] : filteredModules || []
        }
        keyExtractor={(item, index) => `${item.id}-${index}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={{ paddingTop: 16 }}
        ListEmptyComponent={() =>
          isModulesLoading ||
          isProjectsLoading ||
          isUncategorizedFormsLoading ? (
            renderContent()
          ) : (
            <EmptyDynamicComponent />
          )
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        }}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default FamiliesPage;
