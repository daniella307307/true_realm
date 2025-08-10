import { SafeAreaView, View } from "react-native";
import { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { useGetFormById } from "~/services/formElements";
import FormFlowManager from "~/components/FormFlowManager";
import { useAuth } from "~/lib/hooks/useAuth";
import { IFormSubmissionDetail } from "~/types";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotFound } from "~/components/ui/not-found";

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

  // Safely parse IDs, defaulting to 0 if undefined or not parseable
  const projectModuleId = project_module_id ? parseInt(project_module_id) : 0;
  console.log("Project Module ID: ", projectModuleId);

  const sourceModuleId = source_module_id ? parseInt(source_module_id) : 0;
  console.log("Source Module ID: ", sourceModuleId);

  const projectId = project_id ? parseInt(project_id) : 0;
  console.log("Project ID: ", projectId);

  const { user } = useAuth({});
  const { t, i18n } = useTranslation();

  if (!formId || !project_module_id) {
    return (
      <NotFound
        title="Form not found"
        description="Please try again"
        redirectTo={() => router.back()}
      />
    );
  }

  // For regular forms
  const { form: regularForm, isLoading: regularFormLoading } = useGetFormById(
    formIdNumber,
    projectModuleId,
    sourceModuleId,
    projectId
  );

  // Id of regular form
  // const regularFormId = regularForm?.id;
  // console.log("Regular Form ID: ", regularFormId);

  if (regularFormLoading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
      </View>
    );
  }

  if (!regularForm) {
    return (
      <NotFound
        title="Form not found"
        description="Please try again"
        redirectTo={() => router.back()}
      />
    );
  }
  const parsedForm = regularForm?.json2
    ? typeof regularForm.json2 === "string"
      ? JSON.parse(regularForm.json2)
      : regularForm.json2
    : null;


  const formStructure: IFormSubmissionDetail = {
    id: regularForm.id,
    table_name: regularForm.table_name?.toString() || "",
    project_module_id: regularForm.project_module_id || 0,
    source_module_id: parseInt(String(regularForm.source_module_id)) || 0,
    project_id: parseInt(String(regularForm.project_id)) || 0,
    post_data: regularForm.post_data?.toString() || "",
    userId: user?.id || user?.json?.id || 0,
    position: parseInt(user?.json?.position || `${user?.position}` || "0"),
  };

  // Console the form without the json2 make it undefined

  // console.log("Form: ", JSON.stringify(regularForm, null, 2));
  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("FormElementPage.title")}
      />
      <View className="flex-1">
        <View className="px-4 pt-4">
          <Text className="text-lg font-semibold mb-4">
            {i18n.language === "rw-RW" ? regularForm.name_kin || regularForm.name : regularForm.name}
          </Text>
        </View>
        <View className="flex-1">
          {parsedForm && (
            <FormFlowManager
              form={regularForm}
              formSubmissionMandatoryFields={formStructure}
              fields={parsedForm.components || []}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ProjectFormElementScreen;
