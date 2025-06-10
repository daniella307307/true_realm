import {
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { format } from "date-fns";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useGetFormById } from "~/services/formElements";
import { SimpleSkeletonItem } from "~/components/ui/skeleton";
import { NotFound } from "~/components/ui/not-found";
import { useGetNotificationById } from "~/services/notifications";
import {
  useGetFollowUpsBySurveyResultId,
  saveFollowupToAPI,
} from "~/services/followups";
import {
  DayInputComponent,
  SelectBoxComponent,
  TextAreaComponent,
} from "~/components/DynamicComponents";
import { useForm } from "react-hook-form";
import { RealmContext } from "~/providers/RealContextProvider";
import Toast from "react-native-toast-message";
import { useAuth } from "~/lib/hooks/useAuth";

const { useRealm } = RealmContext;

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
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit, reset } = useForm();
  const realm = useRealm();
  const { user } = useAuth({});

  const { notification } = useGetNotificationById(id || "");
  const { submissions: surveySubmissions, isLoading: isLoadingSubmissions } =
    useGetAllSurveySubmissions();
  const { followups } = useGetFollowUpsBySurveyResultId(
    _id || "",
    survey_id || ""
  );

  // Find the submission that matches this notification
  const submission = useMemo(() => {
    if (!_id) return null;
    return surveySubmissions.find((sub) => sub.id.toString() === _id);
  }, [_id, surveySubmissions]);

  // console.log("Survey Submissions", JSON.stringify(surveySubmissions, null, 2));

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

  // console.log("Form", JSON.stringify(form, null, 2));

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

  const onSubmitFollowup = async (data: any) => {
    try {
      setIsSubmitting(true);
      console.log("data", data);

      const followupUser = {
        id: user?.id,
        name: user?.name,
      };

      const result = await saveFollowupToAPI(realm, {
        followup_date: data.followup_date,
        status: data.status,
        comment: data.comment,
        survey_result_id: Number(_id),
        project_module_id: Number(project_module_id),
        project_id: Number(projectId),
        source_module_id: Number(sourceModuleId),
        survey_id: Number(surveyIdNumber),
        user: followupUser,
        survey: notification?.survey,
        survey_result: { id: Number(_id), _id },
      });

      console.log("result", result);

      if (result.success) {
        Toast.show({
          type: "success",
          text1: t("Notifications.success", "Success"),
          text2: result.message,
          position: "bottom",
        });
        setShowAddFollowup(false);
        reset();
      } else {
        Toast.show({
          type: "info",
          text1: t("Notifications.notice", "Notice"),
          text2: result.message,
          position: "bottom",
        });
      }
    } catch (error) {
      console.error("Error creating followup:", error);
      Toast.show({
        type: "error",
        text1: t("Notifications.error", "Error"),
        text2: t("Notifications.followup_error", "Failed to create follow-up"),
        position: "bottom",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // console.log("Followups", JSON.stringify(followups, null, 2));
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
                {Object.entries(answers)
                  .filter(([key]) => {
                    // Filter out system fields and only show fields that have a valid label in the form
                    const systemFields = [
                      "cohort",
                      "form_status",
                      "language",
                      "time_spent_filling_the_form",
                      "time_spent_filling_the_form",
                      "userId",
                      "user_id",
                    ];
                    return !systemFields.includes(key) && fieldLabelMap[key];
                  })
                  .map(([key, value]) => {
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
                          {fieldLabelMap[key]}
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
            <View className="mb-4 flex justify-center items-end">
              <Button
                onPress={() => setShowAddFollowup(true)}
                className="bg-primary w-1/2 justify-center items-center"
              >
                <Text className="text-white">
                  {t("Notifications.add_followup", "Add Follow-up")}
                </Text>
              </Button>
            </View>

            {followups.length > 0 ? (
              followups.map((followup) => (
                <View
                  key={followup.id}
                  className="mb-4 p-4 bg-white rounded-lg border border-gray-200"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-medium text-gray-700">
                      {format(new Date(followup.followup_date), "PPp")}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${
                        followup.status === "resolved"
                          ? "bg-green-100"
                          : "bg-yellow-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          followup.status === "resolved"
                            ? "text-green-800"
                            : "text-yellow-800"
                        }`}
                      >
                        {followup.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-600 mb-2">{followup.comment}</Text>
                  <Text className="text-gray-500 text-sm">
                    {t("Notifications.by", "By")}: {followup.user?.name}
                  </Text>
                  {!followup.sync_data?.sync_status && (
                    <View className="mt-2 bg-yellow-50 p-2 rounded">
                      <Text className="text-yellow-800 text-xs">
                        {t("Notifications.pending_sync", "Pending sync")}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View className="flex-1 justify-center items-center p-4">
                <Text className="text-gray-500 text-center">
                  {t("Notifications.no_followups", "No follow-ups available")}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Follow-up Modal */}
      <Modal
        visible={showAddFollowup}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSubmitting && setShowAddFollowup(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold">
                {t("Notifications.add_followup", "Add Follow-up")}
              </Text>
              <TouchableOpacity
                onPress={() => !isSubmitting && setShowAddFollowup(false)}
              >
                <Text
                  className={`${
                    isSubmitting ? "text-gray-400" : "text-primary"
                  }`}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <DayInputComponent
                field={{
                  key: "followup_date",
                  type: "day",
                  input: true,
                  label: "Follow-up Date",
                  tableView: true,
                  title: {
                    en: "Follow-up Date",
                    kn: "Follow-up Date",
                    default: "Follow-up Date",
                  },
                  validate: { required: true },
                }}
                control={control}
              />

              <SelectBoxComponent
                field={{
                  key: "status",
                  type: "select",
                  input: true,
                  label: "Status",
                  tableView: true,
                  title: { en: "Status", kn: "Status", default: "Status" },
                  validate: { required: true },
                  data: {
                    values: [
                      { value: "active", label: "Active" },
                      { value: "resolved", label: "Resolved" },
                    ],
                  },
                }}
                control={control}
              />

              <TextAreaComponent
                field={{
                  key: "comment",
                  type: "textarea",
                  input: true,
                  label: "Comment",
                  tableView: true,
                  title: { en: "Comment", kn: "Comment", default: "Comment" },
                  validate: { required: true },
                }}
                control={control}
              />

              <Button
                onPress={handleSubmit(onSubmitFollowup)}
                className={`mt-4 ${
                  isSubmitting ? "bg-gray-400" : "bg-primary"
                }`}
              >
                {isSubmitting ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white ml-2">
                      {t("Notifications.saving", "Saving...")}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white">
                    {t("Notifications.save_followup", "Save Follow-up")}
                  </Text>
                )}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default NotificationDetailScreen;
