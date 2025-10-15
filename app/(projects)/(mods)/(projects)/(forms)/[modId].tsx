import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Text,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import CustomInput from "~/components/ui/input";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import HeaderNavigation from "~/components/ui/header";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { NotFound } from "~/components/ui/not-found";
import { TabBarIcon } from "~/components/ui/tabbar-icon";

import { IExistingForm, IModule } from "~/types";
import { fetchFormByProjectAndModuleFromRemote, useGetFormByProjectAndModule } from "~/services/formElements";
import { useGetAllModules, useGetModulesByProjectId } from "~/services/project";

const ProjectFormsScreen = () => {
  const { modId, project_id } = useLocalSearchParams<{
    modId: string;
    project_id: string;
  }>();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  if (!modId) {
    return (
      <NotFound
        title={t("FormPage.module_not_found")}
        description={t("FormPage.module_not_found_description")}
        redirectTo={() => router.back()}
      />
    );
  }

  // ✅ These are the REMOTE IDs (from API)
  const sourceModuleId = parseInt(modId);
  const projectId = parseInt(project_id);

  console.log("📋 ProjectFormsScreen params:", {
    sourceModuleId,
    projectId,
    type: `${typeof sourceModuleId}, ${typeof projectId}`
  });

  const { modules, isLoading: isModulesLoading, error: modulesError } = useGetAllModules();

  // Find the current module by matching REMOTE IDs
  const currentModule = useMemo(() => {
    if (!modules) return null;
    
    const found = modules.find(
      (m: IModule | null) =>
        m !== null &&
        m.source_module_id === sourceModuleId &&
        m.project_id === projectId
    ) || null;

    console.log("🔍 Found module:", {
      found: !!found,
      module_id: found?.id,
      source_module_id: found?.source_module_id,
      project_id: found?.project_id,
      project_module_id: found?.project_module_id,
    });

    return found;
  }, [modules, sourceModuleId, projectId]);

  // ✅ Load forms using REMOTE IDs (source_module_id, project_id)
  // The third parameter (project_module_id) is the local relationship ID
  const {
    filteredForms,
    isLoading: isFormsLoading,
  } = useGetFormByProjectAndModule(
    currentModule.project_id,              // Remote project ID
    currentModule.source_module_id,        // Remote module ID
    currentModule.project_module_id        // Local relationship ID (if needed)
  );

  console.log("📝 Forms loaded:", {
    count: filteredForms?.length || 0,
    project_id: currentModule?.project_id,
    source_module_id: currentModule?.source_module_id,
  });

  const { control, watch } = useForm({
    defaultValues: { searchQuery: "" },
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery");
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh: fetch from remote using REMOTE IDs
  const onRefresh = useCallback(async () => {
    if (!currentModule) {
      console.warn("⚠️ Cannot refresh: currentModule not found");
      return;
    }
    
    setRefreshing(true);
    try {
      console.log("🔄 Refreshing forms with:", {
        project_id: currentModule.project_id,
        source_module_id: currentModule.source_module_id,
      });

      await fetchFormByProjectAndModuleFromRemote(
        currentModule.project_id,          
        currentModule.source_module_id      // Remote module ID
      );
      
      console.log("✅ Forms refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing forms:", error);
    } finally {
      setRefreshing(false);
    }
  }, [currentModule]);

  const mappedForms = useMemo(() => {
    if (!filteredForms) return [];
    return filteredForms.map(f => ({
      _id: f.id.toString(),
      id: f.id,
      name: f.name,
      name_kin: f.name_kin,
      json2: f.json2,
      json2_bkp: f.json2_bkp,
      survey_status: f.survey_status,
      module_id: f.module_id,
      is_primary: f.is_primary,
      table_name: f.table_name,
      post_data: f.post_data,
      fetch_data: f.fetch_data,
      loads: f.loads,
      prev_id: f.prev_id,
      created_at: f.created_at,
      updated_at: f.updated_at,
      order_list: f.order_list,
      project_module_id: f.project_module_id,
      project_id: f.project_id,
      source_module_id: f.source_module_id,
    }));
  }, [filteredForms]);

  // Filter forms by search query
  const filteredItems = useMemo(() => {
    if (!mappedForms) return [];
    return mappedForms.filter((form) => {
      if (!searchQuery) return true;
      return form.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [mappedForms, searchQuery]);

  const ListHeaderComponent = useCallback(
    () => (
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("FormPage.search_form")}
        keyboardType="default"
        accessibilityLabel={t("FormPage.search_form")}
      />
    ),
    [control, t]
  );

  const renderItem = ({ item }: { item: IExistingForm }) => {
    return (
      <TouchableOpacity
        onPress={() =>
          router.push(
            `/(projects)/(mods)/(projects)/(form-element)/${item.id}?project_module_id=${currentModule?.project_module_id}&source_module_id=${currentModule?.source_module_id}&project_id=${currentModule?.project_id}`
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
          <Text className="text-lg ml-4 font-semibold">
            {i18n.language === "rw-RW" ? item.name_kin || item.name : item.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isLoading = isModulesLoading || isFormsLoading;

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="mt-6">
          {[1, 2, 3].map((item) => (
            <SimpleSkeletonItem key={item} />
          ))}
        </View>
      );
    }

    if (modulesError) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500">
            {"An error occurred"}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation showLeft showRight title={t("FormPage.title")} />

      <FlatList<IExistingForm>
        data={filteredItems}
        keyExtractor={(item) => item.id?.toString()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={{ paddingHorizontal: 0, paddingTop: 16 }}
        ListEmptyComponent={() =>
          isLoading ? renderContent() : <EmptyDynamicComponent message={t("FormPage.empty_forms")} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        }}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
};

export default ProjectFormsScreen;