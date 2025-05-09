import { SafeAreaView, View } from "react-native";
import { useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import FormFlowManager from "~/components/FormFlowManager";
import { useAuth } from "~/lib/hooks/useAuth";
import { IFormSubmissionDetail } from "~/types";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotFound } from "~/components/ui/not-found";
import { useGetMonitoringFormById } from "~/services/monitoring/monitoring-forms";

const MonitoringFormElementScreen = () => {
  const { formId, project_id, monitoring_module_id } = useLocalSearchParams<{
    formId: string;
    project_id: string;
    monitoring_module_id: string;
  }>();

  const insets = useSafeAreaInsets();
  const formIdNumber = parseInt(formId);
  console.log("Form ID: ", formIdNumber);

  // Safely parse IDs, defaulting to 0 if undefined or not parseable
  const projectId = project_id ? parseInt(project_id) : 0;
  console.log("Project ID: ", projectId);

  const monitoringId = monitoring_module_id
    ? parseInt(monitoring_module_id)
    : 0;
  console.log("Monitoring Module ID: ", monitoringId);
  const { user } = useAuth({});
  const { t } = useTranslation();

  if (!formId) {
    return (
      <NotFound
        title="Form not found"
        description="Please try again"
        redirectTo={() => router.back()}
      />
    );
  }

  // Get monitoring form
  const { form: monitoringForm, isLoading: monitoringFormLoading } =
    useGetMonitoringFormById(formIdNumber);

  // Create a form object compatible with FormFlowManager
  const formData = useMemo(() => {
    if (monitoringForm && monitoringForm[0]) {
      return {
        id: monitoringForm[0].id,
        name: monitoringForm[0].name,
        name_kin: monitoringForm[0].name_kin,
        json2: monitoringForm[0].json2,
        table_name: monitoringForm[0].table_name,
        post_data: monitoringForm[0].post_data,
        project_id: projectId,
        source_module_id: monitoringId,
      };
    }
    return null;
  }, [monitoringForm, projectId, monitoringId]);

  // Parse the JSON string only if it's a strin

  if (monitoringFormLoading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
      </View>
    );
  }

  if (!formData || !formData.json2) {
    return (
      <NotFound
        title="Form not found"
        description="Please try again"
        redirectTo={() => router.back()}
      />
    );
  }

  // console.log("Parsed Json2:", formData);
  const parsedForm = formData?.json2
    ? typeof formData.json2 === "string"
      ? JSON.parse(formData.json2)
      : formData.json2
    : null;

  // console.log("Parsed Form Structure:", parsedForm.components);

  const formStructure: IFormSubmissionDetail = {
    id: formData.id,
    table_name: formData.table_name?.toString() || "",
    project_module_id: 0, // Not needed for monitoring forms
    source_module_id: parseInt(String(formData.source_module_id)) || 0,
    project_id: parseInt(String(formData.project_id)) || 0,
    post_data: formData.post_data?.toString() || "",
    userId: user?.json?.id || 0,
    position: parseInt(user?.json?.position || "0"),
  };

  console.log("form structure: ", JSON.stringify(formStructure, null, 2));
  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("FormElementPage.monitoring_title", "Monitoring Form")}
      />
      <View className="flex-1">
        <View className="px-4 pt-4">
          <Text className="text-lg font-semibold mb-4">{formData.name}</Text>
        </View>
        <View className="flex-1">
          {parsedForm && parsedForm.components && (
            <FormFlowManager
              form={formData}
              formSubmissionMandatoryFields={formStructure}
              fields={parsedForm.components}
              isMonitoring={true}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default MonitoringFormElementScreen;
