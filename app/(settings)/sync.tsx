import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { useGetAllProjects } from "~/services/project";
import { useGetForms } from "~/services/formElements";
import { useGetAllSurveySubmissions, syncPendingSubmissions } from "~/services/survey-submission";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useGetStakeholders } from "~/services/stakeholders";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { syncTemporaryFamilies, useGetFamilies } from "~/services/families";
import { syncTemporaryIzus, useGetIzus } from "~/services/izus";
import { Survey } from "~/models/surveys/survey";
import { Module } from "~/models/modules/module";
import { Stakeholder } from "~/models/stakeholders/stakeholder";
import { Families } from "~/models/family/families";
import { Izu } from "~/models/izus/izu";
import { IModule, IProject } from "~/types";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import Toast from "react-native-toast-message"; // Make sure to install this package
const { useRealm, useQuery } = RealmContext;

// Define sync status types for better type safety
type SyncStatusType = "Not Synced" | "Syncing" | "Success" | "Failed" | "Network Errors" | "No Pending Submissions";

interface SyncItem {
  key: string;
  name: string;
  status: SyncStatusType;
  progress?: number;
  lastSyncDate?: Date;
  items?: {
    name: string;
    status: SyncStatusType;
    lastSyncDate?: Date;
  }[];
}

interface SyncStatuses {
  Projects: SyncStatusType;
  Modules: SyncStatusType;
  Forms: SyncStatusType;
  Stakeholders: SyncStatusType;
  Families: SyncStatusType;
  Izus: SyncStatusType;
}

// Toast helper function
const showToast = (type: 'success' | 'error' | 'info', text1: string, text2: string) => {
  Toast.show({
    type,
    text1,
    text2,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  });
};

const SyncPage = () => {
  const realm = useRealm();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSyncItem, setCurrentSyncItem] = useState<string>("");
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [networkErrorCount, setNetworkErrorCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [forceRefresh, setForceRefresh] = useState<number>(0); // Used to force remounting
  
  // Keep track of sync statuses
  const [syncStatuses, setSyncStatuses] = useState<SyncStatuses>({
    Projects: "Not Synced",
    Modules: "Not Synced",
    Forms: "Not Synced",
    Stakeholders: "Not Synced",
    Families: "Not Synced",
    Izus: "Not Synced",
  });

  // Ref to track the latest sync statuses (not affected by React's asynchronous state updates)
  const currentSyncStatusesRef = useRef<SyncStatuses>({...syncStatuses});

  // Service hooks
  const { refresh: refreshProjects } = useGetAllProjects(true);
  const { surveySubmissions, refresh: refreshSubmissions } = useGetAllSurveySubmissions();
  const { refresh: refreshStakeholders } = useGetStakeholders(true);
  const { refresh: refreshForms } = useGetForms(true);
  const { refresh: refreshIzus } = useGetIzus(true);

  // Sync translation
  const { t } = useTranslation();

  // More reliable way to count pending and network error submissions
  const updateSubmissionCounts = useCallback(() => {
    // Direct realm query for maximum accuracy
    const allSubmissions = realm.objects(SurveySubmission);
    
    // Count pending submissions (not synced and status is pending or undefined)
    const pendingCount = allSubmissions.filtered(
      'sync_data.sync_status == false && (sync_data.sync_reason == "pending" || sync_data.sync_reason == null || sync_data.sync_reason == "")'
    ).length;
    
    // Count network error submissions
    const networkErrorCount = allSubmissions.filtered(
      'sync_data.sync_reason == "Network Error"'
    ).length;
    
    // Count failed submissions
    const failedCount = allSubmissions.filtered(
      'sync_data.sync_reason == "failed" || sync_data.sync_reason == "Other error"'
    ).length;
    
    console.log(`Direct Realm count - Pending: ${pendingCount}, Network Errors: ${networkErrorCount}, Failed: ${failedCount}`);
    
    setPendingCount(pendingCount);
    setNetworkErrorCount(networkErrorCount);
    setFailedCount(failedCount); // Store failed count
  }, [realm]);

  // Update counts whenever submissions change
  useEffect(() => {
    updateSubmissionCounts();
  }, [surveySubmissions, updateSubmissionCounts, forceRefresh]);

  // Get direct submissions from Realm - more reliable than using the hook data
  const getDirectSubmissions = useCallback((filter: string) => {
    console.log("getDirectSubmissions", realm.objects(SurveySubmission).filtered(filter));
    return realm.objects(SurveySubmission).filtered(filter);
  }, [realm]);

  const syncFormsAndSurveys = async () => {
    if (isSyncing) return;

    // Reset all states for a fresh sync
    setIsSyncing(true);
    setSyncType("Forms");
    setSyncProgress(0);
    setLastSyncDate(null);
    setCurrentSyncItem("");
    let successCount = 0;
    const totalItems = 5; // Updated to reflect combined projects/modules
    let hasErrors = false;

    // Initialize current sync statuses with "Not Synced"
    const localSyncStatuses: SyncStatuses = {
      Projects: "Not Synced",
      Modules: "Not Synced",
      Forms: "Not Synced",
      Stakeholders: "Not Synced",
      Families: "Not Synced",
      Izus: "Not Synced",
    };
    
    // Update the ref to the initial state
    currentSyncStatusesRef.current = {...localSyncStatuses};
    
    // Reset state sync statuses
    setSyncStatuses({...localSyncStatuses});

    try {
      // Sync Projects and Modules together
      setCurrentSyncItem("Projects");
      
      // Update both local and state statuses
      localSyncStatuses.Projects = "Syncing";
      localSyncStatuses.Modules = "Syncing";
      currentSyncStatusesRef.current = {...localSyncStatuses};
      setSyncStatuses({...localSyncStatuses});
      
      try {
        console.log("Starting Projects and Modules sync...");
        await refreshProjects();

        // Verify projects were stored
        const storedProjects = realm.objects("Project");
        if (storedProjects && storedProjects.length > 0) {
          // Verify modules were stored
          const modules = storedProjects.flatMap((project: IProject | any) => {
            return project?.project_modules.map((moduleString: string) => {
              try {
                return JSON.parse(moduleString) as IModule;
              } catch (parseError) {
                console.error("Error parsing module:", parseError);
                return null;
              }
            });
          });
          console.log("Projects stored", storedProjects.length);
          console.log("Modules stored", modules.length);

          localSyncStatuses.Projects = "Success";
          localSyncStatuses.Modules = "Success";
          currentSyncStatusesRef.current = {...localSyncStatuses};
          setSyncStatuses({...localSyncStatuses});
          
          successCount += 2; // Count both projects and modules as successful
          setSyncProgress((successCount / totalItems) * 100);
          console.log("Projects and Modules sync completed successfully");
        } else {
          console.log("No projects were stored, but not treating as error since this might be valid");
          
          localSyncStatuses.Projects = "Success";
          localSyncStatuses.Modules = "Success";
          currentSyncStatusesRef.current = {...localSyncStatuses};
          setSyncStatuses({...localSyncStatuses});
          
          successCount += 2;
          setSyncProgress((successCount / totalItems) * 100);
        }
      } catch (error) {
        console.log("Error syncing projects and modules:", error);
        
        localSyncStatuses.Projects = "Failed";
        localSyncStatuses.Modules = "Failed";
        currentSyncStatusesRef.current = {...localSyncStatuses};
        setSyncStatuses({...localSyncStatuses});
        
        hasErrors = true;
      }

      // Sync Forms
      setCurrentSyncItem("Forms");
      
      localSyncStatuses.Forms = "Syncing";
      currentSyncStatusesRef.current = {...localSyncStatuses};
      setSyncStatuses({...localSyncStatuses});
      
      try {
        console.log("Starting Forms sync...");
        await refreshForms();
        // Verify forms were stored by checking the realm
        const storedForms = realm.objects(Survey);
        console.log("Forms check - count:", storedForms.length);
        // Don't treat empty as an error
        
        localSyncStatuses.Forms = "Success";
        currentSyncStatusesRef.current = {...localSyncStatuses};
        setSyncStatuses({...localSyncStatuses});
        
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Forms sync completed successfully");
      } catch (error) {
        console.log("Error syncing forms:", error);
        
        localSyncStatuses.Forms = "Failed";
        currentSyncStatusesRef.current = {...localSyncStatuses};
        setSyncStatuses({...localSyncStatuses});
        
        hasErrors = true;
      }

      // Sync Stakeholders
      setCurrentSyncItem("Stakeholders");
      
      localSyncStatuses.Stakeholders = "Syncing";
      currentSyncStatusesRef.current = {...localSyncStatuses};
      setSyncStatuses({...localSyncStatuses});
      
      try {
        console.log("Starting Stakeholders sync...");
        await refreshStakeholders();
        // Verify stakeholders were stored by checking the realm
        const storedStakeholders = realm.objects(Stakeholder);
        console.log("Stakeholders stored", storedStakeholders.length);
        
        localSyncStatuses.Stakeholders = "Success";
        currentSyncStatusesRef.current = {...localSyncStatuses};
        setSyncStatuses({...localSyncStatuses});
        
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Stakeholders sync completed successfully");
      } catch (error) {
        console.log("Error syncing stakeholders:", error);
        
        localSyncStatuses.Stakeholders = "Failed";
        currentSyncStatusesRef.current = {...localSyncStatuses};
        setSyncStatuses({...localSyncStatuses});
        
        hasErrors = true;
      }

      // Sync Families
      setCurrentSyncItem("Families");
      
      localSyncStatuses.Families = "Syncing";
      currentSyncStatusesRef.current = {...localSyncStatuses};
      setSyncStatuses({...localSyncStatuses});
      
      try {
        console.log("Starting Families sync...");
        try {
          await syncTemporaryFamilies(realm, `/createFamily`);
          // Verify families were stored by checking the realm
          const storedFamilies = realm.objects(Families);
          console.log("Families stored", storedFamilies.length);
          
          localSyncStatuses.Families = "Success";
          currentSyncStatusesRef.current = {...localSyncStatuses};
          setSyncStatuses({...localSyncStatuses});
          
          successCount++;
        } catch (familyError: any) {
          console.log("Error syncing specific family:", familyError);
          // Mark families as failed but continue with other syncs
          
          localSyncStatuses.Families = "Failed";
          currentSyncStatusesRef.current = {...localSyncStatuses};
          setSyncStatuses({...localSyncStatuses});
          
          hasErrors = true;
          // Don't increment successCount for families
        }
        setSyncProgress((successCount / totalItems) * 100);
      } catch (error) {
        console.log("Error in overall families sync process:", error);
        
        localSyncStatuses.Families = "Failed";
        currentSyncStatusesRef.current = {...localSyncStatuses};
        setSyncStatuses({...localSyncStatuses});
        
        hasErrors = true;
      }

      // Sync Izus
      setCurrentSyncItem("Izus");
      
      localSyncStatuses.Izus = "Syncing";
      currentSyncStatusesRef.current = {...localSyncStatuses};
      setSyncStatuses({...localSyncStatuses});
      
      try {
        console.log("Starting Izus sync...");
        // Use the syncTemporaryIzus function to sync Izus that need syncing
        await syncTemporaryIzus(realm, `/izucelldemography/create`);
        // Then refresh from the server
        await refreshIzus();
        
        // Verify izus were stored by checking the realm
        const storedIzus = realm.objects(Izu);
        console.log("Izus stored", storedIzus.length);
        // Don't treat empty as failure
        
        localSyncStatuses.Izus = "Success";
        currentSyncStatusesRef.current = {...localSyncStatuses};
        setSyncStatuses({...localSyncStatuses});
        
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Izus sync completed successfully");
      } catch (error) {
        console.log("Error syncing izus:", error);
        
        localSyncStatuses.Izus = "Failed";
        currentSyncStatusesRef.current = {...localSyncStatuses};
        setSyncStatuses({...localSyncStatuses});
        
        hasErrors = true;
      }

      // Set last sync date regardless of errors
      setLastSyncDate(new Date());
      
      // Check if any components failed
      const failedComponents = Object.entries(localSyncStatuses)
        .filter(([_, status]) => status === "Failed")
        .map(([component, _]) => component);
      
      // Final sync status determination
      if (hasErrors || failedComponents.length > 0) {
        const failedComponentsList = failedComponents.join(", ");
        
        // Show toast instead of alert
        showToast(
          'error',
          'Partial Success',
          `Some components failed to sync: ${failedComponentsList}. Please try again later.`
        );
      } else {
        // Show toast instead of alert
        showToast('success', 'Success', 'All components synced successfully');
      }
    } catch (error) {
      console.error("Error during sync:", error);
      // Show toast instead of alert
      showToast('error', 'Error', 'Failed to sync forms and surveys');
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      setCurrentSyncItem("");
    }
  };

  const syncData = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncType("Data");
    setSyncProgress(0);

    try {
      // Use the syncPendingSubmissions service function to sync submissions
      await syncPendingSubmissions(realm);
      console.log("Completed syncPendingSubmissions");
      
      // Force refresh submissions state
      await refreshSubmissions();
      
      // Force UI update by triggering the forceRefresh counter
      setForceRefresh(prev => prev + 1);
      
      // Update counts directly from realm after all operations
      updateSubmissionCounts();
      
      // Get the updated counts
      const pendingCount = realm.objects(SurveySubmission).filtered(
        'sync_data.sync_status == false && (sync_data.sync_reason == "pending" || sync_data.sync_reason == null || sync_data.sync_reason == "")'
      ).length;
      
      const networkErrorCount = realm.objects(SurveySubmission).filtered(
        'sync_data.sync_reason == "Network Error"'
      ).length;
      
      const failedCount = realm.objects(SurveySubmission).filtered(
        'sync_data.sync_reason == "failed" || sync_data.sync_reason == "Other error"'
      ).length;
      
      const syncedCount = realm.objects(SurveySubmission).filtered(
        'sync_data.sync_status == true'
      ).length;
      
      // Set last sync date
      setLastSyncDate(new Date());
      
      // Display appropriate message based on results
      if (networkErrorCount > 0 && (failedCount > 0 || syncedCount > 0)) {
        showToast(
          'info',
          'Partial Sync',
          `Synced: ${syncedCount}, Failed: ${failedCount}, Network Errors: ${networkErrorCount}. Network error submissions will be retried on next sync.`
        );
      } else if (networkErrorCount > 0) {
        showToast(
          'error',
          'Network Issues',
          `All ${networkErrorCount} submissions encountered network errors. Please check your connection and try again.`
        );
      } else if (failedCount > 0) {
        showToast(
          'info',
          'Partial Success',
          `Synced ${syncedCount} submissions, ${failedCount} failed`
        );
      } else if (syncedCount > 0) {
        showToast(
          'success',
          'Success',
          `Successfully synced ${syncedCount} submissions`
        );
      } else {
        showToast('info', 'Info', 'No pending submissions to sync');
      }
    } catch (error) {
      console.error("Error during data sync:", error);
      showToast('error', 'Error', 'Failed to sync data');
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      
      // Force a UI refresh after completion
      setForceRefresh(prev => prev + 1);
    }
  };

  // Manual retry for network error submissions
  const retryNetworkErrors = async () => {
    const networkErrorSubmissions = getDirectSubmissions(
      'sync_data.sync_reason == "Network Error"'
    );
    
    if (networkErrorSubmissions.length === 0) {
      showToast('info', 'Info', 'No network error submissions to retry');
      return;
    }
    
    // Set network error submissions to "pending" to retry them
    realm.write(() => {
      for (const submission of networkErrorSubmissions) {
        if (submission.sync_data) {
          submission.sync_data.sync_reason = "pending";
        }
      }
    });
    
    // Then sync data normally
    syncData();
  };

  const services = useMemo(
    () => {
      // Get the latest sync statuses - use the ref for accurate values
      const currentStatuses = currentSyncStatusesRef.current;
      
      // Determine overall forms sync status
      const formsOverallStatus: SyncStatusType = 
        isSyncing && syncType === "Forms"
          ? "Syncing"
          : Object.values(currentStatuses).includes("Failed")
            ? "Failed"
            : lastSyncDate && syncType === "Forms"
              ? "Success"
              : "Not Synced";
              
      return [
        {
          key: "Forms",
          name: "Sync Forms/Surveys",
          status: formsOverallStatus,
          progress: syncType === "Forms" ? syncProgress : undefined,
          lastSyncDate: lastSyncDate,
          items: [
            {
              name: "Projects",
              status: currentStatuses.Projects,
              lastSyncDate: lastSyncDate,
            },
            {
              name: "Modules",
              status: currentStatuses.Modules,
              lastSyncDate: lastSyncDate,
            },
            {
              name: "Forms",
              status: currentStatuses.Forms,
              lastSyncDate: lastSyncDate,
            },
            {
              name: "Stakeholders",
              status: currentStatuses.Stakeholders,
              lastSyncDate: lastSyncDate,
            },
            {
              name: "Families",
              status: currentStatuses.Families,
              lastSyncDate: lastSyncDate,
            },
            {
              name: "Izus",
              status: currentStatuses.Izus,
              lastSyncDate: lastSyncDate,
            },
          ],
        },
        {
          key: "data",
          name: `Sync Data (${pendingCount + failedCount} pending)`,
          status:
            pendingCount + failedCount === 0
              ? "No Pending Submissions"
              : isSyncing && syncType === "Data"
                ? "Syncing"
                : lastSyncDate && syncType === "Data"
                  ? "Success"
                  : "Not Synced",
          progress: syncType === "Data" ? syncProgress : undefined,
          lastSyncDate: lastSyncDate,
        },
        ...(networkErrorCount > 0
          ? [
              {
                key: "network",
                name: `Retry Network Errors (${networkErrorCount})`,
                status: "Network Errors" as SyncStatusType,
                lastSyncDate: null,
              },
            ]
          : []),
      ];
    },
    [
      isSyncing,
      currentSyncItem,
      syncProgress,
      lastSyncDate,
      syncType,
      syncStatuses, // Keep this for re-rendering when state updates
      pendingCount,
      failedCount,
      networkErrorCount,
      forceRefresh, // Add forceRefresh as a dependency to ensure updates
      // Note: we're not dependent on syncStatuses for data, but on currentSyncStatusesRef.current
    ]
  );

  const renderItem = ({ item }: { item: SyncItem }) => (
    <View className="p-4 border-b bg-white flex flex-row justify-between border-gray-300">
      <View className="flex-1">
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-bold">{item.name}</Text>
          {isSyncing && syncType === item.key && (
            <ActivityIndicator size="small" color="#0000ff" />
          )}
        </View>
        <Text
          className={
            item.status === "Success"
              ? "text-green-500"
              : item.status === "Failed"
                ? "text-red-500"
                : item.status === "Syncing"
                  ? "text-blue-500"
                  : item.status === "Network Errors"
                    ? "text-orange-500"
                    : "text-gray-500"
          }
        >
          {item.status}
        </Text>
        {item.progress !== undefined && (
          <View className="mt-2">
            <View className="h-2 bg-gray-200 rounded-full">
              <View
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${item.progress}%` }}
              />
            </View>
            <Text className="text-xs text-gray-500 mt-1">
              {Math.round(item.progress)}% Complete
            </Text>
          </View>
        )}
        {item.items && (
          <View className="mt-2">
            {item.items.map((subItem) => (
              <View
                key={subItem.name}
                className="flex-row justify-between items-center mt-1"
              >
                <Text className="text-sm">{subItem.name}</Text>
                <Text
                  className={
                    subItem.status === "Success"
                      ? "text-green-500"
                      : subItem.status === "Failed"
                        ? "text-red-500"
                        : subItem.status === "Syncing"
                          ? "text-blue-500"
                          : "text-gray-500"
                  }
                >
                  {subItem.status}
                </Text>
              </View>
            ))}
          </View>
        )}
        {item.lastSyncDate && (
          <Text className="text-xs text-gray-500 mt-2">
            Last synced: {item.lastSyncDate.toLocaleString()}
          </Text>
        )}
      </View>
      <TouchableOpacity
        className={`flex items-center justify-center h-12 w-12 flex-col rounded-full ml-4 ${
          isSyncing && syncType === item.key
            ? "bg-gray-700"
            : item.status === "Failed"
              ? "bg-red-500"
              : item.key === "network"
                ? "bg-orange-500"
                : "bg-primary"
        }`}
        onPress={() => {
          if (item.key === "Forms") {
            syncFormsAndSurveys();
          } else if (item.key === "network") {
            retryNetworkErrors();
          } else {
            syncData();
          }
        }}
        disabled={isSyncing}
      >
        <TabBarIcon
          name={
            isSyncing && syncType === item.key
              ? "hourglass-empty"
              : item.key === "network"
                ? "refresh"
                : "sync"
          }
          family="MaterialIcons"
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("SettingsPage.sync")}
      />
      <FlatList
        data={services as SyncItem[]}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        extraData={forceRefresh} // Ensure the FlatList updates when forceRefresh changes
      />
      <Toast />
    </SafeAreaView>
  );
};

export default SyncPage;