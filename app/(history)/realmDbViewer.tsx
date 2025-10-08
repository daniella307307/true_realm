import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { useSQLite } from "~/providers/RealContextProvider";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/lib/hooks/useAuth";
import { router } from "expo-router";

const RealmDatabaseViewer = () => {
  const { t } = useTranslation();
  const { user } = useAuth({});
  const [submissionsByModule, setSubmissionsByModule] = useState<
    Record<string, any[]>
  >({});
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'modules' | 'submissions' | 'details'>('modules');
  const { getAll } = useSQLite();

  useEffect(() => {
    // Check authentication first
    if (!user) {
      Alert.alert(
        t('Auth.session_expired_title'),
        t('Auth.session_expired_message'),
        [
          {
            text: t('CommonPage.ok'),
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }
    
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
     
      const submissionsData = await getAll('SurveySubmissions');

      const processedSubmissions = Array.from(submissionsData).map((item: any) => ({
        id: item.id,
        answers: item.answers || {},
        form_data: item.form_data || {},
        location: item.location || {},
        sync_data: item.sync_data || {},
        created_at: item.created,
        updated_at: item.updated,
      }));

      // Group by module_id and get module names
      const grouped: Record<string, any[]> = {};
      processedSubmissions.forEach((s) => {
        const moduleId = s.form_data?.project_id || "unknown";
        const moduleName = s.form_data?.project_title || s.form_data?.project_name || `${t('ModulePage.module')} ${moduleId}`;
        
        const moduleKey = moduleName;
        if (!grouped[moduleKey]) {
          grouped[moduleKey] = [];
        }
        grouped[moduleKey].push({
          ...s,
          moduleId,
          moduleName,
        });
      });

      // Sort modules by name
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

      setSubmissionsByModule(sortedGrouped);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert(
        t('CommonPage.error'),
        t('HistoryPageReal.load_error') || "Failed to load data from database: " + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return t('HistoryPageReal.not_answered');
    if (typeof value === "boolean") return value ? t('CommonPage.yes') : t('CommonPage.no');
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderFormData = (answers: any, depth = 0) => {
    if (!answers || Object.keys(answers).length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('FormElementPage.noFields')}</Text>
        </View>
      );
    }

    const filteredEntries = Object.entries(answers).filter(([key]) => 
      key !== "language" && key !== "submit"
    );

    if (filteredEntries.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('FormElementPage.noFields')}</Text>
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

  const renderModuleCard = (moduleName: string, submissions: any[]) => (
    <TouchableOpacity
      key={moduleName}
      style={styles.moduleCard}
      onPress={() => {
        setSelectedModule(moduleName);
        setCurrentView('submissions');
      }}
    >
      <View style={styles.moduleHeader}>
        <Text style={styles.moduleTitle}>
          {moduleName}
        </Text>
        <View style={styles.moduleBadge}>
          <Text style={styles.moduleBadgeText}>
            {submissions.length}
          </Text>
        </View>
      </View>
      
      <Text style={styles.moduleSubtitle}>
        {submissions.length} {submissions.length === 1 
          ? t('CommonPage.submission') 
          : t('HistoryPageReal.submissions')}
      </Text>
      
      {submissions.length > 0 && (
        <View style={styles.moduleFooter}>
          <Text style={styles.moduleFooterText}>
            {t('HistoryPageReal.lastSubmission')}: {submissions[0].created_at 
              ? new Date(submissions[0].created_at).toLocaleDateString() 
              : t('CommonPage.not_available')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSubmissionItem = (item: any) => {
    const fieldCount = item.answers 
      ? Object.keys(item.answers).filter(key => key !== 'language' && key !== 'submit').length 
      : 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemContainer}
        onPress={() => {
          setSelectedItem(item);
          setCurrentView('details');
        }}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>
            {t('HistoryPageReal.submission_detail')} #{item.id}
          </Text>
          <Text style={styles.itemBadge}>
            {fieldCount} {t('CommonPage.fields')}
          </Text>
        </View>
        
        <View style={styles.itemMeta}>
          <Text style={styles.itemDate}>
            {t('HistoryPageReal.createdAt')}: {item.created_at 
              ? new Date(item.created_at).toLocaleDateString() 
              : t('CommonPage.not_available')}
          </Text>
          {item.updated_at && item.updated_at !== item.created_at && (
            <Text style={styles.itemDate}>
              {t('CommonPage.updated')}: {new Date(item.updated_at).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        {fieldCount > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>{t('CommonPage.preview')}:</Text>
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
                +{fieldCount - 2} {t('CommonPage.more_fields')}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderModulesView = () => (
    <SafeAreaView style={styles.container}>
      <HeaderNavigation showLeft={true} title={t('HistoryPageReal.title') || "Submission History"} />
      
      <ScrollView style={styles.modulesList}>
        {Object.keys(submissionsByModule).length > 0 ? (
          <>
            <View style={styles.listHeader}>
              {/* Optional header content */}
            </View>
            {Object.entries(submissionsByModule).map(([moduleName, submissions], index, array) => (
              <View key={moduleName}>
                {renderModuleCard(moduleName, submissions)}
                {index < array.length - 1 && (
                  <View style={styles.moduleDivider} />
                )}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('HistoryPageReal.no_submissions')}</Text>
            <Text style={styles.emptySubText}>
              {t('HistoryPageReal.no_submissions_description')}
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
        title={selectedModule || t('HistoryPageReal.submissions')}
      />
      
      <ScrollView style={styles.listContainer}>
        {selectedModule && submissionsByModule[selectedModule] ? (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {submissionsByModule[selectedModule].length} {
                  submissionsByModule[selectedModule].length === 1
                    ? t('CommonPage.submission')
                    : t('HistoryPageReal.submissions')
                } {t('CommonPage.in')} {selectedModule}
              </Text>
            </View>
            {submissionsByModule[selectedModule].map(renderSubmissionItem)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('HistoryPageReal.no_submissions_for_module')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderDetailView = () => {
    if (!selectedItem) return null;

    return (
      <SafeAreaView style={styles.container}>
        <HeaderNavigation
          showLeft={true}
          title={t('HistoryPageReal.submission_detail')}
        />

        <ScrollView style={styles.detailScrollView}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              {t('HistoryPageReal.submission_detail')} #{selectedItem.id}
            </Text>
            <Text style={styles.detailSubtitle}>
              {t('ModulePage.module')}: {selectedItem.moduleName || selectedItem.form_data?.project_module_id || t('CommonPage.unknown')}
            </Text>
            <View style={styles.timestampContainer}>
              <Text style={styles.timestamp}>
                {t('HistoryPageReal.createdAt')}: {selectedItem.created_at 
                  ? new Date(selectedItem.created_at).toLocaleString() 
                  : t('CommonPage.not_available')}
              </Text>
              {selectedItem.updated_at && selectedItem.updated_at !== selectedItem.created_at && (
                <Text style={styles.timestamp}>
                  {t('CommonPage.updated')}: {new Date(selectedItem.updated_at).toLocaleString()}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('CommonPage.form_answers')}</Text>
            <View style={styles.sectionContent}>
              {renderFormData(selectedItem.answers)}
            </View>
          </View> 
        </ScrollView>
      </SafeAreaView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('CommonPage.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderNavigation showLeft={true} title={t('Auth.session_expired_title')} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('Auth.session_expired_message')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  switch (currentView) {
    case 'modules':
      return renderModulesView();
    case 'submissions':
      return renderSubmissionsView();
    case 'details':
      return renderDetailView();
    default:
      return renderModulesView();
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
  },
  modulesList: {
    flex: 1,
    padding: 16,
  },
  moduleCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    flex: 1,
  },
  moduleBadge: {
    backgroundColor: "#A23A91",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moduleBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  moduleSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 12,
  },
  moduleFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    paddingTop: 12,
    marginTop: 12,
  },
  moduleFooterText: {
    fontSize: 12,
    color: "#495057",
    fontWeight: "500",
  },
  moduleDivider: {
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
  itemBadge: {
    backgroundColor: "#e9ecef",
    color: "#495057",
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 4,
  },
  detailSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 12,
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

export default RealmDatabaseViewer;