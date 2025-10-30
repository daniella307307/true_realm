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
  RefreshControl,
} from "react-native";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/lib/hooks/useAuth";
import { router } from "expo-router";
import { useGetAllSurveySubmissions } from "~/lib/hooks/useGetAllSurveySubmissions";
import { SurveySubmission } from "~/services/survey-submission";
import { useGetForms } from "~/services/formElements";
import EmptyDynamicComponent from "~/components/EmptyDynamic";

const RealmDatabaseViewer = () => {
  const { t } = useTranslation();
  const { user } = useAuth({});
  const [submissionsByProject, setSubmissionsByProject] = useState<
    Record<string, any[]>
  >({});
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'projects' | 'submissions' | 'details'>('projects');
  const [refreshing, setRefreshing] = useState(false);
  
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

  // Get all forms once at the top level
  const { forms } = useGetForms(false);

  // Create a lookup map for forms for efficient access
  const formsMap = useMemo(() => {
    if (!forms || !Array.isArray(forms)) return {};
    
    const map: Record<string, any> = {};
    forms.forEach(form => {
      if (form?.id || form?.id) {
        const formId = form.id || form.id;
        map[formId] = form;
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

    const grouped: Record<string, Array<SurveySubmission & { projectName: string; formTitle: string }>> = {};

    submissions.forEach((s) => {
    
      const surveyId = s.form_data?.survey_id || s.form_data?.form ;  
      const form = surveyId ? formsMap[surveyId] : null;
      
      // Get form title with fallbacks
      const formTitle = String(
        form?.title || 
        form?.name ||
        s.form_data?.title ||
        `${t('CommonPage.form') || 'Form'} #${surveyId || 'Unknown'}`
      );
      
      // Get project name with fallbacks
      const projectName = String(
        form?.metadata?.category ||
        s.form_data?.project_name ||
        formTitle
      );
      
      // Use project name as key for grouping
      const projectKey = projectName;
      
      if (!grouped[projectKey]) {
        grouped[projectKey] = [];
      }
      
      grouped[projectKey].push({
        ...s,
        projectName,
        formTitle,
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
    setRefreshing(true);
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
      }
    } catch (error: any) {
      console.error("Refresh failed:", error);
      Alert.alert(
        t('CommonPage.error') || 'Error',
        error?.message || t('CommonPage.refresh_failed') || 'Failed to refresh data'
      );
    } finally {
      setRefreshing(false);
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
    const syncedCount = submissions.length - pendingCount;
    
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
          <View style={styles.projectTitleContainer}>
            <Text style={styles.projectTitle} numberOfLines={2}>
              {projectName}
            </Text>
            <Text style={styles.projectSubtitle}>
              {submissions.length} {submissions.length === 1 
                ? t('CommonPage.submission') || 'submission'
                : t('HistoryPageReal.submissions') || 'submissions'}
            </Text>
          </View>
          <View style={styles.projectBadge}>
            <Text style={styles.projectBadgeText}>
              {submissions.length}
            </Text>
          </View>
        </View>
        
        <View className="flex-1 gap-y-2">
          {syncedCount > 0 && (
            <View style={styles.statItem}>
              <View style={styles.statIconSuccess}>
                <Text style={styles.statIconText}>✓</Text>
              </View>
              <Text style={styles.statText}>
                {syncedCount} {t('CommonPage.synced') || 'synced'}
              </Text>
            </View>
          )}
          {pendingCount > 0 && (
            <View style={styles.statItem}>
              <View style={styles.statIconPending}>
                <Text style={styles.statIconText}>⟳</Text>
              </View>
              <Text style={styles.statTextPending}>
                {pendingCount} {t('CommonPage.pending') || 'pending'}
              </Text>
            </View>
          )}
        </View>
        
        {submissions.length > 0 && (
          <View style={styles.projectFooter}>
            <Text style={styles.projectFooterText}>
              {t('HistoryPageReal.lastSubmission') || 'Last submission'}: {submissions[0].created_at 
                ? new Date(submissions[0].created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : t('CommonPage.not_available') || 'N/A'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSubmissionItem = (item: any) => {
    // Use the correct property name: 'data' instead of 'answers'
    const fieldCount = item.data 
      ? Object.keys(item.data).filter(key => key !== 'language' && key !== 'submit').length 
      : 0;

    // Display either server ID or local ID
    const displayId = item.id || item._id || 'Unknown';
    const isLocal = !item.id;

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
          <View style={styles.itemTitleContainer}>
            <Text style={styles.itemTitle}>
              {item.formTitle || t('HistoryPageReal.submission_detail') || 'Submission'}
            </Text>
            {isLocal && (
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>Local</Text>
              </View>
            )}
          </View>
          <View style={styles.itemHeaderRight}>
            {renderSyncBadge(item)}
          </View>
        </View>
        
        <View style={styles.itemMeta}>
          <Text style={styles.itemMetaText}>
            #{String(displayId).substring(0, 8)}...
          </Text>
          <Text style={styles.itemMetaDivider}>•</Text>
          <Text style={styles.itemMetaText}>
            {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
          </Text>
        </View>
        
        <View style={styles.itemDateContainer}>
          <Text style={styles.itemDate}>
            {item.created_at 
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : t('CommonPage.not_available') || 'N/A'}
          </Text>
        </View>
        
        {fieldCount > 0 && (
          <View style={styles.previewContainer}>
            {Object.entries(item.data)
              .filter(([key]) => key !== 'language' && key !== 'submit')
              .slice(0, 2)
              .map(([key, value]) => (
              <View key={key} style={styles.previewRow}>
                <Text style={styles.previewKey} numberOfLines={1}>
                  {formatFieldName(key)}:
                </Text>
                <Text style={styles.previewValue} numberOfLines={1}>
                  {formatValue(value)}
                </Text>
              </View>
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
      
      <ScrollView 
        style={styles.projectsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#00227c"]}
            tintColor="#00227c"
          />
        }
      >
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
            <EmptyDynamicComponent message={t('HistoryPageReal.no_submissions') || 'No submissions found'}/>
            <Text style={styles.emptySubText}>
              {t('HistoryPageReal.no_submissions_description') || 'Submit a form to see it here'}
            </Text>
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
      
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#00227c"]}
            tintColor="#00227c"
          />
        }
      >
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
  const canEdit = true; 

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
              {selectedItem.formTitle || t('HistoryPageReal.submission_detail') || 'Submission'}
            </Text>
            {renderSyncBadge(selectedItem)}
          </View>
          
          <View style={styles.detailIdRow}>
            <Text style={styles.detailId}>
              #{String(displayId).substring(0, 12)}...
            </Text>
            {isLocal && (
              <View style={styles.localBadgeLarge}>
                <Text style={styles.localBadgeTextLarge}>Local Only</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.detailSubtitle}>
            {t('CommonPage.project') || 'Project'}: {selectedItem.projectName || t('CommonPage.unknown') || 'Unknown'}
          </Text>
          
          {(!selectedItem.sync_status || selectedItem.sync_status === 0) && selectedItem.sync_reason && (
            <View style={styles.syncReasonContainer}>
              <Text style={styles.syncReasonLabel}>
                ⚠️ {t('CommonPage.sync_status') || 'Sync Status'}
              </Text>
              <Text style={styles.syncReasonText}>
                {selectedItem.sync_reason}
              </Text>
              {selectedItem.sync_attempts > 0 && (
                <Text style={styles.syncAttemptsText}>
                  {selectedItem.sync_attempts} {t('CommonPage.sync_attempts') || 'sync attempts'}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.timestampContainer}>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>
                {t('HistoryPageReal.createdAt') || 'Created'}:
              </Text>
              <Text style={styles.timestamp}>
                {selectedItem.created_at 
                  ? new Date(selectedItem.created_at).toLocaleString() 
                  : t('CommonPage.not_available') || 'N/A'}
              </Text>
            </View>
            {selectedItem.updated_at && selectedItem.updated_at !== selectedItem.created_at && (
              <View style={styles.timestampRow}>
                <Text style={styles.timestampLabel}>
                  {t('CommonPage.updated') || 'Updated'}:
                </Text>
                <Text style={styles.timestamp}>
                  {new Date(selectedItem.updated_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

         
{canEdit && (
  <TouchableOpacity
    style={styles.editButton}
    onPress={() => {
      router.push({
  pathname: "/(projects)/(mods)/(projects)/(edit-submission)/[submissionId]",
  params: { submissionId: selectedItem._id }
});
    }}
  >
    <Text style={styles.editButtonText}>
       {t('CommonPage.edit') || 'Edit Submission'}
    </Text>
  </TouchableOpacity>
)}

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('CommonPage.form_answers') || 'Form Answers'}
          </Text>
          <View style={styles.sectionContent}>
            {renderFormData(selectedItem.data)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

  if (isLoading && submissions.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00227c" />
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
    fontWeight: "500",
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
    backgroundColor: "#00227c",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 16,
    minWidth: 120,
    alignItems: "center",
    shadowColor: "#00227c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  projectsList: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryCount: {
    fontSize: 48,
    fontWeight: "700",
    color: "#00227c",
    marginVertical: 8,
  },
  summarySubtext: {
    fontSize: 14,
    color: "#6c757d",
  },
  projectCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  projectTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 4,
  },
  projectSubtitle: {
    fontSize: 13,
    color: "#6c757d",
    fontWeight: "500",
  },
  projectBadge: {
    backgroundColor: "#00227c",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 40,
    alignItems: "center",
  },
  projectBadgeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statIconSuccess: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#28a745",
    alignItems: "center",
    justifyContent: "center",
  },
  statIconPending: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFA500",
    alignItems: "center",
    justifyContent: "center",
  },
  statIconText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  statText: {
    fontSize: 13,
    color: "#28a745",
    fontWeight: "600",
  },
  statTextPending: {
    fontSize: 13,
    color: "#FFA500",
    fontWeight: "600",
  },
  projectFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    paddingTop: 12,
  },
  projectFooterText: {
    fontSize: 12,
    color: "#6c757d",
    fontWeight: "500",
  },
  projectDivider: {
    height: 1,
    backgroundColor: "#dee2e6",
    marginVertical: 8,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    marginBottom: 16,
    paddingHorizontal: 4,
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
    color: "#00227c",
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
 
itemMetaText: {
  fontSize: 12,
  color: "#6c757d",
  fontWeight: "500",
},
itemMetaDivider: {
  fontSize: 12,
  color: "#6c757d",
  marginHorizontal: 6,
},
itemDateContainer: {
  marginBottom: 8,
},
previewRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 6,
},
previewKey: {
  fontSize: 12,
  color: "#495057",
  fontWeight: "600",
  flex: 1,
  marginRight: 8,
},
previewValue: {
  fontSize: 12,
  color: "#6c757d",
  flex: 2,
  textAlign: "right",
},
detailIdRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
  gap: 8,
},
detailId: {
  fontSize: 14,
  color: "#6c757d",
  fontFamily: "monospace",
  fontWeight: "500",
},
localBadgeLarge: {
  backgroundColor: "#6c757d",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
},
localBadgeTextLarge: {
  color: "white",
  fontSize: 10,
  fontWeight: "600",
},
syncReasonLabel: {
  fontSize: 12,
  fontWeight: "600",
  color: "#856404",
  marginBottom: 4,
},
timestampRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 4,
},
timestampLabel: {
  fontSize: 12,
  color: "#495057",
  fontWeight: "600",
  minWidth: 60,
},
itemTitleContainer: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},
localBadge: {
  backgroundColor: "#6c757d",
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 8,
},
localBadgeText: {
  color: "white",
  fontSize: 9,
  fontWeight: "600",
},
editButton: {
    backgroundColor: "#00227c",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00227c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RealmDatabaseViewer ;