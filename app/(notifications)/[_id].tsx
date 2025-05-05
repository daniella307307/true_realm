import { View, ScrollView, SafeAreaView, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useGetAllSurveySubmissions, useGetRemoteSurveySubmissions } from "~/services/survey-submission";
import { format } from "date-fns";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useGetFormById } from "~/services/formElements";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { NotFound } from "~/components/ui/not-found";
import { useGetNotificationById } from "~/services/notifications";

const NotificationDetailScreen = () => {
  const { id, _id, project_module_id, survey_id } = useLocalSearchParams<{
    id: string;
    _id: string;
    project_module_id: string;
    survey_id: string;
  }>();
  console.log("id", id);
  console.log("_id", _id);
  console.log("project_module_id", project_module_id);
  console.log("survey_id", survey_id);

  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"details" | "followups">(
    "details"
  );

  const { notification } = useGetNotificationById(id || "");
  const { surveySubmissions, isLoading: isLoadingSubmissions } =
    useGetRemoteSurveySubmissions();

  // Find the submission that matches this notification
  const submission = useMemo(() => {
    if (!_id) return null;
    return surveySubmissions.find((sub) => sub._id.toString() === _id);
  }, [_id, surveySubmissions]);

  console.log("Survey Submissions", JSON.stringify(surveySubmissions, null, 2));
  // console.log("submission", JSON.stringify(submission, null, 2));

  // Get form data for field labels
  const projectId =
    submission?.form_data?.project_id || notification?.form_data?.project_id;
  const moduleId =
    submission?.form_data?.project_module_id ||
    notification?.form_data?.project_module_id;
  const sourceModuleId =
    submission?.form_data?.source_module_id ||
    notification?.form_data?.source_module_id;
  const surveyIdNumber =
    submission?.form_data?.survey_id || notification?.form_data?.survey_id;

  const { form, isLoading: isLoadingSurvey } = useGetFormById(
    surveyIdNumber as number,
    moduleId as number,
    sourceModuleId as number,
    projectId as number
  );

  console.log("Form", JSON.stringify(form, null, 2));

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

      if (
        formDefinition?.components &&
        Array.isArray(formDefinition.components)
      ) {
        processComponents(formDefinition.components);
      }

      return map;
    } catch (error) {
      console.error("Error parsing form json2:", error);
      return {};
    }
  }, [form?.json2]);

  // Combined loading state
  const isLoading = isLoadingSubmissions || isLoadingSurvey;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-4 bg-background">
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
        <SimpleSkeletonItem />
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <NotFound
        title="Notification not found"
        description="Please try again"
        redirectTo={() => router.back()}
      />
    );
  }

  const answers = submission?.answers || {};

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("Notifications.notification_detail", "Notification Detail")}
      />

      {/* Notification header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-lg font-semibold">
          {notification.survey?.name}
        </Text>
        <View className="flex-row justify-between items-center mt-1">
          <Text className="text-gray-600 text-sm">
            {notification.created_at
              ? format(new Date(notification.created_at), "PPp")
              : ""}
          </Text>
          <View
            className={`p-3 rounded-full ${
              notification.status === "resolved"
                ? "bg-green-100"
                : "bg-yellow-100"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                notification.status === "resolved"
                  ? "text-green-800"
                  : "text-yellow-800"
              }`}
            >
              {notification.status
                ? t(`Notifications.${notification.status}`, notification.status)
                : t("Notifications.pending", "Pending")}
            </Text>
          </View>
        </View>
      </View>

      {/* Tab navigation */}
      <View className="flex-row border-b border-gray-200 bg-white">
        <TouchableOpacity
          className={`flex-1 py-3 items-center ${
            activeTab === "details" ? "border-b-2 border-primary" : ""
          }`}
          onPress={() => setActiveTab("details")}
        >
          <Text
            className={`font-medium ${
              activeTab === "details" ? "text-primary" : "text-gray-600"
            }`}
          >
            {t("Notifications.item_details", "Item Details")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 items-center ${
            activeTab === "followups" ? "border-b-2 border-primary" : ""
          }`}
          onPress={() => setActiveTab("followups")}
        >
          <Text
            className={`font-medium ${
              activeTab === "followups" ? "text-primary" : "text-gray-600"
            }`}
          >
            {t("Notifications.followups", "Follow-ups")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4 bg-background">
        {activeTab === "details" ? (
          <View>
            {/* Item details tab content */}
            {Object.keys(answers).length > 0 ? (
              <View className="mb-6">
                <Text className="font-medium text-gray-700 mb-4">
                  {t("History.answers", "Answers")}
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
                      <Text className="text-gray-600">{displayValue}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="flex-1 justify-center items-center p-4">
                <Text className="text-gray-500 text-center">
                  {t("Notifications.no_details", "No item details available")}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View>
            {/* Follow-ups tab content */}
            <View className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <Text className="font-medium text-gray-700 mb-2">
                {t("Notifications.followup_details", "Follow-up Details")}
              </Text>
              <View className="space-y-2">
                <Text className="text-gray-600">
                  {t("Notifications.status", "Status")}:{" "}
                  <Text
                    className={`font-medium ${
                      notification.status === "resolved"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {notification.status ||
                      t("Notifications.pending", "Pending")}
                  </Text>
                </Text>

                {notification.followup_date && (
                  <Text className="text-gray-600">
                    {t("Notifications.followup_date", "Follow-up Date")}:{" "}
                    {format(new Date(notification.followup_date), "PPp")}
                  </Text>
                )}

                <Text className="text-gray-600">
                  {t("Notifications.comment", "Comment")}:{" "}
                  {notification.comment ||
                    t("Notifications.no_comment", "No comment")}
                </Text>

                <Text className="text-gray-600">
                  {t("Notifications.created_by", "Created by")}:{" "}
                  {notification.user?.name || "-"}
                </Text>

                <Text className="text-gray-600">
                  {t("Notifications.created_at", "Created at")}:{" "}
                  {notification.created_at
                    ? format(new Date(notification.created_at), "PPp")
                    : "-"}
                </Text>

                <Text className="text-gray-600">
                  {t("Notifications.updated_at", "Updated at")}:{" "}
                  {notification.updated_at
                    ? format(new Date(notification.updated_at), "PPp")
                    : "-"}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationDetailScreen;
