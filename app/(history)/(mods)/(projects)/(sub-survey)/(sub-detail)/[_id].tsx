import { View, ScrollView, SafeAreaView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { format } from "date-fns";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useGetFormById } from "~/services/formElements";
import {
  useGetFamilies,
  useGetAllLocallyCreatedFamilies,
} from "~/services/families";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { Generic, IFamilies, Izus } from "~/types";
import { useGetAllLocallyCreatedIzus } from "~/services/izus";
import { NotFound } from "~/components/ui/not-found";

// Type guard to check if item is an Izu
const isIzu = (item: any): item is Izus => {
  return item && typeof item.name === 'string';
};

// Helper to get family ID from any item type
const getFamilyId = (item: any): string | null => {
  if (!item) return null;
  
  if (typeof item.family === 'string') {
    return item.family;
  }
  
  if (item.form_data && typeof item.form_data.family === 'string') {
    return item.form_data.family;
  }
  
  return null;
};

const DetailScreen = () => {
  const { _id, project_module_id, source_module_id, isFamily, itemType } =
    useLocalSearchParams<{
      _id: string;
      project_module_id: string;
      source_module_id: string;
      isFamily?: string;
      itemType?: string;
    }>();
  const { t } = useTranslation();
  const isFamilyDetail = isFamily === "true";
  console.log("The id:", _id);

  // Get all data sources
  const { submissions: surveySubmissions, isLoading: isLoadingSubmissions } =
    useGetAllSurveySubmissions();
  const { families, isLoading: familiesLoading } = useGetFamilies();
  const { locallyCreatedFamilies, isLoading: locallyCreatedFamiliesLoading } =
    useGetAllLocallyCreatedFamilies();
  const { locallyCreatedIzus, isLoading: locallyCreatedIzusLoading } =
    useGetAllLocallyCreatedIzus();

  // Determine which data to display based on the itemType parameter
  const dataItem = useMemo(() => {
    if (itemType === "family") {
      return locallyCreatedFamilies.find(
        (fam: any) => fam.id?.toString() === _id || fam.hh_id === _id
      );
    } else if (itemType === "izu") {
      return locallyCreatedIzus.find((izu: any) => izu.id?.toString() === _id);
    } else if (itemType === "submission") {
      return surveySubmissions.find((sub) => sub.id?.toString() === _id);
    }
  }, [
    _id,
    itemType,
    surveySubmissions,
    locallyCreatedFamilies,
    locallyCreatedIzus,
  ]);

  // Get family information
  const foundFamily = useMemo(() => {
    if (isFamilyDetail) {
      // For family detail, the dataItem itself contains family info
      return dataItem as any;
    } else {
      // For submission detail, look up the associated family
      const familyId = getFamilyId(dataItem);
      if (familyId) {
        return families?.find((fam) => fam.hh_id === familyId);
      }
    }
    return null;
  }, [dataItem, families, isFamilyDetail]);

  // Get the family ID depending on the data type
  const familyId = useMemo(() => {
    if (isFamilyDetail) {
      return (dataItem as any)?.hh_id;
    } else {
      return getFamilyId(dataItem);
    }
  }, [dataItem, isFamilyDetail]);

  // Get form data for field labels
  const projectId = isFamilyDetail
    ? (dataItem as any)?.form_data?.project_id
    : (dataItem as any)?.project_id;
  const moduleId = isFamilyDetail
    ? (dataItem as any)?.form_data?.project_module_id
    : (dataItem as any)?.project_module_id;
  const sourceModuleId = isFamilyDetail
    ? (dataItem as any)?.form_data?.source_module_id
    : (dataItem as any)?.source_module_id;
  const surveyId = isFamilyDetail
    ? (dataItem as any)?.form_data?.survey_id
    : (dataItem as any)?.survey_id;

  const { form, isLoading: isLoadingSurvey } = useGetFormById(
    surveyId ?? 0,
    moduleId ?? 0,
    sourceModuleId ?? 0,
    projectId ?? 0
  );

  const fieldLabelMap = useMemo(() => {
    if (!form?.json2) return {};
    try {
      const formDefinition = JSON.parse(form.json2);
      const map: { [key: string]: string } = {};
      
      // Recursive function to process all components and their children
      const processComponents = (components: any[]) => {
        if (!Array.isArray(components)) return;
        
        components.forEach((field: any) => {
          // Store field label if it has a key
          if (field?.key) {
            map[field.key] = field.label || field.title?.default || field.key;
          }
          
          // Process child components recursively
          if (field.components && Array.isArray(field.components)) {
            processComponents(field.components);
          }
          
          // Process columns for layoutComponents like columns, tables, etc.
          if (field.columns && Array.isArray(field.columns)) {
            field.columns.forEach((column: any) => {
              if (column.components && Array.isArray(column.components)) {
                processComponents(column.components);
              }
            });
          }
          
          // Process rows for tables
          if (field.rows && Array.isArray(field.rows)) {
            field.rows.forEach((row: any) => {
              if (row.components && Array.isArray(row.components)) {
                processComponents(row.components);
              }
            });
          }
          
          // Process panels which might have components
          if (field.content && Array.isArray(field.content)) {
            processComponents(field.content);
          }
        });
      };
      
      if (formDefinition?.components && Array.isArray(formDefinition.components)) {
        processComponents(formDefinition.components);
      }
      
      console.log("Form field labels:", map);
      return map;
    } catch (error) {
      console.error("Error parsing form json2:", error);
      return {};
    }
  }, [form?.json2]);

  if (!_id) {
    return (
      <NotFound
        title="Missing item ID"
        description="Please try again"
        redirectTo={() => router.back()}
      />
    );
  }

  // Combined loading state
  const isLoading =
    isLoadingSubmissions ||
    locallyCreatedFamiliesLoading ||
    familiesLoading ||
    locallyCreatedIzusLoading ||
    (dataItem && isLoadingSurvey);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4 bg-background">
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
      </SafeAreaView>
    );
  }

  if (!dataItem) {
    return (
      <NotFound
        title="Item not found"
        description="Please try again"
        redirectTo={() => router.back()}
      />
    );
  }

  const submittedAt = (dataItem as Generic)?.sync_data?.submitted_at;

  console.log("The submitted at:", submittedAt);
  const syncStatus = (dataItem as Generic)?.sync_data?.sync_status;
  const answers = isFamilyDetail || itemType === "family" || itemType === "izu"
    ? (dataItem as any)?.meta || {}
    : (dataItem as any)?.answers || {};

  const timeSpent = (dataItem as any)?.form_data?.time_spent_filling_the_form;
  const izuCode = (dataItem as any)?.form_data?.izucode;
  const cohort = (dataItem as any)?.form_data?.cohort || foundFamily?.cohort;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={
          isFamilyDetail
            ? t("History.family_detail", "Family Detail")
            : t("History.submission_detail", "Submission Detail")
        }
      />
      <ScrollView className="flex-1 p-4 bg-background">
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-4">
            {itemType === "izu" && isIzu(dataItem) ? dataItem.name : null}
            {itemType === "family" && foundFamily?.hh_head_fullname}
            {itemType === "submission" && familyId}
          </Text>

          {(foundFamily?.village_name || foundFamily?.hh_id) && (
            <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <Text className="font-medium text-gray-700 mb-2">
                {t("Common.details", "Details")}
              </Text>
              {/* {foundFamily?.village_name && (
                <Text className="text-gray-600">
                  {t("Common.village", "Village")}: {foundFamily.village_name}
                </Text>
              )} */}
              {foundFamily?.hh_id && (
                <Text className="text-gray-600">
                  {t("Common.family", "Family")}: {foundFamily.hh_id}
                </Text>
              )}
            </View>
          )}

          <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <Text className="font-medium text-gray-700 mb-2">
              {t(
                `History.${itemType}_details`,
                `${
                  itemType === "family"
                    ? "Family"
                    : itemType === "izu"
                    ? "IZU"
                    : "Submission"
                } Details`
              )}
            </Text>
            <View className="space-y-2">
              <Text className="text-gray-600">
                {t("History.submitted_at", "Submitted At")}:{" "}
                {submittedAt ? format(new Date(submittedAt), "PPpp") : "-"}
              </Text>
              {timeSpent && (
                <Text className="text-gray-600">
                  {t("History.time_spent", "Time Spent")}: {timeSpent}
                </Text>
              )}
              <Text className="text-gray-600">
                {t("History.status", "Status")}:{" "}
                {syncStatus
                  ? t("History.synced", "Synced")
                  : t("History.pending", "Pending")}
              </Text>
              <Text className="text-gray-600">
                {t("History.type", "Type")}:{" "}
                {t(
                  `Common.${itemType}`,
                  itemType === "family"
                    ? "Family"
                    : itemType === "izu"
                    ? "IZU"
                    : "Submission"
                )}
              </Text>
            </View>
          </View>

          {Object.keys(answers).length > 0 && (
              <View className="mb-6">
                <Text className="font-medium text-gray-700 mb-4">
                  {isFamilyDetail || itemType === "izu" || itemType === "family"
                    ? t("History.family_data", "Family Data")
                    : t("History.answers", "Answers")}
                </Text>
                {Object.entries(answers).map(([key, value]) => {
                  // Format the value based on its type
                  let displayValue: string = "";
                  
                  if (value === null || value === undefined) {
                    displayValue = t("History.not_answered", "Not answered");
                  } else if (typeof value === "object") {
                    try {
                      displayValue = JSON.stringify(value);
                    } catch (e) {
                      displayValue = String(value);
                    }
                  } else if (Array.isArray(value)) {
                    displayValue = value.join(", ");
                  } else {
                    displayValue = String(value);
                  }
                  
                  return (
                    <View
                      key={key}
                      className="mb-4 p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <Text className="font-medium text-gray-700 mb-1">
                        {fieldLabelMap[key] || t(`Form.${key}`, key)}
                      </Text>
                      <Text className="text-gray-600">
                        {displayValue}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

          <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <Text className="font-medium text-gray-700 mb-2">
              {t("History.additional_info", "Additional Information")}
            </Text>
            <View className="space-y-2">
              {izuCode && (
                <Text className="text-gray-600">
                  {t("Common.izu_code", "IZU Code")}: {izuCode}
                </Text>
              )}
              {!isFamilyDetail && familyId && (
                <Text className="text-gray-600">
                  {t("Common.family", "Family")}: {familyId}
                </Text>
              )}
              {cohort && (
                <Text className="text-gray-600">
                  {t("Common.cohort", "Cohort")}: {cohort}
                </Text>
              )}
              {projectId && (
                <Text className="text-gray-600">
                  {t("Common.project_id", "Project ID")}: {projectId}
                </Text>
              )}
              {moduleId && (
                <Text className="text-gray-600">
                  {t("Common.module_id", "Module ID")}: {moduleId}
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DetailScreen;
