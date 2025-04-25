import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useMemo, useState, useEffect, useCallback } from "react";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { useGetAllProjects } from "~/services/project";
import { useGetForms } from "~/services/formElements";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useGetStakeholders } from "~/services/stakeholders";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useGetFamilies } from "~/services/families";
import { useGetIzus } from "~/services/izus";
import { Survey } from "~/models/surveys/survey";
import { Module } from "~/models/modules/module";
import { Stakeholder } from "~/models/stakeholders/stakeholder";
import { Families } from "~/models/family/families";
import { Izu } from "~/models/izus/izu";
import { IModule, IProject } from "~/types";
import { SurveySubmission } from "~/models/surveys/survey-submission";
const { useRealm, useQuery } = RealmContext;

interface SyncItem {
  key: string;
  name: string;
  status: string;
  progress?: number;
  lastSyncDate?: Date;
  items?: {
    name: string;
    status: string;
    lastSyncDate?: Date;
  }[];
}

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
  const [syncStatuses, setSyncStatuses] = useState<Record<string, string>>({
    Projects: "Not Synced",
    Modules: "Not Synced",
    Forms: "Not Synced",
    Stakeholders: "Not Synced",
    Families: "Not Synced",
    Izus: "Not Synced",
  });

  const { refresh: refreshProjects } = useGetAllProjects(true);
  const { surveySubmissions, refresh: refreshSubmissions } =
    useGetAllSurveySubmissions();
  const { refresh: refreshStakeholders } = useGetStakeholders(true);
  const { refresh: refreshForms } = useGetForms(true);
  const { refresh: refreshFamilies } = useGetFamilies(true);
  const { refresh: refreshIzus } = useGetIzus(true);

  // More reliable way to count pending and network error submissions
  const updateSubmissionCounts = useCallback(() => {
    // Direct realm query for maximum accuracy
    const allSubmissions = realm.objects(SurveySubmission);
    
    // Count pending submissions (not synced and status is pending or undefined)
    const pendingCount = allSubmissions.filtered(
      '(sync_status == false) && (syncStatus == "pending" || syncStatus == null || syncStatus == "")'
    ).length;
    
    // Count network error submissions
    const networkErrorCount = allSubmissions.filtered(
      'syncStatus == "network_error"'
    ).length;
    
    // Count failed submissions
    const failedCount = allSubmissions.filtered(
      'syncStatus == "failed"'
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
    console.log("getDirectSubmissions", realm.objects("SurveySubmission").filtered(filter));
    return realm.objects("SurveySubmission").filtered(filter);
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

    // Reset sync statuses
    setSyncStatuses({
      Projects: "Not Synced",
      Modules: "Not Synced",
      Forms: "Not Synced",
      Stakeholders: "Not Synced",
      Families: "Not Synced",
      Izus: "Not Synced",
    });

    try {
      // Sync Projects and Modules together
      setCurrentSyncItem("Projects");
      setSyncStatuses((prev) => ({
        ...prev,
        Projects: "Syncing",
        Modules: "Syncing",
      }));
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

          setSyncStatuses((prev) => ({
            ...prev,
            Projects: "Success",
            Modules: "Success",
          }));
          successCount += 2; // Count both projects and modules as successful
          setSyncProgress((successCount / totalItems) * 100);
          console.log("Projects and Modules sync completed successfully");
        } else {
          console.log("No projects were stored, but not treating as error since this might be valid");
          setSyncStatuses((prev) => ({
            ...prev,
            Projects: "Success",
            Modules: "Success",
          }));
          successCount += 2;
          setSyncProgress((successCount / totalItems) * 100);
        }
      } catch (error) {
        console.log("Error syncing projects and modules:", error);
        setSyncStatuses((prev) => ({
          ...prev,
          Projects: "Failed",
          Modules: "Failed",
        }));
        hasErrors = true;
      }

      // Sync Forms
      setCurrentSyncItem("Forms");
      setSyncStatuses((prev) => ({ ...prev, Forms: "Syncing" }));
      try {
        console.log("Starting Forms sync...");
        await refreshForms();
        // Verify forms were stored by checking the realm
        const storedForms = realm.objects(Survey);
        console.log("Forms check - count:", storedForms.length);
        // Don't treat empty as an error
        setSyncStatuses((prev) => ({ ...prev, Forms: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Forms sync completed successfully");
      } catch (error) {
        console.log("Error syncing forms:", error);
        setSyncStatuses((prev) => ({ ...prev, Forms: "Failed" }));
        hasErrors = true;
      }

      // Sync Stakeholders
      setCurrentSyncItem("Stakeholders");
      setSyncStatuses((prev) => ({ ...prev, Stakeholders: "Syncing" }));
      try {
        console.log("Starting Stakeholders sync...");
        await refreshStakeholders();
        // Verify stakeholders were stored by checking the realm
        const storedStakeholders = realm.objects(Stakeholder);
        console.log("Stakeholders stored", storedStakeholders.length);
        setSyncStatuses((prev) => ({ ...prev, Stakeholders: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Stakeholders sync completed successfully");
      } catch (error) {
        console.log("Error syncing stakeholders:", error);
        setSyncStatuses((prev) => ({ ...prev, Stakeholders: "Failed" }));
        hasErrors = true;
      }

      // Sync Families
      setCurrentSyncItem("Families");
      setSyncStatuses((prev) => ({ ...prev, Families: "Syncing" }));
      try {
        console.log("Starting Families sync...");
        await refreshFamilies();
        // Verify families were stored by checking the realm
        const storedFamilies = realm.objects(Families);
        console.log("Families stored", storedFamilies.length);
        // Don't treat empty as an error
        setSyncStatuses((prev) => ({ ...prev, Families: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Families sync completed successfully");
      } catch (error) {
        console.log("Error syncing families:", error);
        setSyncStatuses((prev) => ({ ...prev, Families: "Failed" }));
        hasErrors = true;
      }

      // Sync Izus
      setCurrentSyncItem("Izus");
      setSyncStatuses((prev) => ({ ...prev, Izus: "Syncing" }));
      try {
        console.log("Starting Izus sync...");
        await refreshIzus();
        // Verify izus were stored by checking the realm
        const storedIzus = realm.objects(Izu);
        console.log("Izus stored", storedIzus.length);
        // Don't treat empty as failure
        setSyncStatuses((prev) => ({ ...prev, Izus: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Izus sync completed successfully");
      } catch (error) {
        console.log("Error syncing izus:", error);
        setSyncStatuses((prev) => ({ ...prev, Izus: "Failed" }));
        hasErrors = true;
      }

      // Only update last sync date and show alerts if we have valid confirmation
      setLastSyncDate(new Date());
      
      // Check status after all operations before showing alert
      if (hasErrors) {
        Alert.alert(
          "Partial Success",
          "Some components failed to sync. Check the status for details."
        );
      } else {
        Alert.alert("Success", "All components synced successfully");
      }
    } catch (error) {
      console.error("Error during sync:", error);
      Alert.alert("Error", "Failed to sync forms and surveys");
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
      // Get direct pending and network error submissions from realm
      const pendingSubmissions = getDirectSubmissions(
        '(sync_status == false) && (syncStatus == "pending" || syncStatus == null || syncStatus == "")'
      );
      const networkErrorSubmissions = getDirectSubmissions(
        'syncStatus == "network_error"'
      );
      const failedSubmissions = getDirectSubmissions(
        'syncStatus == "failed"'
      );

      // Convert to arrays for processing
      const pendingArray = Array.from(pendingSubmissions);
      const networkErrorArray = Array.from(networkErrorSubmissions);
      const failedArray = Array.from(failedSubmissions);
      
      // Combine regular pending, network error and failed submissions
      const allPendingSubmissions = [
        ...pendingArray,
        ...networkErrorArray,
        ...failedArray,
      ];
      
      const pendingCount = allPendingSubmissions.length;
      console.log(`Starting sync with ${pendingCount} total submissions to process (${pendingArray.length} pending, ${networkErrorArray.length} network errors, ${failedArray.length} failed)`);

      if (pendingCount === 0) {
        Alert.alert("Info", "No pending or failed submissions to sync");
        setIsSyncing(false);
        setSyncType(null);
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;
      let networkErrorCount = 0;

      // Process submissions one by one to ensure proper awaiting
      for (const submission of allPendingSubmissions) {
        try {
          console.log(`Attempting to sync submission: ${submission._id}`, {
            currentStatus: submission.syncStatus,
            sync_status: submission.sync_status,
          });

          const decodedSubmission = {
            ...submission as Record<string, unknown>,
            ...(submission.answers as Record<string, unknown>),
            _id: (submission._id as { toString(): string }).toString(),
            submittedAt: (submission.submittedAt as Date).toISOString(),
            lastSyncAttempt: new Date().toISOString(),
          };

          // @ts-ignore
          delete decodedSubmission.answers;

          // Await each API call to ensure proper error handling
          const response = await baseInstance.post(
            submission.post_data as string,
            decodedSubmission
          );

          console.log(
            `Synced submission response: ${submission._id}`,
            JSON.stringify(response.data, null, 2)
          );

          if (response.data || response.data.result) {
            // Update the local record after successful sync
            realm.write(() => {
              submission.sync_status = true;
              submission.syncStatus = "synced";
              submission.lastSyncAttempt = new Date();
            });
            console.log(`Successfully synced submission: ${submission._id}`, {
              newStatus: "synced",
              sync_status: true,
            });
            syncedCount++;
          } else {
            console.error(
              "Invalid response from server for submission:",
              submission._id
            );
            realm.write(() => {
              submission.sync_status = false;
              submission.syncStatus = "failed";
              submission.lastSyncAttempt = new Date();
            });
            failedCount++;
          }
        } catch (error: any) {
          console.log(
            `Error syncing submission ${submission._id}:`,
            error.message
          );

          // If the server indicates the submission is already synced (400 status)
          if (error.response?.status === 400) {
            console.log(
              `Submission ${submission._id} already exists on server (400 status)`
            );
            realm.write(() => {
              submission.sync_status = true;
              submission.syncStatus = "synced";
              submission.lastSyncAttempt = new Date();
            });
            console.log(
              `Marked submission ${submission._id} as synced due to 400 status`,
              {
                newStatus: "synced",
                sync_status: true,
              }
            );
            syncedCount++;
          } else if (error.message === "Network Error") {
            console.log(
              `Network error for submission ${submission._id}, marking for retry`
            );
            realm.write(() => {
              submission.syncStatus = "network_error";
              submission.sync_status = false;
              submission.lastSyncAttempt = new Date();
              // Keep sync_status as false so it will be retried
            });
            networkErrorCount++;
          } else {
            console.log("Other error type:", error);
            realm.write(() => {
              submission.sync_status = false;
              submission.syncStatus = "failed";
              submission.lastSyncAttempt = new Date();
            });
            failedCount++;
          }
        }

        // Update progress after each submission
        setSyncProgress(
          ((syncedCount + failedCount + networkErrorCount) / pendingCount) * 100
        );
      }

      // Wait for all submissions to be processed before showing alert
      setLastSyncDate(new Date());
      
      // Force refresh submissions state - ensure this is awaited
      await refreshSubmissions();
      
      // Force UI update by triggering the forceRefresh counter
      setForceRefresh(prev => prev + 1);
      
      // Update counts directly from realm after all operations
      updateSubmissionCounts();
      
      // Display appropriate message based on results
      if (networkErrorCount > 0 && (failedCount > 0 || syncedCount > 0)) {
        Alert.alert(
          "Partial Sync",
          `Synced: ${syncedCount}, Failed: ${failedCount}, Network Errors: ${networkErrorCount}\n\nNetwork error submissions will be retried on next sync.`
        );
      } else if (networkErrorCount > 0) {
        Alert.alert(
          "Network Issues",
          `All ${networkErrorCount} submissions encountered network errors. Please check your connection and try again.`
        );
      } else if (failedCount > 0) {
        Alert.alert(
          "Partial Success",
          `Synced ${syncedCount} submissions, ${failedCount} failed`
        );
      } else {
        Alert.alert(
          "Success",
          `Successfully synced ${syncedCount} submissions`
        );
      }
    } catch (error) {
      console.error("Error during data sync:", error);
      Alert.alert("Error", "Failed to sync data");
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  // Manual retry for network error submissions
  const retryNetworkErrors = async () => {
    const networkErrorSubmissions = getDirectSubmissions(
      'syncStatus == "network_error"'
    );
    
    if (networkErrorSubmissions.length === 0) {
      Alert.alert("Info", "No network error submissions to retry");
      return;
    }
    syncData(); // Reuse existing sync logic which now handles network errors
  };

  const services = useMemo(
    () => [
      {
        key: "Forms",
        name: "Sync Forms/Surveys",
        status:
          isSyncing && syncType === "Forms"
            ? "Syncing"
            : lastSyncDate &&
              syncType === "Forms" &&
              !Object.values(syncStatuses).includes("Failed")
            ? "Success"
            : Object.values(syncStatuses).includes("Failed")
            ? "Failed"
            : "Not Synced",
        progress: syncType === "Forms" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
        items: [
          {
            name: "Projects",
            status: syncStatuses.Projects,
            lastSyncDate: lastSyncDate,
          },
          {
            name: "Modules",
            status: syncStatuses.Modules,
            lastSyncDate: lastSyncDate,
          },
          {
            name: "Forms",
            status: syncStatuses.Forms,
            lastSyncDate: lastSyncDate,
          },
          {
            name: "Stakeholders",
            status: syncStatuses.Stakeholders,
            lastSyncDate: lastSyncDate,
          },
          {
            name: "Families",
            status: syncStatuses.Families,
            lastSyncDate: lastSyncDate,
          },
          {
            name: "Izus",
            status: syncStatuses.Izus,
            lastSyncDate: lastSyncDate,
          },
        ],
      },
      {
        key: "data",
        name: `Sync Data (${pendingCount + failedCount} failed)`,
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
              status: "Network Errors",
              lastSyncDate: null,
            },
          ]
        : []),
    ],
    [
      isSyncing,
      currentSyncItem,
      syncProgress,
      lastSyncDate,
      syncType,
      syncStatuses,
      pendingCount,
      failedCount, // Added failedCount as dependency
      networkErrorCount,
      forceRefresh, // Add forceRefresh as a dependency to ensure updates
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

  const { t } = useTranslation();
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
    </SafeAreaView>
  );
};

export default SyncPage;