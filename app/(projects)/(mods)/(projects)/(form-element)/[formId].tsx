import { SafeAreaView, View, FlatList } from "react-native";
import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { useGetFormById } from "~/services/formElements";
import FormFlowManager from "~/components/FormFlowManager";
import { useAuth } from "~/lib/hooks/useAuth";
import { IFormSubmissionDetail } from "~/types";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ProjectFormElementScreen = () => {
  const { formId, project_module_id, source_module_id, project_id } =
    useLocalSearchParams<{
      formId: string;
      project_module_id: string;
      source_module_id: string;
      project_id: string;
    }>();
  const insets = useSafeAreaInsets();
  const formIdNumber = parseInt(formId);
  console.log("Form ID: ", formIdNumber);
  const projectIdNumber = parseInt(project_module_id);
  console.log("Project Module ID: ", projectIdNumber);
  const sourceModuleId = parseInt(source_module_id);
  console.log("Source Module ID: ", sourceModuleId);
  const projectId = parseInt(project_id);
  console.log("Project ID: ", projectId);
  const { user } = useAuth({});

  if (!formId || !project_module_id) {
    return (
      <View>
        <Text>Missing form or project ID</Text>
        <Button onPress={() => router.back()}>Go back</Button>
      </View>
    );
  }

  const { form, isLoading } = useGetFormById(
    parseInt(formId),
    parseInt(project_module_id),
    parseInt(source_module_id),
    parseInt(project_id)
  );
  const parsedForm = form?.json2
    ? typeof form.json2 === "string"
      ? JSON.parse(form.json2)
      : form.json2
    : null;

  if (isLoading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </View>
    );
  }

  const formStructure: IFormSubmissionDetail = {
    id: form?.id ?? 0,
    table_name: form?.table_name,
    project_module_id: form?.project_module_id ?? 0,
    source_module_id: form?.source_module_id ?? 0,
    project_id: parseInt(project_id) || 0,
    post_data: form?.post_data,
    userId: user?.id ?? 0,
  };

  console.log("Form Structure: ", JSON.stringify(formStructure, null, 2));
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("FormElementPage.title")}
      />
      <View className="flex-1">
        <View className="px-4 pt-4">
          <Text className="text-lg font-semibold mb-4">{form?.name}</Text>
        </View>
        <View className="flex-1">
          {form?.json2 && (
            <FormFlowManager
              form={form}
              formSubmissionMandatoryFields={formStructure}
              fields={parsedForm?.components || []}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ProjectFormElementScreen;
