import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/lib/hooks/useAuth";
import { router } from "expo-router";
import { useGetAllSurveySubmissions } from "~/lib/hooks/useGetAllSurveySubmissions";
import {
  SurveySubmission,
  PaginationMetadata,
  loadNextPage,
  getPaginationStatus,
} from "~/services/survey-submission";
import { useGetForms } from "~/services/formElements";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { isOnline } from "~/services/network";

const RealmDatabaseViewer = () => {
  const { t } = useTranslation();
  const { user, isLoggedIn } = useAuth({});
  const [submissionsByProject, setSubmissionsByProject] = useState<Record<string, any[]>>({});
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'projects' | 'submissions' | 'details'>('projects');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationMetadata, setPaginationMetadata] = useState<PaginationMetadata | null>(null);
  const [cachedPages, setCachedPages] = useState<number[]>([]);
  const [totalCached, setTotalCached] = useState(0);
  const [projectPage, setProjectPage] = useState(1);
  const PROJECT_PAGE_SIZE = 10;

  const userId = user?.id || user?.json?.id;
  const userIdFilter = user?.id?.toString() || user?.json?.id?.toString() || "";

  const {
    submissions,
    isLoading,
    error,
    isOffline,
    refresh,
    create,
    update,
    getAll
  } = useGetAllSurveySubmissions(false);

  const { forms } = useGetForms(false);

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

  const isSelectionValue = (value: any): boolean => {
    return typeof value === 'boolean';
  };

  const getSelectionDisplay = (key: string, value: any): string => {
    if (value === true) {
      return formatFieldName(key);
    }
    if (value === false) {
      return '';
    }
    return String(value);
  };

  const renderFilePreview = (file: any) => {

  
  // Handle various file formats
  const fileUri = file.uri || file.url || file.path || file.originalData || '';
  const fileName = file.name || file.fileName || 'File';
  const fileType = file.type || file.mimeType || '';
  const isBase64 = file.isBase64 || (typeof fileUri === 'string' && fileUri.startsWith('data:'));
  
  const isImage = fileType.startsWith('image/') || 
                  /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName) ||
                  (isBase64 && fileUri.includes('image/'));
  
  if (isImage && fileUri) {
    return (
      <View className="bg-gray-50 rounded-lg p-2 border border-gray-200 mb-2">
        <Image
          source={{ uri: fileUri }}
          className="w-full h-48 rounded-lg mb-2"
          resizeMode="cover"
          onError={(error) => {
            console.error('Image load error:', error);
          }}
        />
        <Text className="text-xs text-gray-600" numberOfLines={1}>
          📎 {fileName}
        </Text>
        {fileType && (
          <Text className="text-xs text-gray-400" numberOfLines={1}>
            {fileType}
          </Text>
        )}
      </View>
    );
  }
  
  return (
    <View className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex-row items-center mb-2">
      <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
        <Text className="text-xl">📄</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
          {fileName}
        </Text>
        {fileType && (
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {fileType}
          </Text>
        )}
        {file.size && (
          <Text className="text-xs text-gray-400">
            {formatFileSize(file.size)}
          </Text>
        )}
      </View>
      {fileUri && (
        <TouchableOpacity
          className="bg-blue-900 px-3 py-1.5 rounded-lg"
          onPress={() => {
            if (isBase64) {
              Alert.alert(
                t('CommonPage.file') || 'File',
                t('CommonPage.file_saved_locally') || 'File data is stored locally'
              );
            } else {
              Alert.alert(
                t('CommonPage.file') || 'File',
                `${fileName}\n\n${fileUri}`,
                [
                  { text: t('CommonPage.ok') || 'OK' }
                ]
              );
            }
          }}
        >
          <Text className="text-white text-xs font-semibold">
            {t('CommonPage.info') || 'Info'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Enhanced isFileObject function for Document 2
const isFileObject = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  
  return (
    ('uri' in value || 'url' in value || 'path' in value) &&
    ('type' in value || 'mimeType' in value || 'name' in value)
  ) || (
    value.storage && value.name
  ) || (
    
    value.isBase64 && value.originalData
  );
};

  const formatValue = (value: any, fieldKey?: string, allAnswers?: any) => {
    if (value === null || value === undefined) {
      return t('HistoryPageReal.not_answered') || 'Not answered';
    }
    
    if (isFileObject(value)) {
      return renderFilePreview(value);
    }
    
    if (Array.isArray(value) && value.length > 0 && isFileObject(value[0])) {
      return (
        <View className="gap-2">
          {value.map((file, idx) => (
            <View key={idx}>{renderFilePreview(file)}</View>
          ))}
        </View>
      );
    }
    
    if (fieldKey && allAnswers && isSelectionValue(value)) {
      const displayValue = getSelectionDisplay(fieldKey, value);
      if (!displayValue) return null;
      return displayValue;
    }
    
    if (Array.isArray(value)) {
      const filtered = value.filter(v => v !== false);
      if (filtered.length === 0) return t('HistoryPageReal.not_answered') || 'Not answered';
      return filtered.map(v => String(v)).join(", ");
    }
    
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };

  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const renderFormData = (answers: any, depth = 0) => {
    if (!answers || Object.keys(answers).length === 0) {
      return (
        <View className="items-center justify-center p-8">
          <Text className="text-base text-gray-500 italic text-center">
            {t('FormElementPage.noFields') || 'No fields available'}
          </Text>
        </View>
      );
    }

    const filteredEntries = Object.entries(answers).filter(([key, value]) => {
      if (key === "language" || key === "submit") return false;
      if (value === false) return false;
      return true;
    });

    if (filteredEntries.length === 0) {
      return (
        <View className="items-center justify-center p-8">
          <Text className="text-base text-gray-500 italic text-center">
            {t('FormElementPage.noFields') || 'No fields available'}
          </Text>
        </View>
      );
    }

    return filteredEntries.map(([key, value], idx, array) => {
      const formattedValue = formatValue(value, key, answers);
      
      if (formattedValue === null) return null;
      
      return (
        <View key={`${key}-${idx}`}>
          <View className="py-2" style={{ marginLeft: depth * 16 }}>
            <Text className="text-sm font-semibold text-gray-600 mb-1">
              {formatFieldName(key)}
            </Text>

            {typeof value === "object" && 
             value !== null && 
             !Array.isArray(value) && 
             !isFileObject(value) ? (
              <View className="mt-2 pl-3 border-l-2 border-gray-200">
                {renderFormData(value, depth + 1)}
              </View>
            ) : (
              <View>
                {typeof formattedValue === 'string' ? (
                  <Text className="text-sm text-gray-800 leading-5">
                    {formattedValue}
                  </Text>
                ) : (
                  formattedValue
                )}
              </View>
            )}
          </View>

          {idx < array.length - 1 && (
            <View className="h-px bg-gray-100 my-2" />
          )}
        </View>
      );
    }).filter(Boolean);
  };

  // Load pagination status
  useEffect(() => {
    const loadPaginationStatus = async () => {
      try {
        const status = await getPaginationStatus(getAll);
        setPaginationMetadata(status.metadata);
        setCachedPages(status.cachedPages);
        setTotalCached(status.totalCached);
      } catch (error) {
        console.error('Error loading pagination status:', error);
      }
    };

    if (getAll) {
      loadPaginationStatus();
    }
  }, [getAll, submissions]);

  // Auth check
  useEffect(() => {
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

  // Group submissions by project
  useEffect(() => {
    if (!submissions || submissions.length === 0) {
      setSubmissionsByProject({});
      return;
    }

    const grouped: Record<string, Array<SurveySubmission & { projectName: string; formTitle: string }>> = {};

    submissions.forEach((s) => {
      const surveyId = s.form_data?.survey_id || s.form_data?.form;
      const form = surveyId ? formsMap[surveyId] : null;

      const formTitle = String(
        form?.title ||
        form?.name ||
        s.form_data?.table_name ||
        `${t('CommonPage.form') || 'Form'} #${surveyId || 'Unknown'}`
      );

      const projectName = String(
        form?.metadata?.category ||
        s.form_data?.project_name ||
        formTitle
      );

      if (!grouped[projectName]) {
        grouped[projectName] = [];
      }

      grouped[projectName].push({
        ...s,
        projectName,
        formTitle,
      });
    });

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
  }, [submissions, formsMap, t]);

  // Reset pagination when project changes
  useEffect(() => {
    if (selectedProject) {
      setProjectPage(1);
    }
  }, [selectedProject]);

  // Calculate paginated submissions
  const projectPaginatedSubmissions = useMemo(() => {
    if (!selectedProject || !submissionsByProject[selectedProject]) {
      return [];
    }
    
    const allSubs = submissionsByProject[selectedProject];
    const endIndex = projectPage * PROJECT_PAGE_SIZE;
    return allSubs.slice(0, endIndex);
  }, [selectedProject, submissionsByProject, projectPage]);

  const projectHasNextPage = useMemo(() => {
    if (!selectedProject || !submissionsByProject[selectedProject]) {
      return false;
    }
    
    const allSubs = submissionsByProject[selectedProject];
    const currentlyShowing = projectPage * PROJECT_PAGE_SIZE;
    return allSubs.length > currentlyShowing;
  }, [selectedProject, submissionsByProject, projectPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await refresh();

      const status = await getPaginationStatus(getAll);
      setPaginationMetadata(status.metadata);
      setCachedPages(status.cachedPages);
      setTotalCached(status.totalCached);

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

  const handleLoadMoreProjectSubs = () => {
    if (!projectHasNextPage || loadingMore) return;
    
    setLoadingMore(true);
    setTimeout(() => {
      setProjectPage(prev => prev + 1);
      setLoadingMore(false);
    }, 300);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !paginationMetadata?.hasNextPage) return;

    const online = await isOnline();
    
    if (!online) {
      Alert.alert(
        t('CommonPage.offline_mode') || 'Offline Mode',
        t('CommonPage.need_internet_load_more') || 'You need an internet connection to load more submissions'
      );
      return;
    }

    setLoadingMore(true);
    try {
      const result = await loadNextPage(
        create,
        update,
        getAll,
        userIdFilter,
        await isLoggedIn
      );

      if (result.success) {
        if (result.pagination) {
          setPaginationMetadata(result.pagination);
        }

        await refresh();

        const status = await getPaginationStatus(getAll);
        setCachedPages(status.cachedPages);
        setTotalCached(status.totalCached);

        if (result.fromCache) {
          Alert.alert(
            t('CommonPage.info') || 'Info',
            t('CommonPage.loaded_from_cache') || 'Loaded from local cache'
          );
        } else if (result.itemsSynced > 0) {
          Alert.alert(
            t('CommonPage.success') || 'Success',
            `${result.itemsSynced} ${t('CommonPage.more_submissions_loaded') || 'more submissions loaded'}`
          );
        }
      } else {
        Alert.alert(
          t('CommonPage.error') || 'Error',
          t('CommonPage.failed_load_more') || 'Failed to load more submissions'
        );
      }
    } catch (error: any) {
      console.error('Error loading more submissions:', error);
      Alert.alert(
        t('CommonPage.error') || 'Error',
        error?.message || t('CommonPage.failed_load_more') || 'Failed to load more submissions'
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const renderSyncBadge = (item: any) => {
    const isSynced = item.sync_status === 1 || item.sync_status === true;

    if (isSynced) {
      return (
        <View className="bg-green-500 px-2 py-1 rounded-xl">
          <Text className="text-white text-[10px] font-semibold">
            ✓ {t('CommonPage.synced') || 'Synced'}
          </Text>
        </View>
      );
    } else {
      return (
        <View className="bg-orange-500 px-2 py-1 rounded-xl">
          <Text className="text-white text-[10px] font-semibold">
            ⟳ {t('CommonPage.pending') || 'Pending'}
          </Text>
        </View>
      );
    }
  };

  const renderPaginationInfo = () => {
    if (!paginationMetadata) return null;

    return (
      <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200 shadow-sm">
        <Text className="text-base font-bold text-gray-800 mb-3">
          {t('CommonPage.pagination_info') || 'Data Status'}
        </Text>
        <View className="flex-row justify-around mb-4">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-900">{submissions.length}</Text>
            <Text className="text-xs text-gray-500 mt-1">
              {t('CommonPage.loaded') || 'Loaded'}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-900">{paginationMetadata.totalItems}</Text>
            <Text className="text-xs text-gray-500 mt-1">
              {t('CommonPage.total') || 'Total'}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-900">
              {paginationMetadata.currentPage}/{paginationMetadata.totalPages}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              {t('CommonPage.pages') || 'Pages'}
            </Text>
          </View>
        </View>
        {paginationMetadata.hasNextPage && (
          <TouchableOpacity
            className={`bg-blue-900 py-3.5 px-5 rounded-xl items-center ${loadingMore ? 'opacity-50' : ''}`}
            onPress={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">
                {t('CommonPage.load_more') || 'Load More Submissions'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderProjectCard = (projectName: string, submissions: any[]) => {
    const pendingCount = submissions.filter(s => !s.sync_status || s.sync_status === 0).length;
    const syncedCount = submissions.length - pendingCount;

    return (
      <TouchableOpacity
        key={projectName}
        className="bg-white rounded-2xl p-5 mb-4 border border-gray-200 shadow-sm"
        onPress={() => {
          setSelectedProject(projectName);
          setCurrentView('submissions');
        }}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-800 mb-1" numberOfLines={2}>
              {projectName}
            </Text>
            <Text className="text-xs text-gray-500 font-medium">
              {submissions.length} {submissions.length === 1
                ? t('CommonPage.submission') || 'submission'
                : t('HistoryPageReal.submissions') || 'submissions'}
            </Text>
          </View>
          <View className="bg-blue-900 px-3.5 py-2 rounded-full min-w-[40px] items-center">
            <Text className="text-white text-base font-bold">
              {submissions.length}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-4 mb-3">
          {syncedCount > 0 && (
            <View className="flex-row items-center gap-1.5">
              <View className="w-5 h-5 rounded-full bg-green-500 items-center justify-center">
                <Text className="text-white text-xs font-bold">✓</Text>
              </View>
              <Text className="text-xs text-green-600 font-semibold">
                {syncedCount} {t('CommonPage.synced') || 'synced'}
              </Text>
            </View>
          )}
          {pendingCount > 0 && (
            <View className="flex-row items-center gap-1.5">
              <View className="w-5 h-5 rounded-full bg-orange-500 items-center justify-center">
                <Text className="text-white text-xs font-bold">⟳</Text>
              </View>
              <Text className="text-xs text-orange-600 font-semibold">
                {pendingCount} {t('CommonPage.pending') || 'pending'}
              </Text>
            </View>
          )}
        </View>

        {submissions.length > 0 && (
          <View className="border-t border-gray-100 pt-3">
            <Text className="text-xs text-gray-500 font-medium">
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
    const fieldCount = item.data
      ? Object.keys(item.data).filter(key => key !== 'language' && key !== 'submit' && item.data[key] !== false).length
      : 0;

    const displayId = item.id || item._id || 'Unknown';
    const isLocal = !item.id;

    return (
      <TouchableOpacity
        key={item._id || item.id}
        className="bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm"
        onPress={() => {
          setSelectedItem(item);
          setCurrentView('details');
        }}
      >
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-1 flex-row items-center gap-2">
            <Text className="text-base font-semibold text-gray-800 flex-1">
              {item.formTitle || t('HistoryPageReal.submission_detail') || 'Submission'}
            </Text>
            {isLocal && (
              <View className="bg-gray-500 px-1.5 py-0.5 rounded-lg">
                <Text className="text-white text-[9px] font-semibold">Local</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {renderSyncBadge(item)}
          </View>
        </View>
        <View className="mb-2">
          <Text className="text-xs text-gray-500">
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
          <View className="bg-gray-50 p-3 rounded-lg mt-2">
            {Object.entries(item.data)
              .filter(([key, value]) => key !== 'language' && key !== 'submit' && value !== false)
              .slice(0, 2)
              .map(([key, value]) => (
                <View key={key} className="flex-row justify-between items-start mb-1.5">
                  <Text className="text-xs text-gray-600 font-semibold flex-1 mr-2" numberOfLines={1}>
                    {formatFieldName(key)}:
                  </Text>
                  <Text className="text-xs text-gray-500 flex-2 text-right" numberOfLines={1}>
                    {typeof value === 'string' || typeof value === 'number' ? String(value) : 
                     Array.isArray(value) ? value.filter(v => v !== false).join(', ') :
                     value === true ? '✓' : 'File'}
                  </Text>
                </View>
              ))}
            {fieldCount > 2 && (
              <Text className="text-[11px] text-blue-900 italic mt-0.5">
                +{fieldCount - 2} {t('CommonPage.more_fields') || 'more fields'}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderProjectsView = () => (
    <SafeAreaView className="flex-1 bg-gray-50">
      <HeaderNavigation
        showLeft={true}
        title={t('HistoryPageReal.title') || "Submission History"}
        showRight
      />

      {isOffline && (
        <View className="bg-orange-500 p-3 items-center">
          <Text className="text-white text-sm font-semibold">
            📴 {t('CommonPage.offline_mode') || 'Offline Mode'}
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1 p-4"
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
                  <View className="h-px bg-gray-300 my-2" />
                )}
              </View>
            ))}
          </>
        ) : (
          <View className="items-center justify-center p-8">
            <EmptyDynamicComponent message={t('HistoryPageReal.no_submissions') || 'No submissions found'} />
            <Text className="text-sm text-gray-400 italic text-center mt-2">
              {t('HistoryPageReal.no_submissions_description') || 'Submit a form to see it here'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderSubmissionsView = () => (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#00227c"]}
            tintColor="#00227c"
          />
        }
      >
        {renderPaginationInfo()}
        
        {selectedProject && submissionsByProject[selectedProject] ? (
          <>
            <View className="mb-4 px-1">
              <Text className="text-base font-semibold text-gray-600">
                {t('HomePage.total_submissions') || 'Submissions'} {projectPaginatedSubmissions.length} {t('CommonPage.of') || 'of'} {submissionsByProject[selectedProject].length}
              </Text>
            </View>
            
            {projectPaginatedSubmissions.map(renderSubmissionItem)}

            {projectHasNextPage && (
              <TouchableOpacity
                className={`bg-blue-900 py-3.5 px-5 rounded-xl mt-4 mb-6 items-center ${loadingMore ? 'opacity-50' : ''}`}
                onPress={handleLoadMoreProjectSubs}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-base font-semibold">
                    {t('CommonPage.load_more') || 'Load More Submissions'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View className="items-center justify-center p-8">
            <Text className="text-base text-gray-500 italic text-center">
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
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView className="flex-1">
          <View className="bg-white p-5 border-b border-gray-200">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xl font-bold text-gray-800 flex-1" numberOfLines={2}>
                {selectedItem.formTitle || t('HistoryPageReal.submission_detail') || 'Submission'}
              </Text>
              {renderSyncBadge(selectedItem)}
            </View>

            <View className="flex-row items-center mb-2 gap-2">
              {isLocal && (
                <View className="bg-gray-500 px-2 py-1 rounded-xl">
                  <Text className="text-white text-[10px] font-semibold">Local Only</Text>
                </View>
              )}
            </View>

            {(!selectedItem.sync_status || selectedItem.sync_status === 0) && selectedItem.sync_reason && (
              <View className="bg-yellow-50 p-3 rounded-lg mb-3">
                <Text className="text-xs font-semibold text-yellow-800 mb-1">
                  ⚠️ {t('CommonPage.sync_status') || 'Sync Status'}
                </Text>
                <Text className="text-xs text-yellow-700 mb-1">
                  {selectedItem.sync_reason}
                </Text>
                {selectedItem.sync_attempts > 0 && (
                  <Text className="text-[11px] text-yellow-700 italic">
                    {selectedItem.sync_attempts} {t('CommonPage.sync_attempts') || 'sync attempts'}
                  </Text>
                )}
              </View>
            )}

            <View className="bg-gray-50 p-3 rounded-lg">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs text-gray-600 font-semibold min-w-[60px]">
                  {t('HistoryPageReal.createdAt') || 'Created'}:
                </Text>
                <Text className="text-xs text-gray-600">
                  {selectedItem.created_at
                    ? new Date(selectedItem.created_at).toLocaleString()
                    : t('CommonPage.not_available') || 'N/A'}
                </Text>
              </View>
              {selectedItem.updated_at && selectedItem.updated_at !== selectedItem.created_at && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-gray-600 font-semibold min-w-[60px]">
                    {t('CommonPage.updated') || 'Updated'}:
                  </Text>
                  <Text className="text-xs text-gray-600">
                    {new Date(selectedItem.updated_at).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>

            {canEdit && (
              <TouchableOpacity
                className="bg-primary py-4 px-5 rounded-xl mt-4 items-center justify-center shadow-sm"
                onPress={() => {
                  router.push({
                    pathname: "/(projects)/(mods)/(projects)/(edit-submission)/[submissionId]",
                    params: { submissionId: selectedItem._id }
                  });
                }}
              >
                <Text className="text-white text-base font-semibold">
                  {t('CommonPage.edit') || 'Edit Submission'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="my-2 mx-4">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              {t('CommonPage.form_answers') || 'Form Answers'}
            </Text>
            <View className="bg-white rounded-xl p-4 border border-gray-200">
              {renderFormData(selectedItem.data)}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  if (isLoading && submissions.length === 0) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#00227c" />
        <Text className="text-gray-600 text-base mt-4">
          {t('CommonPage.loading') || 'Loading submissions...'}
        </Text>
      </SafeAreaView>
    );
  }

  switch (currentView) {
    case 'projects':
      return renderProjectsView();

    case 'submissions':
      return (
        <SafeAreaView className="flex-1 bg-gray-50">
          <HeaderNavigation
            showLeft={true}
            title={selectedProject || t('HistoryPageReal.submissions') || 'Submissions'}
            showRight={true}
          />
          {renderSubmissionsView()}
        </SafeAreaView>
      );

    case 'details':
      return (
        <SafeAreaView className="flex-1 bg-gray-50">
          <HeaderNavigation
            showLeft={true}
            title={t('HistoryPageReal.submission_detail') || 'Details'}
            showRight={true}
          />
          {renderDetailView()}
        </SafeAreaView>
      );

    default:
      return renderProjectsView();
  }
};

export default RealmDatabaseViewer;