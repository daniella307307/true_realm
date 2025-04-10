import { View, ScrollView, SafeAreaView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { format } from "date-fns";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import React, { useMemo } from "react";
import { useGetFormById } from "~/services/formElements";
import { useGetFamilies } from "~/services/families";

const SubmissionDetailScreen = () => {
  const { submissionId } = useLocalSearchParams<{
    submissionId: string;
  }>();
  const { t } = useTranslation();

  const { surveySubmissions, isLoading: isLoadingSubmissions } =
    useGetAllSurveySubmissions();

  const submission = surveySubmissions.find(
    (sub) => sub._id.toString() === submissionId
  );

  const { data: families, isLoading: familiesLoading } = useGetFamilies();

  const foundFamily = families?.find((fam) => fam.hh_id === submission?.family);

  const { form, isLoading: isLoadingSurvey } = useGetFormById(
    submission?.survey_id ?? 0
  );

  const fieldLabelMap = useMemo(() => {
    if (!form?.json2) return {};
    try {
      const formDefinition = JSON.parse(form.json2);
      const map: { [key: string]: string } = {};
      // Assuming json2 structure contains a 'components' array based on FormField interface
      if (
        formDefinition?.components &&
        Array.isArray(formDefinition.components)
      ) {
        formDefinition.components.forEach((field: any) => {
          // Using 'any' for flexibility, ideally use FormField type if directly applicable
          if (field?.key) {
            // Prioritize label, then title.default, then key
            map[field.key] = field.label || field.title?.default || field.key;
          }
        });
      }
      return map;
    } catch (error) {
      console.error("Error parsing survey json2:", error);
      return {};
    }
  }, [form?.json2]);

  if (!submissionId) {
    return (
      <View>
        <Text>Missing submission ID</Text>
        <Button onPress={() => router.replace("/(home)")}>
          <Text>Go Back</Text>
        </Button>
      </View>
    );
  }

  // Combined loading state
  const isLoading = isLoadingSubmissions || (submission && isLoadingSurvey);

  if (isLoading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </View>
    );
  }

  if (!submission) {
    return (
      <View className="flex-1 justify-center items-center p-4 bg-background">
        <Text className="text-lg text-destructive mb-4">
          Submission not found.
        </Text>
        <Button onPress={() => router.back()}>
          <Text>Go Back</Text>
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("History.submission_detail")}
      />
      <ScrollView className="flex-1 p-4 bg-background">
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-4">
            {foundFamily?.hh_head_fullname}
          </Text>

          {foundFamily?.village_name && (
            <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <Text className="font-medium text-gray-700 mb-2">
                Village: {foundFamily?.village_name}
              </Text>
              <Text className="text-gray-600">
                Family: {foundFamily?.hh_id}
              </Text>
            </View>
          )}

          <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <Text className="font-medium text-gray-700 mb-2">
              Submission Details
            </Text>
            <View className="space-y-2">
              <Text className="text-gray-600">
                Submitted At:{" "}
                {submission?.submittedAt
                  ? format(new Date(submission.submittedAt), "PPpp")
                  : "-"}
              </Text>
              <Text className="text-gray-600">
                Time Spent: {submission?.timeSpentFormatted ?? "-"}
              </Text>
              <Text className="text-gray-600">
                Status: {submission?.sync_status ? "Synced" : "Pending"}
              </Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="font-medium text-gray-700 mb-4">Answers</Text>
            {Object.entries(submission?.answers ?? {}).map(([key, value]) => (
              <View
                key={key}
                className="mb-4 p-4 bg-white rounded-lg border border-gray-200"
              >
                <Text className="font-medium text-gray-700 mb-1">
                  {fieldLabelMap[key] || key}
                </Text>
                <Text className="text-gray-600">
                  {value === null || value === undefined
                    ? "Not answered"
                    : String(value)}
                </Text>
              </View>
            ))}
          </View>

          {/* {(submission?.province ||
            submission?.district ||
            submission?.sector ||
            submission?.cell ||
            submission?.village) && (
            <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <Text className="font-medium text-gray-700 mb-2">Location</Text>
              <View className="space-y-2">
                {submission?.province && (
                  <Text className="text-gray-600">
                    Province: {submission?.province}
                  </Text>
                )}
                {submission?.district && (
                  <Text className="text-gray-600">
                    District: {submission?.district}
                  </Text>
                )}
                {submission?.sector && (
                  <Text className="text-gray-600">
                    Sector: {submission?.sector}
                  </Text>
                )}
                {submission?.cell && (
                  <Text className="text-gray-600">
                    Cell: {submission?.cell}
                  </Text>
                )}
                {submission?.village && (
                  <Text className="text-gray-600">
                    Village: {submission?.village}
                  </Text>
                )}
              </View>
            </View>
          )} */}

          <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <Text className="font-medium text-gray-700 mb-2">
              Additional Information
            </Text>
            <View className="space-y-2">
              {submission?.izucode && (
                <Text className="text-gray-600">
                  IZU Code: {submission?.izucode}
                </Text>
              )}
              {submission?.family && (
                <Text className="text-gray-600">
                  Family: {submission?.family}
                </Text>
              )}
              {submission?.cohort && (
                <Text className="text-gray-600">
                  Cohort: {submission?.cohort}
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SubmissionDetailScreen;
