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
import { router } from "expo-router";
import { IModule } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useGetModulesByProjectId } from "~/services/project";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import HeaderNavigation from "~/components/ui/header";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { useGetMonitoringModules } from "~/services/monitoring/monitoring-module";

const MonitoringScreen = () => {
  const { t } = useTranslation();

  // For monitoring project, we use a fixed project ID of 3
  const PROJECT_ID = 3;
  const MONITORING_PROJECT_ID = 10;

  const { modules, isLoading, refresh } = useGetModulesByProjectId(
    Number(PROJECT_ID)
  );

  // Get Monitoring Modules
  const {
    monitoringModules,
    isLoading: isMonitoringLoading,
    refresh: refreshMonitoring,
  } = useGetMonitoringModules();

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

  // Get modules that have monitoring forms
  const monitoringModuleIds = useMemo(() => {
    console.log("Monitoring Forms Count:", monitoringModules.length);

    // Extract source_module_id values from monitoring forms for project 3
    const moduleIds = Array.from(monitoringModules)
      .filter((form) => {
        return form.form_data?.project_id === Number(PROJECT_ID);
      })
      .map((form) => {
        return form.form_data?.source_module_id;
      })
      .filter((id) => id !== undefined && id !== null) as number[];

    return new Set(moduleIds);
  }, [monitoringModules]);

  const filteredModules = useMemo(() => {
    return modules
      .filter(
        (module: IModule | null) =>
          module !== null &&
          module.module_status !== 0 &&
          module.module_name.toLowerCase() !== "uncategorize" &&
          monitoringModuleIds.has(module.source_module_id) &&
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
        (a: IModule, b: IModule) => (a?.order_list || 0) - (b?.order_list || 0)
      );
  }, [modules, searchQuery, monitoringModuleIds]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      await refreshMonitoring();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: IModule }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          router.push({
            pathname: "/(monitoring)/(forms)/[modId]",
            params: {
              modId: item.source_module_id.toString(),
              project_id: PROJECT_ID.toString(),
            },
          });
        }}
        className="p-4 border mb-4 border-gray-200 rounded-xl"
      >
        <View className="flex-row items-center pr-4 justify-start">
          <TabBarIcon
            name="account-star"
            family="MaterialCommunityIcons"
            size={24}
            color="#71717A"
          />
          <Text className="text-lg ml-2 font-semibold">{item.module_name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("ModulePage.monitoring_title")}
      />
      <View className="flex-1 p-4 bg-white">
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("ModulePage.search_module")}
          keyboardType="default"
          accessibilityLabel={t("ModulePage.search_module")}
        />

        {isLoading || isMonitoringLoading ? (
          <View className="flex-1 justify-center items-center">
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
            <SimpleSkeletonItem />
          </View>
        ) : (
          <FlatList
            data={filteredModules}
            keyExtractor={(item, index) => `${item?.id}-${index}`}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <EmptyDynamicComponent
                message={t("ModulePage.no_monitoring_modules")}
              />
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

export default MonitoringScreen;
