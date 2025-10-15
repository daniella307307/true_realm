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
} from "react-native";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/lib/hooks/useAuth";
import { router } from "expo-router";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { SurveySubmission } from "~/services/survey-submission";
import { useGetForms } from "~/services/formElements"; // Get ALL forms instead

const RealmDatabaseViewer = () => {
  const { t } = useTranslation();
  const { user } = useAuth({});
  const [submissionsByProject, setSubmissionsByProject] = useState<
    Record<string, any[]>
  >({});
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'projects' | 'submissions' | 'details'>('projects');
  
  // Get user ID (handle both possible structures)
  const userId = user?.id || user?.json?.id;
  
  // Use the secure hook that filters by user ID and auto-syncs
  const { 
    submissions, 
    isLoading, 
    error, 
    isOffline, 
    refresh 
  } = useGetAllSurveySubmissions(false);

  // Get all forms once at the top level (correct hook usage)
  const { forms } = useGetForms(false);

  // Create a lookup map for forms for efficient access
  const formsMap = useMemo(() => {
    if (!forms || !Array.isArray(forms)) return {};
    
    const map: Record<string, any> = {};
    forms.forEach(form => {
      if (form?.id) {
        map[form.id] = form;
      }
    });
    return map;
  }, [forms]);

  useEffect(() => {
    // Check authentication first
    if (!user || !userId) {
      Alert.alert(
        t('Auth.session_expired_title') || 'Session Expired',
        t('Auth.session_expired_message') || 'Please log in again',
        [
          {
            text: t('CommonPage.ok') || 'OK',
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }
  }, [user, userId, t]);

  useEffect(() => {
    if (!submissions || submissions.length === 0) {
      setSubmissionsByProject({});
      return;
    }

    console.log(`Processing ${submissions.length} submissions for display`);

    const grouped: Record<string, Array<SurveySubmission & { projectId: string; projectName: string }>> = {};

    submissions.forEach((s) => {
      // Try multiple sources for project info
      const surveyId = parseInt(s.form_data?.survey_id.toString());
      console.log("Survey ID:", surveyId)
      const projectId = String(surveyId || 'unknown');
      
      
      const form = surveyId ? formsMap[surveyId] : null;
      
      const projectName = String(
        form?.name || 
        s.form_data?.table_name || 
        `${t('CommonPage.project') || 'Project'} ${projectId}`
      );
      
      // Use project name as key for grouping
      const projectKey = projectName;
      
      if (!grouped[projectKey]) {
        grouped[projectKey] = [];
      }
      
      grouped[projectKey].push({
        ...s,
        projectId,
        projectName,
      });
    });

    // Sort projects by name and submissions by date
    const sortedGrouped: Record<string, any[]> = {};
    Object.keys(grouped)
      .sort()
      .forEach(key => {
        sortedGrouped[key] = grouped[key].sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
      });

    setSubmissionsByProject(sortedGrouped);
    console.log(`Grouped into ${Object.keys(sortedGrouped).length} projects`);
  }, [submissions, formsMap, t]);

  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return t('HistoryPageReal.not_answered') || 'Not answered';
    if (typeof value === "boolean") return value ? t('CommonPage.yes') || 'Yes' : t('CommonPage.no') || 'No';
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const handleRefresh = async () => {
    try {
      console.log("Refreshing submissions...");
      const result = await refresh();
      
      if (result && (result.synced > 0 || result.failed > 0)) {
        const messages = [];
        if (result.synced > 0) {
          messages.push(`${result.synced} ${t('CommonPage.submissions') || 'submissions'} synced`);
        }
        if (result.failed > 0) {
          messages.push(`${result.failed} failed to sync`);
        }
        
        Alert.alert(
          t('CommonPage.sync_complete') || 'Sync Complete',
          messages.join('\n')
        );
      } else {
        Alert.alert(
          t('CommonPage.success') || 'Success',
          t('CommonPage.data_refreshed') || 'Data refreshed successfully'
        );
      }
    } catch (error: any) {
      console.error("❌ Refresh failed:", error);
      Alert.alert(
        t('CommonPage.error') || 'Error',
        error?.message || t('CommonPage.refresh_failed') || 'Failed to refresh data'
      );
    }
  };

  const renderFormData = (answers: any, depth = 0) => {
    if (!answers || Object.keys(answers).length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {t('FormElementPage.noFields') || 'No fields available'}
          </Text>
        </View>
      );
    }

    const filteredEntries = Object.entries(answers).filter(([key]) => 
      key !== "language" && key !== "submit"
    );

    if (filteredEntries.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {t('FormElementPage.noFields') || 'No fields available'}
          </Text>
        </View>
      );
    }

    return filteredEntries.map(([key, value], idx, array) => (
      <View key={`${key}-${idx}`}>
        <View style={[styles.fieldContainer, { marginLeft: depth * 16 }]}>
          <Text style={styles.fieldLabel}>
            {formatFieldName(key)}
          </Text>
          
          {typeof value === "object" && value !== null && !Array.isArray(value) ? (
            <View style={styles.nestedContainer}>
              {renderFormData(value, depth + 1)}
            </View>
          ) : (
            <Text style={styles.fieldValue}>
              {formatValue(value)}
            </Text>
          )}
        </View>
        
        {idx < array.length - 1 && (
          <View style={styles.fieldDivider} />
        )}
      </View>
    ));
  };

  const renderSyncBadge = (item: any) => {
    // SQLite uses 0/1 for boolean, also check explicit true/false
    const isSynced = item.sync_status === 1 || item.sync_status === true;
    
    if (isSynced) {
      return (
        <View style={styles.syncBadgeSuccess}>
          <Text style={styles.syncBadgeText}>
            ✓ {t('CommonPage.synced') || 'Synced'}
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.syncBadgePending}>
          <Text style={styles.syncBadgeText}>
            ⟳ {t('CommonPage.pending') || 'Pending'}
          </Text>
        </View>
      );
    }
  };

  const renderProjectCard = (projectName: string, submissions: any[]) => {
    const pendingCount = submissions.filter(s => !s.sync_status || s.sync_status === 0).length;
    
    return (
      <TouchableOpacity
        key={projectName}
        style={styles.projectCard}
        onPress={() => {
          setSelectedProject(projectName);
          setCurrentView('submissions');
        }}
      >
        <View style={styles.projectHeader}>
          <Text style={styles.projectTitle} numberOfLines={2}>
            {projectName}
          </Text>
          <View style={styles.projectBadge}>
            <Text style={styles.projectBadgeText}>
              {submissions.length}
            </Text>
          </View>
        </View>
        
        <View style={styles.projectMetaRow}>
          <Text style={styles.projectSubtitle}>
            {submissions.length} {submissions.length === 1 
              ? t('CommonPage.submission') || 'submission'
              : t('HistoryPageReal.submissions') || 'submissions'}
          </Text>
          {pendingCount > 0 && (
            <Text style={styles.pendingText}>
              {pendingCount} {t('CommonPage.pending_sync') || 'pending sync'}
            </Text>
          )}
        </View>
        
        {submissions.length > 0 && (
          <View style={styles.projectFooter}>
            <Text style={styles.projectFooterText}>
              {t('HistoryPageReal.lastSubmission') || 'Last submission'}: {submissions[0].created_at 
                ? new Date(submissions[0].created_at).toLocaleDateString() 
                : t('CommonPage.not_available') || 'N/A'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSubmissionItem = (item: any) => {
    const fieldCount = item.answers 
      ? Object.keys(item.answers).filter(key => key !== 'language' && key !== 'submit').length 
      : 0;

    // Display either server ID or local ID
    const displayId = item.id || item._id || 'Unknown';
    const isLocal = !item.id; // No server ID means it's local-only

    return (
      <TouchableOpacity
        key={item._id || item.id}
        style={styles.itemContainer}
        onPress={() => {
          setSelectedItem(item);
          setCurrentView('details');
        }}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>
            {t('HistoryPageReal.submission_detail') || 'Submission'} #{displayId}
            {isLocal && ' (Local)'}
          </Text>
          <View style={styles.itemHeaderRight}>
            <Text style={styles.itemBadge}>
              {fieldCount} {t('CommonPage.fields') || 'fields'}
            </Text>
            {renderSyncBadge(item)}
          </View>
        </View>
        
        <View style={styles.itemMeta}>
          <Text style={styles.itemDate}>
            {t('HistoryPageReal.createdAt') || 'Created'}: {item.created_at 
              ? new Date(item.created_at).toLocaleDateString() 
              : t('CommonPage.not_available') || 'N/A'}
          </Text>
          {item.updated_at && item.updated_at !== item.created_at && (
            <Text style={styles.itemDate}>
              {t('CommonPage.updated') || 'Updated'}: {new Date(item.updated_at).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        {fieldCount > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>
              {t('CommonPage.preview') || 'Preview'}:
            </Text>
            {Object.entries(item.answers)
              .filter(([key]) => key !== 'language' && key !== 'submit')
              .slice(0, 2)
              .map(([key, value]) => (
              <Text key={key} style={styles.previewText} numberOfLines={1}>
                {formatFieldName(key)}: {formatValue(value)}
              </Text>
            ))}
            {fieldCount > 2 && (
              <Text style={styles.moreText}>
                +{fieldCount - 2} {t('CommonPage.more_fields') || 'more fields'}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderProjectsView = () => (
    <SafeAreaView style={styles.container}>
      <HeaderNavigation 
        showLeft={true} 
        title={t('HistoryPageReal.title') || "Submission History"} 
      />
      
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📴 {t('CommonPage.offline_mode') || 'Offline Mode'}
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.projectsList}>
        {Object.keys(submissionsByProject).length > 0 ? (
          <>
            {Object.entries(submissionsByProject).map(([projectName, submissions], index, array) => (
              <View key={projectName}>
                {renderProjectCard(projectName, submissions)}
                {index < array.length - 1 && (
                  <View style={styles.projectDivider} />
                )}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('HistoryPageReal.no_submissions') || 'No submissions found'}
            </Text>
            <Text style={styles.emptySubText}>
              {t('HistoryPageReal.no_submissions_description') || 'Submit a form to see it here'}
            </Text>
            {!isLoading && (
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={handleRefresh}
              >
                <Text style={styles.refreshButtonText}>
                  🔄 {t('CommonPage.refresh') || 'Refresh'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderSubmissionsView = () => (
    <SafeAreaView style={styles.container}>
      <HeaderNavigation 
        showLeft={true} 
        title={selectedProject || t('HistoryPageReal.submissions') || 'Submissions'}
       
      />
      
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📴 {t('CommonPage.offline_mode') || 'Offline Mode'}
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.listContainer}>
        {selectedProject && submissionsByProject[selectedProject] ? (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {submissionsByProject[selectedProject].length} {
                  submissionsByProject[selectedProject].length === 1
                    ? t('CommonPage.submission') || 'submission'
                    : t('HistoryPageReal.submissions') || 'submissions'
                }
              </Text>
            </View>
            {submissionsByProject[selectedProject].map(renderSubmissionItem)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('HistoryPageReal.no_submissions_for_project') || 'No submissions for this project'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderDetailView = () => {
    if (!selectedItem) return null;

    const displayId = selectedItem.id || selectedItem._id || 'Unknown';
    const isLocal = !selectedItem.id;

    return (
      <SafeAreaView style={styles.container}>
        <HeaderNavigation
          showLeft={true}
          title={t('HistoryPageReal.submission_detail') || 'Details'}
          showRight={true}
        />

        <ScrollView style={styles.detailScrollView}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleRow}>
              <Text style={styles.detailTitle}>
                {t('HistoryPageReal.submission_detail') || 'Submission'} #{displayId}
                {isLocal && ' (Local)'}
              </Text>
              {renderSyncBadge(selectedItem)}
            </View>
            
            <Text style={styles.detailSubtitle}>
              {t('CommonPage.project') || 'Project'}: {selectedItem.projectName || selectedItem.form_data?.project_id || t('CommonPage.unknown') || 'Unknown'}
            </Text>
            
            {(!selectedItem.sync_status || selectedItem.sync_status === 0) && selectedItem.sync_reason && (
              <View style={styles.syncReasonContainer}>
                <Text style={styles.syncReasonText}>
                  {t('CommonPage.sync_reason') || 'Sync status'}: {selectedItem.sync_reason}
                </Text>
                {selectedItem.sync_attempts > 0 && (
                  <Text style={styles.syncAttemptsText}>
                    {t('CommonPage.sync_attempts') || 'Attempts'}: {selectedItem.sync_attempts}
                  </Text>
                )}
              </View>
            )}
            
            <View style={styles.timestampContainer}>
              <Text style={styles.timestamp}>
                {t('HistoryPageReal.createdAt') || 'Created'}: {selectedItem.created_at 
                  ? new Date(selectedItem.created_at).toLocaleString() 
                  : t('CommonPage.not_available') || 'N/A'}
              </Text>
              {selectedItem.updated_at && selectedItem.updated_at !== selectedItem.created_at && (
                <Text style={styles.timestamp}>
                  {t('CommonPage.updated') || 'Updated'}: {new Date(selectedItem.updated_at).toLocaleString()}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('CommonPage.form_answers') || 'Form Answers'}
            </Text>
            <View style={styles.sectionContent}>
              {renderFormData(selectedItem.answers)}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  if (isLoading && submissions.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A23A91" />
        <Text style={styles.loadingText}>
          {t('CommonPage.loading') || 'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (!user || !userId) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderNavigation 
          showLeft={true} 
          title={t('Auth.session_expired_title') || 'Session Expired'} 
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {t('Auth.session_expired_message') || 'Please log in again'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderNavigation 
          showLeft={true} 
          title={t('CommonPage.error') || 'Error'} 
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {t('CommonPage.error_occurred') || 'An error occurred'}
          </Text>
          <Text style={styles.emptySubText}>{error.message}</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>
              {t('CommonPage.retry') || 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  switch (currentView) {
    case 'projects':
      return renderProjectsView();
    case 'submissions':
      return renderSubmissionsView();
    case 'details':
      return renderDetailView();
    default:
      return renderProjectsView();
  }
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
  },
  offlineBanner: {
    backgroundColor: "#FFA500",
    padding: 12,
    alignItems: "center",
  },
  offlineText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  refreshButton: {
    backgroundColor: "#A23A91",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "center",
    marginVertical: 12,
    minWidth: 120,
    alignItems: "center",
  },
  refreshButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  projectsList: {
    flex: 1,
    padding: 16,
  },
  projectCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    flex: 1,
    marginRight: 12,
  },
  projectBadge: {
    backgroundColor: "#A23A91",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  projectBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  projectMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  projectSubtitle: {
    fontSize: 14,
    color: "#6c757d",
  },
  pendingText: {
    fontSize: 12,
    color: "#FFA500",
    fontWeight: "600",
  },
  projectFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    paddingTop: 12,
    marginTop: 12,
  },
  projectFooterText: {
    fontSize: 12,
    color: "#495057",
    fontWeight: "500",
  },
  projectDivider: {
    height: 1,
    backgroundColor: "#dee2e6",
    marginVertical: 16,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
  },
  itemContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    flex: 1,
  },
  itemHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemBadge: {
    backgroundColor: "#e9ecef",
    color: "#495057",
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgeSuccess: {
    backgroundColor: "#28a745",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgePending: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  itemMeta: {
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  previewContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  moreText: {
    fontSize: 11,
    color: "#A23A91",
    fontStyle: "italic",
    marginTop: 2,
  },
  detailScrollView: {
    flex: 1,
  },
  detailHeader: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  detailTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212529",
    flex: 1,
  },
  detailSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 12,
  },
  syncReasonContainer: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncReasonText: {
    fontSize: 12,
    color: "#856404",
    marginBottom: 4,
  },
  syncAttemptsText: {
    fontSize: 11,
    color: "#856404",
    fontStyle: "italic",
  },
  timestampContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#495057",
    marginBottom: 2,
  },
  section: {
    marginVertical: 8,
    marginHorizontal: 16,
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
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: "#212529",
    lineHeight: 20,
  },
  nestedContainer: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#dee2e6",
  },
  fieldDivider: {
    height: 1,
    backgroundColor: "#f1f3f4",
    marginVertical: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    fontStyle: "italic",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
});

export default RealmDatabaseViewer ;