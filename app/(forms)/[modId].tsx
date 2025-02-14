import { View, FlatList, Pressable } from "react-native";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomInput from "~/components/ui/input";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { IExistingForm, IForms, IModule } from "~/types";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import {
  useGetAllModules,
  useGetFormByProjectAndModule,
} from "~/services/project";

const ProjectFormsScreen = () => {
  const { modId } = useLocalSearchParams<{ modId: string }>();
  console.log("Module ID: ", modId);
  if (!modId) {
    return (
      <View>
        <Text>Missing module id</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const { data: modules, isLoading: modLoading } = useQuery({
    queryKey: ["modules"],
    queryFn: useGetAllModules,
  });

  const currentModule = Object.entries(modules?.data || {})
    .flatMap(([_, moduleArray]) => moduleArray)
    .find((module: IModule) => module.id === parseInt(modId));

  const { data: forms, isLoading } = useQuery({
    queryKey: ["forms", modId],
    queryFn: () => {
      if (!currentModule?.project_id) {
        throw new Error("Project ID is required");
      }
      return useGetFormByProjectAndModule(
        currentModule.project_id,
        parseInt(modId)
      );
    },
    enabled: !!currentModule?.project_id,
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

  const filteredForms = forms?.data?.filter((form: IExistingForm) => {
    if (!searchQuery) return true;
    return form.name.toLowerCase().includes(searchQuery);
  });

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("FormPage.search_form")}
        keyboardType="default"
        accessibilityLabel={t("FormPage.search_form")}
      />

      {isLoading ? (
        <View className="mt-6">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredForms}
          keyExtractor={(item: IExistingForm) => item.id.toString()}
          ListEmptyComponent={() => (
            <Text className="text-center text-gray-500 mt-6">
              {t("FormPage.empty_forms")}
            </Text>
          )}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: IExistingForm }) => (
            <Pressable
              onPress={() => router.push(`/(form-element)/${item.id}`)}
              className="p-4 border flex-row items-center mb-4 border-gray-200 rounded-xl"
            >
              <TabBarIcon
                name="description"
                family="MaterialIcons"
                size={24}
                color="#71717A"
              />
              <View className="ml-4">
                <Text className="text-lg font-semibold">{item.name}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

export default ProjectFormsScreen;
