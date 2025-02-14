import { View, FlatList, Pressable } from "react-native";
import React from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useGetAllModules } from "~/services/project";
import { Button } from "~/components/ui/button";

const ProjectModuleScreens = () => {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  if (!projectId) {
    return (
      <View>
        <Text>Missing project Id</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const { data: modules, isLoading } = useQuery({
    queryKey: ["modules"],
    queryFn: useGetAllModules,
  });
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
  const filteredModules = Object.entries(modules?.data || {})
    .filter(([key]) => key === projectId)
    .flatMap(([_, moduleArray]) =>
      moduleArray.filter(
        (module: IModule) =>
          module.module_status !== 0 &&
          (!searchQuery ||
            module.module_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            module.module_description
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      )
    );

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
          data={filteredModules}
          keyExtractor={(item: IModule) => item.id.toString()}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(forms)/${item.id}`)}
              className="p-4 border flex-row items-center mb-4 border-gray-200 rounded-xl"
            >
              <TabBarIcon
                name="chat"
                family="MaterialIcons"
                size={24}
                color="#71717A"
              />
              <View className="ml-4">
                <Text className="text-lg font-semibold">
                  {item.module_name}
                </Text>
                <Text className="py-2 text-xs/1 line-clamp-2 line text-gray-600">
                  {item.module_description}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

export default ProjectModuleScreens;
