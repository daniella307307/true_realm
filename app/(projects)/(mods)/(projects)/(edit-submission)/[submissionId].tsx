import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/lib/hooks/useAuth";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLite } from "~/providers/RealContextProvider";
import { 
  updateSurveySubmissionLocally, 
  updateSurveySubmissionOnServer,
  parseSQLiteRow,
  SurveySubmission 
} from "~/services/survey-submission";
import Toast from "react-native-toast-message";
import { checkNetworkConnection } from "~/utils/networkHelpers";

const EditSubmissionScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth({});
  const params = useLocalSearchParams<{ submissionId: string }>();
  const { getAll, update } = useSQLite();
  
  const [submission, setSubmission] = useState<SurveySubmission | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  const userId = user?.id || user?.json?.id;

  // Load submission
  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setIsLoading(true);
        const allSubmissions = await getAll("SurveySubmissions");
        const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
        
        const found = parsedSubmissions.find(
          (s: SurveySubmission) => s._id === params.submissionId
        );
        
        if (found) {
          setSubmission(found);
          setEditedData({ ...found.data });
        } else {
          Alert.alert(
            t("CommonPage.error") || "Error",
            "Submission not found",
            [{ text: t("CommonPage.ok") || "OK", onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error("Error loading submission:", error);
        Alert.alert(
          t("CommonPage.error") || "Error",
          "Failed to load submission",
          [{ text: t("CommonPage.ok") || "OK", onPress: () => router.back() }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmission();
  }, [params.submissionId]);

  // Check network status
  useEffect(() => {
    const checkNetwork = async () => {
      const connected = await checkNetworkConnection();
      setIsOnline(connected);
    };
    
    checkNetwork();
    const interval = setInterval(checkNetwork, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Track changes
  useEffect(() => {
    if (!submission) return;
    
    const changed = Object.keys(editedData).some(
      key => JSON.stringify(editedData[key]) !== JSON.stringify(submission.data[key])
    );
    
    setHasChanges(changed);
  }, [editedData, submission]);

  const handleFieldChange = (key: string, value: any) => {
    setEditedData(prev => ({ ...prev, [key]: value }));
  };
  // In EditSubmissionScreen.tsx

const handleSaveLocally = async () => {
  if (!submission || !userId) return;

  try {
    setIsSaving(true);

    // ✅ Pass both getAll and update functions
    await updateSurveySubmissionLocally(
      getAll,      // ✅ First parameter: getAll
      update,      // ✅ Second parameter: update
      submission._id!,
      { data: editedData },
      userId
    );

    Toast.show({
      type: "success",
      text1: t("Alerts.success.title") || "Success",
      text2: "Changes saved locally",
      position: "top",
      visibilityTime: 3000,
    });

    // Refresh submission data
    const allSubmissions = await getAll("SurveySubmissions");
    const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
    const updated = parsedSubmissions.find((s: SurveySubmission) => s._id === submission._id);
    
    if (updated) {
      setSubmission(updated);
      setEditedData({ ...updated.data });
      setHasChanges(false);
    }

    router.back();
  } catch (error) {
    console.error("Error saving locally:", error);
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title") || "Error",
      text2: "Failed to save changes",
      position: "top",
      visibilityTime: 4000,
    });
  } finally {
    setIsSaving(false);
  }
};

const handleSyncNow = async () => {
  if (!submission || !userId) return;

  if (!isOnline) {
    Toast.show({
      type: "error",
      text1: t("Alerts.error.network.title") || "Network Error",
      text2: "You are offline. Changes will sync when online.",
      position: "top",
      visibilityTime: 4000,
    });
    return;
  }

  if (!submission.id) {
    Toast.show({
      type: "error",
      text1: t("CommonPage.error") || "Error",
      text2: "Cannot sync: No remote ID. This submission needs to be created first.",
      position: "top",
      visibilityTime: 4000,
    });
    return;
  }

  try {
    setIsSaving(true);

    // ✅ Save locally first with both parameters
    await updateSurveySubmissionLocally(
      getAll,      // ✅ First parameter: getAll
      update,      // ✅ Second parameter: update
      submission._id!,
      { data: editedData },
      userId
    );

    // Get updated submission
    const allSubmissions = await getAll("SurveySubmissions");
    const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
    const updatedSubmission = parsedSubmissions.find(
      (s: SurveySubmission) => s._id === submission._id
    );

    if (!updatedSubmission) {
      throw new Error("Failed to find updated submission");
    }

    // Sync to server
    Toast.show({
      type: "info",
      text1: "Syncing...",
      text2: "Uploading changes to server",
      position: "top",
      visibilityTime: 2000,
    });

    await updateSurveySubmissionOnServer(updatedSubmission, t);

    // Mark as synced
    await update("SurveySubmissions", submission._id!, {
      sync_status: 1,
      needs_update_sync: 0,
      is_modified: 0,
      sync_reason: "Successfully updated on server",
      updated_at: new Date().toISOString(),
    });

    Toast.show({
      type: "success",
      text1: t("Alerts.success.title") || "Success",
      text2: "Changes synced successfully",
      position: "top",
      visibilityTime: 3000,
    });

    router.back();
  } catch (error: any) {
    console.error("Error syncing:", error);
    Toast.show({
      type: "error",
      text1: t("Alerts.error.title") || "Error",
      text2: error?.response?.data?.message || "Failed to sync changes",
      position: "top",
      visibilityTime: 4000,
    });
  } finally {
    setIsSaving(false);
  }
};
  const handleSaveAndSync = async () => {
    if (isOnline && submission?.id) {
      Alert.alert(
        "Sync Now?",
        "Do you want to sync these changes to the server immediately?",
        [
          {
            text: "Save Locally",
            onPress: handleSaveLocally,
            style: "cancel",
          },
          {
            text: "Save & Sync",
            onPress: handleSyncNow,
          },
        ]
      );
    } else {
      handleSaveLocally();
    }
  };

  const renderField = (key: string, value: any) => {
    const fieldValue = editedData[key] ?? value;

    if (typeof fieldValue === "boolean") {
      return (
        <View key={key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{formatFieldName(key)}</Text>
          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={[
                styles.switchOption,
                fieldValue === true && styles.switchOptionActive,
              ]}
              onPress={() => handleFieldChange(key, true)}
            >
              <Text
                style={[
                  styles.switchOptionText,
                  fieldValue === true && styles.switchOptionTextActive,
                ]}
              >
                {t("CommonPage.yes") || "Yes"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.switchOption,
                fieldValue === false && styles.switchOptionActive,
              ]}
              onPress={() => handleFieldChange(key, false)}
            >
              <Text
                style={[
                  styles.switchOptionText,
                  fieldValue === false && styles.switchOptionTextActive,
                ]}
              >
                {t("CommonPage.no") || "No"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (Array.isArray(fieldValue)) {
      return (
        <View key={key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{formatFieldName(key)}</Text>
          <TextInput
            style={styles.textInput}
            value={fieldValue.join(", ")}
            onChangeText={(text) =>
              handleFieldChange(
                key,
                text.split(",").map((item) => item.trim())
              )
            }
            placeholder="Enter comma-separated values"
            multiline
          />
        </View>
      );
    }

    if (typeof fieldValue === "number") {
      return (
        <View key={key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{formatFieldName(key)}</Text>
          <TextInput
            style={styles.textInput}
            value={String(fieldValue)}
            onChangeText={(text) => handleFieldChange(key, Number(text) || 0)}
            keyboardType="numeric"
            placeholder="Enter number"
          />
        </View>
      );
    }

    return (
      <View key={key} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{formatFieldName(key)}</Text>
        <TextInput
          style={styles.textInput}
          value={String(fieldValue || "")}
          onChangeText={(text) => handleFieldChange(key, text)}
          placeholder="Enter value"
          multiline
        />
      </View>
    );
  };

  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00227c" />
        <Text style={styles.loadingText}>
          {t("CommonPage.loading") || "Loading..."}
        </Text>
      </SafeAreaView>
    );
  }

  if (!submission) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderNavigation
          showLeft={true}
          title={t("CommonPage.error") || "Error"}
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Submission not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderNavigation
        showLeft={true}
        title={t("Edit Submission") || "Edit Submission"}
        showRight={true}
      />

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📴 {t("CommonPage.offline_mode") || "Offline Mode"}
          </Text>
        </View>
      )}

      {submission.is_modified && (
        <View style={styles.modifiedBanner}>
          <Text style={styles.modifiedText}>
            ⚠️ This submission has unsaved changes
          </Text>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {submission.form_data?.survey_id
              ? `Form #${submission.form_data.survey_id}`
              : "Survey Submission"}
          </Text>
          <View style={styles.statusContainer}>
            {submission.sync_status ? (
              <View style={styles.statusBadgeSuccess}>
                <Text style={styles.statusBadgeText}>✓ Synced</Text>
              </View>
            ) : (
              <View style={styles.statusBadgePending}>
                <Text style={styles.statusBadgeText}>⟳ Pending</Text>
              </View>
            )}
            {submission.needs_update_sync && (
              <View style={styles.statusBadgeWarning}>
                <Text style={styles.statusBadgeText}>⚠ Needs Sync</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Form Fields</Text>
          <View style={styles.sectionContent}>
            {Object.entries(submission.data)
              .filter(([key]) => key !== "language" && key !== "submit")
              .map(([key, value]) => renderField(key, value))}
          </View>
        </View>

        {submission.location &&
          Object.keys(submission.location).some((k) => submission.location[k]) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location Information</Text>
              <View style={styles.sectionContent}>
                {Object.entries(submission.location)
                  .filter(([_, value]) => value != null)
                  .map(([key, value]) => (
                    <View key={key} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{formatFieldName(key)}:</Text>
                      <Text style={styles.infoValue}>{String(value)}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <Text style={styles.buttonSecondaryText}>
            {t("CommonPage.cancel") || "Cancel"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            (!hasChanges || isSaving) && styles.buttonDisabled,
          ]}
          onPress={handleSaveAndSync}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.buttonPrimaryText}>
              {isOnline && submission.id
                ? t("Save & Sync") || "Save & Sync"
                : t("CommonPage.save") || "Save"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    fontWeight: "500",
  },
  offlineBanner: {
    backgroundColor: "#FFA500",
    padding: 12,
    alignItems: "center",
  },
  offlineText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  modifiedBanner: {
    backgroundColor: "#fff3cd",
    padding: 12,
    alignItems: "center",
  },
  modifiedText: {
    color: "#856404",
    fontSize: 13,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadgeSuccess: {
    backgroundColor: "#28a745",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgePending: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeWarning: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#212529",
    backgroundColor: "white",
    minHeight: 44,
  },
  switchContainer: {
    flexDirection: "row",
    gap: 8,
  },
  switchOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#dee2e6",
    backgroundColor: "white",
    alignItems: "center",
  },
  switchOptionActive: {
    borderColor: "#00227c",
    backgroundColor: "#00227c",
  },
  switchOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c757d",
  },
  switchOptionTextActive: {
    color: "white",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
  },
  infoValue: {
    fontSize: 14,
    color: "#212529",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: "#00227c",
  },
  buttonSecondary: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#00227c",
  },
  buttonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: "#00227c",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
  },
});

export default EditSubmissionScreen;