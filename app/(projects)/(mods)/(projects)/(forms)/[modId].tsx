import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import CustomInput from "~/components/ui/input";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import HeaderNavigation from "~/components/ui/header";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import {
  fetchFormByProjectAndModuleFromRemote,
  useGetFormByProjectAndModule,
} from "~/services/formElements";
import { IModule } from "~/types";
import { Survey } from "~/models/surveys/survey";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useForm } from "react-hook-form";
import { useGetAllModules } from "~/services/project";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { NotFound } from "~/components/ui/not-found";

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

  const {
    modules,
    isLoading: isModulesLoading,
    error: modulesError,
  } = useGetAllModules();
  
  const moduleId = parseInt(modId);
  const projectId = parseInt(project_id);

  const currentModule = useMemo(() => {
    if (!modules) return null;
    return (
      modules.find((module: IModule | null) => {
        if (!module) return false;
        return (
          module.source_module_id === moduleId &&
          module.project_id === projectId
        );
      }) || null
    );
  }, [modules, moduleId, projectId]);
  console.log("currentModule", JSON.stringify(currentModule, null, 2));

  // For regular forms
  const {
    filteredForms,
    isLoading: isFormsLoading,
    error: formsError,
  } = useGetFormByProjectAndModule(
    currentModule?.project_id || 0,
    currentModule?.source_module_id || 0,
    currentModule?.id || 0
  );
  console.log("filteredForms", JSON.stringify(filteredForms, null, 2));
  
  const { control, watch } = useForm({
    defaultValues: {
      searchQuery: "",
    },
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFormByProjectAndModuleFromRemote(
        currentModule?.project_id || 0,
        currentModule?.source_module_id || 0
      );
    } catch (error) {
      console.error("Error refreshing forms:", error);
    } finally {
      setRefreshing(false);
    }
  }, [currentModule]);

  // Filter forms based on search query
  const filteredItems = useMemo(() => {
    // Filter regular forms
    if (!filteredForms) return [];
    return filteredForms.filter((form: Survey) => {
      if (!searchQuery) return true;
      return form.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [filteredForms, searchQuery]);

  
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

  const renderItem = ({ item }: { item: Survey }) => {
     console.log("item", item);
    // Render regular form item
    return (
      <TouchableOpacity
        onPress={() =>
          router.push(
            `/(projects)/(mods)/(projects)/(form-element)/${item.id}?project_module_id=${currentModule?.id}&source_module_id=${currentModule?.source_module_id}&project_id=${currentModule?.project_id}`
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

  const isLoading = isFormsLoading || isModulesLoading;

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

    if (modulesError || formsError) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500">
            {modulesError?.message ||
              formsError?.message ||
              "An error occurred"}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("FormPage.title")}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={{ paddingHorizontal: 0, paddingTop: 16 }}
        ListEmptyComponent={() =>
          isLoading ? (
            renderContent()
          ) : (
            <EmptyDynamicComponent message={t("FormPage.empty_forms")} />
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

export default ProjectFormsScreen;
