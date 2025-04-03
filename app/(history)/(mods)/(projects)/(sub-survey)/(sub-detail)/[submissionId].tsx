import { View, ScrollView } from "react-native";
import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { useGetFormById } from "~/services/formElements";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { useAuth } from "~/lib/hooks/useAuth";
import { IFormSubmissionDetail } from "~/types";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { format } from "date-fns";

const SubmissionDetailScreene = () => {
  const { submissionId } = useLocalSearchParams<{
    submissionId: string;
  }>();

  const { surveySubmissions, isLoading } = useGetAllSurveySubmissions();

  if (!submissionId) {
    return (
      <View>
        <Text>Missing submission ID</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  // Find the specific submission
  const submission = surveySubmissions.find(
    (sub) => sub._id.toString() === submissionId
  );

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
      <View className="flex-1 p-4 bg-white">
        <Text>Submission not found</Text>
        <Button onPress={() => router.back()}>Go back</Button>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 p-4 bg-background">
      <View className="mb-6">
        <Text className="text-lg font-semibold mb-4">
          {submission.table_name}
        </Text>

        {/* Submission Metadata */}
        <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <Text className="font-medium text-gray-700 mb-2">
            Submission Details
          </Text>
          <View className="space-y-2">
            <Text className="text-gray-600">
              Submitted At: {format(new Date(submission.submittedAt), "PPpp")}
            </Text>
            <Text className="text-gray-600">
              Time Spent: {submission.timeSpentFormatted}
            </Text>
            <Text className="text-gray-600">
              Status: {submission.sync_status ? "Synced" : "Pending"}
            </Text>
          </View>
        </View>

        {/* Answers */}
        <View className="mb-6">
          <Text className="font-medium text-gray-700 mb-4">Answers</Text>
          {Object.entries(submission.answers).map(([key, value]) => (
            <View
              key={key}
              className="mb-4 p-4 bg-white rounded-lg border border-gray-200"
            >
              <Text className="font-medium text-gray-700 mb-1">{key}</Text>
              <Text className="text-gray-600">
                {value === null || value === undefined
                  ? "Not answered"
                  : String(value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Location Information */}
        {(submission.province ||
          submission.district ||
          submission.sector ||
          submission.cell ||
          submission.village) && (
          <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <Text className="font-medium text-gray-700 mb-2">Location</Text>
            <View className="space-y-2">
              {submission.province && (
                <Text className="text-gray-600">
                  Province: {submission.province}
                </Text>
              )}
              {submission.district && (
                <Text className="text-gray-600">
                  District: {submission.district}
                </Text>
              )}
              {submission.sector && (
                <Text className="text-gray-600">
                  Sector: {submission.sector}
                </Text>
              )}
              {submission.cell && (
                <Text className="text-gray-600">Cell: {submission.cell}</Text>
              )}
              {submission.village && (
                <Text className="text-gray-600">
                  Village: {submission.village}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Additional Information */}
        <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <Text className="font-medium text-gray-700 mb-2">
            Additional Information
          </Text>
          <View className="space-y-2">
            {submission.izucode && (
              <Text className="text-gray-600">
                IZU Code: {submission.izucode}
              </Text>
            )}
            {submission.family && (
              <Text className="text-gray-600">Family: {submission.family}</Text>
            )}
            {submission.cohort && (
              <Text className="text-gray-600">Cohort: {submission.cohort}</Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default SubmissionDetailScreene;
