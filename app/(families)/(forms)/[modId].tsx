import { View, FlatList, TouchableOpacity } from "react-native";
import React, { useState } from "react";
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
import { RefreshControl } from "react-native";
import { Survey } from "~/models/surveys/survey";

const ProjectFormsScreen = () => {
  const { modId } = useLocalSearchParams<{
    modId: string;
  }>();

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
  if (!currentModule) {
    return (
      <View>
        <Text>Module not found</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const storedForms = useGetFormByProjectAndModule(
    currentModule?.project_id,
    parseInt(modId)
  );
  const isLoading = storedForms.storedForms.length === 0;
  console.log("Module ID: ", modId);
  console.log("Project ID: ", currentModule?.project_id);
  const project_id = currentModule?.project_id;
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
    await fetchFormByProjectAndModuleFromRemote(
      currentModule?.project_id,
      parseInt(modId)
    );
    setRefreshing(false);
  };

  const searchQuery = watch("searchQuery");

  const filteredForms = storedForms.storedForms.filter((form: Survey) => {
    if (!searchQuery) return true;
    return form.name.toLowerCase().includes(searchQuery.toLowerCase());
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
          data={filteredForms as IExistingForm[]}
          keyExtractor={(item: IExistingForm, index) => `${item.id}-${index}`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => <EmptyDynamicComponent />}
          renderItem={({ item }: { item: IExistingForm }) => (
            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/(form-element)/${item.id}?project_id=${project_id}`
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
      )}
    </View>
  );
};

export default ProjectFormsScreen;
