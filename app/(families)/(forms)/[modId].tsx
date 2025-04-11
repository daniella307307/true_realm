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
import Skeleton from "~/components/ui/skeleton";
import {
  fetchFormByProjectAndModuleFromRemote,
  useGetFormByProjectAndModule,
} from "~/services/formElements";
import { Button } from "~/components/ui/button";
import { IExistingForm, IModule } from "~/types";
import { Survey } from "~/models/surveys/survey";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useForm } from "react-hook-form";
import { useGetAllModules } from "~/services/project";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const ProjectFormsScreen = () => {
  const { modId } = useLocalSearchParams<{
    modId: string;
  }>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (!modId) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text>Missing module</Text>
        <Button onPress={() => router.replace("/(home)/home")}>
          Go to home
        </Button>
      </View>
    );
  }

  const { modules, isLoading: isModulesLoading, error: modulesError } = useGetAllModules();
  const moduleId = parseInt(modId);

  // Find the current module with proper null checks
  const currentModule = useMemo(() => {
    if (!modules) return null;
    
    return modules.find((module: IModule | null) => {
      if (!module) return false;
      
      if (moduleId === 22) {
        // For source_module_id 22, specifically find the Risk of Harm module
        return (
          module.source_module_id === 22 &&
          module.id === 177 &&
          module.project_id === 17
        );
      }
      return module.source_module_id === moduleId;
    }) || null;
  }, [modules, moduleId]);

  if (!currentModule) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text>Module not found</Text>
        <Button onPress={() => router.replace("/(families)/")}>
          Go to home
        </Button>
      </View>
    );
  }

  const { filteredForms, isLoading: isFormsLoading, error: formsError } = useGetFormByProjectAndModule(
    currentModule.project_id,
    currentModule.source_module_id,
    currentModule.id
  );

  const { control, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  const [refreshing, setRefreshing] = useState(false);
  const searchQuery = watch("searchQuery");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFormByProjectAndModuleFromRemote(
        currentModule.project_id,
        currentModule.source_module_id
      );
    } catch (error) {
      console.error("Error refreshing forms:", error);
    } finally {
      setRefreshing(false);
    }
  }, [currentModule.project_id, currentModule.source_module_id]);

  const displayFilteredForms = useMemo(() => {
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

  const renderContent = () => {
    if (isFormsLoading || isModulesLoading) {
      return (
        <View className="mt-6">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} />
          ))}
        </View>
      );
    }

    if (modulesError || formsError) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500">
            {modulesError?.message || formsError?.message || "An error occurred"}
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

      <FlatList<Survey>
        data={displayFilteredForms}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={{ paddingHorizontal: 0, paddingTop: 16 }}
        ListEmptyComponent={() =>
          isFormsLoading || isModulesLoading ? (
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
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(form-element)/${item.id}?project_id=${currentModule.project_id}`
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
              <Text className="text-lg ml-4 font-semibold">{item.name}</Text>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default ProjectFormsScreen;
