import React, { useMemo } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text } from "./text";
import { useGetFormByProjectAndModule } from "~/services/formElements";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { CheckCircle2 } from "lucide-react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Survey } from "~/models/surveys/survey";
import { useGetMonitoringResponses } from "~/services/monitoring/monitoring-responses";
import { useGetMonitoringFormsByModule } from "~/services/monitoring/monitoring-forms";

interface FormWithSubmissionStatus {
  id: number;
  name: string;
  name_kin?: string;
  hasSubmission: boolean;
}

interface FormSiblingSelectorProps {
  projectId: number;
  sourceModuleId: number;
  projectModuleId: number;
  familyId: string;
  currentFormId: number;
  isMonitoring?: boolean;
}

const FormSiblingSelector: React.FC<FormSiblingSelectorProps> = ({
  projectId,
  sourceModuleId,
  projectModuleId,
  familyId,
  currentFormId,
  isMonitoring = false,
}) => {
  const { t, i18n } = useTranslation();
  const { submissions } = useGetAllSurveySubmissions();
  const { responses: monitoringResponses } = useGetMonitoringResponses();
  const { filteredForms, isLoading } = useGetFormByProjectAndModule(
    projectId,
    sourceModuleId,
    projectModuleId
  );
  const { moduleForms, isLoading: isMonitoringFormsLoading } = useGetMonitoringFormsByModule(sourceModuleId);
  
  // console.log("Upper Module Forms", JSON.stringify(
  //   moduleForms.map(form => ({
  //     id: form.id,
  //     name: form.name,
  //     name_kin: form.name_kin
  //   })), null, 2));

  // Check which forms have submissions for this family
  const formsWithSubmissionStatus = useMemo(() => {
   

    if (!filteredForms) return [];

    if (isMonitoring) {
      if (!moduleForms || !monitoringResponses) {
    
        return [];
      }

      const forms = Array.from(moduleForms);

      return forms.map((form): FormWithSubmissionStatus => {
        const hasSubmission = monitoringResponses.some(
          (response) => {
            const match = 
              response.module_id.toString() === sourceModuleId.toString() &&
              response.form_id.toString() === form.id.toString() &&
              response.family_id.toString() === familyId.toString();
            
            if (match) {
              console.log("Found matching submission:", {
                moduleId: response.module_id,
                formId: response.form_id,
                familyId: response.family_id
              });
            }
            return match;
          }
        );

        return {
          id: form.id,
          name: form.name,
          name_kin: form.name_kin,
          hasSubmission,
        };
      });
    }

    if (!submissions) return [];

    return filteredForms.map((form: Survey): FormWithSubmissionStatus => {
      const hasSubmission = submissions.some(
        (submission) =>
          submission.form_data?.project_id === projectId &&
          submission.form_data?.source_module_id === sourceModuleId &&
          submission.form_data?.survey_id === form.id &&
          submission.form_data?.family === familyId
      );

      return {
        id: form.id,
        name: form.name,
        name_kin: form.name_kin,
        hasSubmission,
      };
    });
  }, [filteredForms, moduleForms, monitoringResponses, submissions, isMonitoring, sourceModuleId, familyId]);

  if (isLoading || isMonitoringFormsLoading) {
    return (
      <View className="flex-1 p-4">
        <Text>{t("Common.loading")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <Text className="text-lg font-semibold mb-4">
        {t("FormPage.available_forms")}
      </Text>
      <FlatList
        data={formsWithSubmissionStatus}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              if (!item.hasSubmission) {
                console.log("Redirecting to form: ", item.id);
                if (isMonitoring) {
                  // For monitoring forms
                  const href = `/(monitoring)/(form-element)/${item.id}?project_id=${projectId}&monitoring_module_id=${sourceModuleId}&family_id=${familyId}&reset=true`;
                  router.push(href as any);
                } else {
                  // For regular forms
                  const href = `/(form-element)/${item.id}?project_id=${projectId}&source_module_id=${sourceModuleId}&project_module_id=${projectModuleId}&family_id=${familyId}&reset=true`;
                  router.push(href as any);
                }
              }
            }}
            disabled={item.hasSubmission}
            className={`flex-row items-center justify-between p-4 border mb-4 rounded-xl ${
              item.hasSubmission
                ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <View className="flex-1">
              <Text
                className={`text-lg ${
                  item.hasSubmission ? "text-green-700" : "text-gray-900"
                }`}
              >
                {i18n.language === "rw-RW" ? item.name_kin || item.name : item.name}
              </Text>
            </View>
            {item.hasSubmission && (
              <CheckCircle2 size={24} color="#16A34A" className="ml-2" />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500">{t("FormPage.no_forms_available")}</Text>
          </View>
        }
      />
    </View>
  );
};

export default FormSiblingSelector; 