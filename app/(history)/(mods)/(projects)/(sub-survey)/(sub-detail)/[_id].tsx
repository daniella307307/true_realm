import { View, ScrollView, SafeAreaView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { format } from "date-fns";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useMemo, useEffect } from "react";
import { useGetFormById } from "~/services/formElements";
import {
  useGetFamilies,
  useGetAllLocallyCreatedFamilies,
} from "~/services/families";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { Generic, Izus } from "~/types";
import { useGetAllLocallyCreatedIzus } from "~/services/izus";
import { NotFound } from "~/components/ui/not-found";
import { useGetLocationByVillageIdOffline } from "~/services/locations";

// Type guard to check if item is an Izu
const isIzu = (item: any): item is Izus => {
  return item && typeof item.name === "string";
};

// Helper to get family ID from any item type
const getFamilyId = (item: any): string | null => {
  if (!item) return null;

  if (typeof item.family === "string") {
    return item.family;
  }

  if (item.form_data && typeof item.form_data.family === "string") {
    return item.form_data.family;
  }

  return null;
};

const DetailScreen = () => {
  const { _id, isFamily, itemType } = useLocalSearchParams<{
    _id: string;
    isFamily?: string;
    itemType?: string;
  }>();
  const { t, i18n } = useTranslation();
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

  // Get the village ID from dataItem
  const villageId = useMemo(() => {
    return (dataItem as any)?.location?.village;
  }, [dataItem]);

  // Get location data
  const { data: locationData } = useGetLocationByVillageIdOffline(villageId);

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
    : (dataItem as any)?.form_data?.project_id;
  const moduleId = isFamilyDetail
    ? (dataItem as any)?.form_data?.project_module_id
    : (dataItem as any)?.form_data?.project_module_id;
  const sourceModuleId = isFamilyDetail
    ? (dataItem as any)?.form_data?.source_module_id
    : (dataItem as any)?.form_data?.source_module_id;
  const surveyId = isFamilyDetail
    ? (dataItem as any)?.form_data?.survey_id
    : (dataItem as any)?.form_data?.survey_id;

  const hasValidFormParams = !!(
    surveyId &&
    moduleId &&
    sourceModuleId &&
    projectId
  );
  console.log("Form params:", {
    surveyId,
    moduleId,
    sourceModuleId,
    projectId,
    hasValidFormParams,
  });

  const {
    form,
    isLoading: isLoadingSurvey,
    refresh: refreshForm,
  } = useGetFormById(
    surveyId ?? 0,
    moduleId ?? 0,
    sourceModuleId ?? 0,
    projectId ?? 0
  );

  const fieldLabelMap = useMemo(() => {
    if (!form?.json2) {
      console.log("Form json2 is not available");
      return {};
    }
    try {
      const formDefinition = JSON.parse(form.json2);
      const map: { [key: string]: string } = {};
      const isKinyarwanda = i18n.language === "rw-RW";

      // Recursive function to process all components and their children
      const processComponents = (components: any[]) => {
        if (!Array.isArray(components)) return;

        components.forEach((field: any) => {
          // Store field label if it has a key
          if (field?.key) {
            // Check for language-specific title first
            if (field.title) {
              if (isKinyarwanda && field.title.kn) {
                map[field.key] = field.title.kn;
              } else if (field.title.en) {
                map[field.key] = field.title.en;
              } else if (field.title.default) {
                map[field.key] = field.title.default;
              } else {
                map[field.key] = field.key;
              }
            } else {
              map[field.key] = field.key;
            }
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

      if (
        formDefinition?.components &&
        Array.isArray(formDefinition.components)
      ) {
        processComponents(formDefinition.components);
      }

      console.log("Form field labels (keys):", Object.keys(map));
      return map;
    } catch (error) {
      console.log("Error parsing form json2:", error);
      return {};
    }
  }, [form?.json2, i18n.language]);

  if (!_id) {
    return (
      <NotFound
        title={t("Common.missing_item_id")}
        description={t("Common.please_try_again")}
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
    isLoadingSurvey;

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
        title={t("Common.missing_item_id")}
        description={t("Common.please_try_again")}
        redirectTo={() => router.back()}
      />
    );
  }

  const submittedAt = (dataItem as Generic)?.sync_data?.submitted_at;

  const syncStatus = (dataItem as Generic)?.sync_data?.sync_status;
  const answers =
    isFamilyDetail || itemType === "family" || itemType === "izu"
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
            ? t("History.family_detail")
            : t("History.submission_detail")
        }
      />
      <ScrollView className="flex-1 p-4 bg-background">
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-4">
            {itemType === "izu" && isIzu(dataItem) ? (i18n.language === "rw-RW" ? dataItem.name_kin || dataItem.name : dataItem.name) : null}
            {itemType === "family" && foundFamily?.hh_head_fullname}
            {itemType === "submission" && familyId}
          </Text>

          {/* Show details based on item type */}
          {itemType === "izu" && (
            <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <Text className="font-medium text-gray-700 mb-2">
                {t("Common.details")}
              </Text>
              {(dataItem as any)?.location?.village && (
                <Text className="text-gray-600">
                  {t("Common.village")}: {locationData?.location?.village?.village_name}
                </Text>
              )}
              {(dataItem as any)?.form_data?.izucode && (
                <Text className="text-gray-600">
                  {t("Common.izu_code")}: {(dataItem as any).form_data?.izucode}
                </Text>
              )}
            </View>
          )}

          {/* Show family details if it's a family or related to a family */}
          {(itemType === "family" || foundFamily) && (
            <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <Text className="font-medium text-gray-700 mb-2">
                {t("Common.details")}
              </Text>
              {/* Always show village name when available */}
              {(foundFamily?.village_name ||
                foundFamily?.location?.village ||
                (dataItem as any)?.location?.village) && (
                <Text className="text-gray-600">
                  {t("Common.village", "Village")}:{" "}
                  {foundFamily?.village_name ||
                    foundFamily?.location?.village ||
                    (dataItem as any)?.location?.village}
                </Text>
              )}
              {foundFamily?.hh_id && (
                <Text className="text-gray-600">
                  {t("Common.family", "Family")}: {foundFamily.hh_id}
                </Text>
              )}
              {(foundFamily?.hh_head_fullname ||
                foundFamily?.head_of_household) && (
                <Text className="text-gray-600">
                  {t("Common.family_head", "Family Head")}:{" "}
                  {foundFamily?.hh_head_fullname ||
                    foundFamily?.head_of_household}
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
                {t("History.submitted_at")}:{" "}
                {submittedAt ? format(new Date(submittedAt), "PPpp") : "-"}
              </Text>
              {timeSpent && (
                <Text className="text-gray-600">
                  {t("History.time_spent")}: {timeSpent}
                </Text>
              )}
              <Text className="text-gray-600">
                {t("History.status")}:{" "}
                {syncStatus ? t("History.synced") : t("History.pending")}
              </Text>
              <Text className="text-gray-600">
                {t("History.type")}:{" "}
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
                {isFamilyDetail || itemType === "family"
                  ? t("History.family_data")
                  : itemType === "izu"
                  ? t("History.izu_data")
                  : t("History.answers")}
              </Text>
              {Object.entries(answers).map(([key, value]) => {
                // Format the value based on its type
                let displayValue: string = "";

                if (value === null || value === undefined) {
                  displayValue = t("History.not_answered");
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

                // Get the display label - prefer fieldLabelMap, then use i18n if available
                // Format the key for presentation if no mapping exists
                const formattedKey = key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (char) => char.toUpperCase());
                const displayLabel =
                  fieldLabelMap[key] || t(`Form.${key}`, formattedKey);

                console.log(
                  `Field: ${key}, Label: ${displayLabel}, Has mapping: ${!!fieldLabelMap[
                    key
                  ]}`
                );

                return (
                  <View
                    key={key}
                    className="mb-4 p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <Text className="font-medium text-gray-700 mb-1">
                      {displayLabel}
                    </Text>
                    <Text className="text-gray-600">{displayValue}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <Text className="font-medium text-gray-700 mb-2">
              {t("History.additional_info")}
            </Text>
            <View className="space-y-2">
              {izuCode && itemType !== "izu" && (
                <Text className="text-gray-600">
                  {t("Common.izu_code")}: {izuCode}
                </Text>
              )}
              {!isFamilyDetail && itemType !== "family" && familyId && (
                <Text className="text-gray-600">
                  {t("Common.family")}: {familyId}
                </Text>
              )}
              {cohort && (
                <Text className="text-gray-600">
                  {t("Common.cohort")}: {cohort}
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