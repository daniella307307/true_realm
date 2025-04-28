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
import { Generic, IFamilies } from "~/types";

const DetailScreen = () => {
  const { _id, project_module_id, source_module_id, isFamily } =
    useLocalSearchParams<{
      _id: string;
      project_module_id: string;
      source_module_id: string;
      isFamily?: string;
    }>();
  const { t } = useTranslation();
  const isFamilyDetail = isFamily === "true";
  console.log("The id:", _id);

  // Get all data sources
  const { surveySubmissions, isLoading: isLoadingSubmissions } =
    useGetAllSurveySubmissions();
  const { families, isLoading: familiesLoading } = useGetFamilies();
  const { locallyCreatedFamilies, isLoading: locallyCreatedFamiliesLoading } =
    useGetAllLocallyCreatedFamilies();

  // Determine which data to display based on the isFamily parameter
  const dataItem = useMemo(() => {
    if (isFamilyDetail) {
      // Look in locally created families
      return locallyCreatedFamilies.find(
        (fam: any) => fam.id?.toString() === _id || fam.hh_id === _id
      );
    } else {
      // Look in submissions
      return surveySubmissions.find((sub) => sub._id.toString() === _id);
    }
  }, [_id, isFamilyDetail, surveySubmissions, locallyCreatedFamilies]);

  // Get family information
  const foundFamily = useMemo(() => {
    if (isFamilyDetail) {
      // For family detail, the dataItem itself contains family info
      return dataItem as any;
      // @ts-ignore
    } else if (dataItem?.family) {
      // For submission detail, look up the associated family
      // @ts-ignore
      return families?.find((fam) => fam.hh_id === dataItem.family);
    }
    return null;
  }, [dataItem, families, isFamilyDetail]);

  // Get the family ID depending on the data type
  const familyId = useMemo(() => {
    if (isFamilyDetail) {
      return (dataItem as any)?.hh_id;
    } else {
      return (dataItem as any)?.family;
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
      if (
        formDefinition?.components &&
        Array.isArray(formDefinition.components)
      ) {
        formDefinition.components.forEach((field: any) => {
          if (field?.key) {
            map[field.key] = field.label || field.title?.default || field.key;
          }
        });
      }
      return map;
    } catch (error) {
      console.error("Error parsing form json2:", error);
      return {};
    }
  }, [form?.json2]);

  if (!_id) {
    return (
      <View>
        <Text>Missing item ID</Text>
        <Button onPress={() => router.replace("/(home)")}>
          <Text>Go Back</Text>
        </Button>
      </View>
    );
  }

  // Combined loading state
  const isLoading =
    isLoadingSubmissions ||
    locallyCreatedFamiliesLoading ||
    familiesLoading ||
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
      <View className="flex-1 justify-center items-center p-4 bg-background">
        <Text className="text-lg text-destructive mb-4">
          {isFamilyDetail ? "Family" : "Submission"} not found
        </Text>
        <Button onPress={() => router.back()}>
          <Text>Go Back</Text>
        </Button>
      </View>
    );
  }

  // Get display data based on item type
  const itemType = isFamilyDetail ? "family" : "submission";
  const submittedAt = (dataItem as Generic)?.sync_data?.submitted_at;

  console.log("The submitted at:", submittedAt);
  const syncStatus = (dataItem as Generic)?.sync_data?.sync_status;
  const answers = isFamilyDetail
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
            {foundFamily?.hh_head_fullname ||
              foundFamily?.hh_id ||
              familyId ||
              t("Common.unknown", "N/A Family Head Name")}
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
                  itemType.charAt(0).toUpperCase() + itemType.slice(1)
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
                  itemType.charAt(0).toUpperCase() + itemType.slice(1)
                )}
              </Text>
            </View>
          </View>

          {Object.keys(answers).length > 0 && (
            <View className="mb-6">
              <Text className="font-medium text-gray-700 mb-4">
                {isFamilyDetail
                  ? t("History.family_data", "Family Data")
                  : t("History.answers", "Answers")}
              </Text>
              {Object.entries(answers).map(([key, value]) => (
                <View
                  key={key}
                  className="mb-4 p-4 bg-white rounded-lg border border-gray-200"
                >
                  <Text className="font-medium text-gray-700 mb-1">
                    {fieldLabelMap[key] || key}
                  </Text>
                  <Text className="text-gray-600">
                    {value === null || value === undefined
                      ? t("History.not_answered", "Not answered")
                      : String(value)}
                  </Text>
                </View>
              ))}
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
