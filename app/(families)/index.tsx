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
import Skeleton from "~/components/ui/skeleton";
import {
  fetchActiveModulesFromRemote,
  useGetAllModules,
  useGetAllProjects,
} from "~/services/project";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { Module } from "~/models/modules/module";
import HeaderNavigation from "~/components/ui/header";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FamiliesPage = () => {
  const { t } = useTranslation();
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
    refresh,
  } = useGetAllProjects();
  const searchQuery = watch("searchQuery");
  const { modules, isLoading } = useGetAllModules();

  const riskOfHarmModule = modules.find(
    (module: IModule) => module.module_name === "Uncategorized"
  );
  // console.log("Risk of Harm Module: ", riskOfHarmModule.id);
  const filteredModules = modules
    .filter(
      (module: IModule) =>
        module.project_id === 3 &&
        module.module_status !== 0 &&
        (!searchQuery || module.module_name.toLowerCase().includes(searchQuery))
    )
    .sort((a, b) => a.order_list - b.order_list);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActiveModulesFromRemote();
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
      {riskOfHarmModule && (
        <TouchableOpacity
          onPress={() =>
            router.push(`/(forms)/${riskOfHarmModule?.id}`)
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
          <Text className="text-sm py-2 text-red-600">
            {t("ModulePage.risk_of_harm_description")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

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

    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("ModulePage.title")}
      />
      <FlatList<Module>
        data={filteredModules}
        keyExtractor={(item: Module, index) => `${item.id}-${index}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeaderComponent}
        ListHeaderComponentStyle={{ paddingTop: 16 }}
        ListEmptyComponent={() =>
          isLoading ? renderContent() : <EmptyDynamicComponent />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        }}
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
            <Text numberOfLines={3} className="py-2 text-xs/1 text-gray-600">
              {item.module_description}
            </Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default FamiliesPage;
