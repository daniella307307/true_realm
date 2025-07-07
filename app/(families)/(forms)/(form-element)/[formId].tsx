import { SafeAreaView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { useGetFormById } from "~/services/formElements";
import FormFlowManager from "~/components/FormFlowManager";
import { useAuth } from "~/lib/hooks/useAuth";
import { IFormSubmissionDetail } from "~/types";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useGetFamilies } from "~/services/families";

const FormElementIndexScreen = () => {
  const { formId, project_id, source_module_id, project_module_id, family_id } =
    useLocalSearchParams<{
      formId: string;
      project_id: string;
      source_module_id: string;
      project_module_id: string;
      family_id: string;
    }>();
  const formIdNumber = parseInt(formId);
  const projectIdNumber = parseInt(project_id);
  const sourceModuleId = parseInt(source_module_id);
  const projectModuleId = parseInt(project_module_id);
  const { t, i18n } = useTranslation();
  const { user } = useAuth({});
  const { families } = useGetFamilies();
  
  const { form, isLoading } = useGetFormById(
    formIdNumber || 0,
    projectModuleId || 0,
    sourceModuleId || 0,
    projectIdNumber || 0
  );
  
  console.log("Form ID: ", formIdNumber);
  console.log("Project ID: ", projectIdNumber);
  console.log("Source Module ID: ", sourceModuleId);
  console.log("Project Module ID: ", projectModuleId);
  console.log("Family ID: ", family_id);  

  if (!formId || !project_id) {
    return (
      <View>
        <Text>{t("FormElementPage.missing_form_data")}</Text>
        <Button onPress={() => router.replace("/(home)")}>
          {t("FormElementPage.go_to_home")}
        </Button>
      </View>
    );
  }

  const parsedForm = form?.json2
    ? typeof form.json2 === "string"
      ? JSON.parse(form.json2)
      : form.json2
    : null;

  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
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

  // Find the family if family_id is provided
  const selectedFamily = family_id ? families?.find(f => f.hh_id === family_id) : null;

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
            {i18n.language === "rw-RW" ? form?.name_kin || form?.name : form?.name}
          </Text>
        </View>
        <View className="flex-1">
          {form?.json2 && (
            <FormFlowManager
              form={form}
              formSubmissionMandatoryFields={formStructure}
              fields={parsedForm?.components || []}
              initialFamily={selectedFamily}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default FormElementIndexScreen;
