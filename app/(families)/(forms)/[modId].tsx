import {
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomInput from "~/components/ui/input";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { IExistingForm, IModule } from "~/types";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { useGetAllModules } from "~/services/project";
import {
  fetchFormByProjectAndModuleFromRemote,
  useGetFormByProjectAndModule,
} from "~/services/formElements";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { Survey } from "~/models/surveys/survey";
import HeaderNavigation from "~/components/ui/header";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ProjectFormsScreen = () => {
  const { modId } = useLocalSearchParams<{
    modId: string;
  }>();
  const insets = useSafeAreaInsets();

  if (!modId) {
    return (
      <View>
        <Text>Missing module or family id</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const storedModules = useGetAllModules();

  const currentModule = storedModules.modules.find(
    (module: IModule) => module.id === parseInt(modId)
  );

  console.log("Current Module: ", JSON.stringify(currentModule, null, 2));

  if (!currentModule) {
    return (
      <View>
        <Text>Module not found</Text>
        <Button onPress={() => router.replace("/(home)")}>
          <Text>Go to home</Text>
        </Button>
      </View>
    );
  }

  const project_id = currentModule?.project_id;
  const { storedForms, isLoading } = useGetFormByProjectAndModule(
    project_id,
    parseInt(modId)
  );
  console.log("Module ID: ", modId);
  console.log("Project ID: ", currentModule?.project_id);

  
  const { t } = useTranslation();
  const { control, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFormByProjectAndModuleFromRemote(project_id, parseInt(modId));
    setRefreshing(false);
  };

  const searchQuery = watch("searchQuery");

  const filteredForms = storedForms.filter((form: Survey) => {
    if (!searchQuery) return true;

    return form.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // This will be the header component for our FlatList
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

  // This will render the loading skeletons or the form items
  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="mt-6">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} />
          ))}
        </View>
      );
    }

    return null; // FlatList will handle rendering the actual items
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("FormPage.title")}
      />

      <FlatList
        data={filteredForms as IExistingForm[]}
        keyExtractor={(item: IExistingForm, index) => `${item.id}-${index}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={{ paddingHorizontal: 0, paddingTop: 16 }}
        ListEmptyComponent={() =>
          isLoading ? renderContent() : <EmptyDynamicComponent />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        }}
        renderItem={({ item }: { item: IExistingForm }) => (
          <TouchableOpacity
            onPress={() =>
              router.push(`/(form-element)/${item.id}?project_id=${project_id}`)
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
