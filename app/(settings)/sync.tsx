import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useMemo, useState } from "react";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { useGetAllProjects } from "~/services/project";
import { useGetAllModules } from "~/services/project";
import { useGetForms } from "~/services/formElements";
import { useGetAllSurveySubmissions } from "~/services/survey-submission";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";
import { useGetStakeholders } from "~/services/stakeholders";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useGetFamilies } from "~/services/families";
import { useGetIzus } from "~/services/izus";
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
  const [syncStatuses, setSyncStatuses] = useState<Record<string, string>>({
    Projects: "Not Synced",
    Modules: "Not Synced",
    Forms: "Not Synced",
    Stakeholders: "Not Synced",
    Families: "Not Synced",
    Izus: "Not Synced",
  });

  const { refresh: refreshProjects } = useGetAllProjects(true);
  const { modules, refresh: refreshModules } = useGetAllModules();
  const { surveySubmissions } = useGetAllSurveySubmissions();
  const { refresh: refreshStakeholders } = useGetStakeholders(true);
  const { refresh: refreshForms } = useGetForms(true);
  const { refresh: refreshFamilies } = useGetFamilies(true);
  const { refresh: refreshIzus } = useGetIzus(true);
  const pendingSubmissions = surveySubmissions.filter(
    (submission) => !submission.sync_status
  );

  const syncFormsAndSurveys = async () => {
    if (isSyncing) return;

    // Reset all states for a fresh sync
    setIsSyncing(true);
    setSyncType("Forms");
    setSyncProgress(0);
    setLastSyncDate(null);
    setCurrentSyncItem("");
    let successCount = 0;
    const totalItems = 4;
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
      // Sync Projects
      setCurrentSyncItem("Projects");
      setSyncStatuses((prev) => ({ ...prev, Projects: "Syncing" }));
      try {
        console.log("Starting Projects sync...");
        await refreshProjects();
        setSyncStatuses((prev) => ({ ...prev, Projects: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Projects sync completed successfully");
      } catch (error) {
        console.error("Error syncing projects:", error);
        setSyncStatuses((prev) => ({ ...prev, Projects: "Failed" }));
        hasErrors = true;
      }

      // Sync Modules
      setCurrentSyncItem("Modules");
      setSyncStatuses((prev) => ({ ...prev, Modules: "Syncing" }));
      try {
        console.log("Starting Modules sync...");
        await refreshModules();
        setSyncStatuses((prev) => ({ ...prev, Modules: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Modules sync completed successfully");
      } catch (error) {
        console.error("Error syncing modules:", error);
        setSyncStatuses((prev) => ({ ...prev, Modules: "Failed" }));
        hasErrors = true;
      }

      // Sync Forms
      setCurrentSyncItem("Forms");
      setSyncStatuses((prev) => ({ ...prev, Forms: "Syncing" }));
      try {
        console.log("Starting Forms sync...");
        await refreshForms();
        setSyncStatuses((prev) => ({ ...prev, Forms: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Forms sync completed successfully");
      } catch (error) {
        console.error("Error syncing forms:", error);
        setSyncStatuses((prev) => ({ ...prev, Forms: "Failed" }));
        hasErrors = true;
      }

      // Sync Stakeholders
      setCurrentSyncItem("Stakeholders");
      setSyncStatuses((prev) => ({ ...prev, Stakeholders: "Syncing" }));
      try {
        console.log("Starting Stakeholders sync...");
        await refreshStakeholders();
        setSyncStatuses((prev) => ({ ...prev, Stakeholders: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Stakeholders sync completed successfully");
      } catch (error) {
        console.error("Error syncing stakeholders:", error);
        setSyncStatuses((prev) => ({ ...prev, Stakeholders: "Failed" }));
        hasErrors = true;
      }

      setCurrentSyncItem("Families");
      setSyncStatuses((prev) => ({ ...prev, Families: "Syncing" }));
      try {
        console.log("Starting Families sync...");
        await refreshFamilies();
        setSyncStatuses((prev) => ({ ...prev, Families: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Families sync completed successfully");
      } catch (error) {
        console.error("Error syncing families:", error);
        setSyncStatuses((prev) => ({ ...prev, Families: "Failed" }));
        hasErrors = true;
      }

      // Sync Izus
      setCurrentSyncItem("Izus");
      setSyncStatuses((prev) => ({ ...prev, Izus: "Syncing" }));
      try {
        console.log("Starting Izus sync...");
        await refreshIzus();
        setSyncStatuses((prev) => ({ ...prev, Izus: "Success" }));
        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Izus sync completed successfully");
      } catch (error) {
        console.error("Error syncing izus:", error);
        setSyncStatuses((prev) => ({ ...prev, Izus: "Failed" }));
        hasErrors = true;
      } finally {
        setIsSyncing(false);
        setSyncType(null);
        setCurrentSyncItem("");
      }

      setLastSyncDate(new Date());

      // Show appropriate alert based on whether there were errors
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
    }
  };

  const syncData = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncType("Data");
    setSyncProgress(0);

    try {
      const pendingCount = pendingSubmissions.length;
      if (pendingCount === 0) {
        Alert.alert("Info", "No pending submissions to sync");
        setIsSyncing(false);
        setSyncType(null);
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      for (const submission of pendingSubmissions) {
        try {
          // Make the actual API call to sync the submission
          const decodedSubmission = {
            ...submission,
            ...submission.answers,
            _id: submission._id.toString(),
            submittedAt: submission.submittedAt.toISOString(),
            lastSyncAttempt: new Date().toISOString(),
          };
          // @ts-ignore
          delete decodedSubmission.answers;
          const response = await baseInstance.post(
            submission.post_data,
            decodedSubmission
          );
          console.log(`Synced submission res: ${submission._id}`, response.data);

          if (response.data || response.data.result) {
            // Update the local record after successful sync
            realm.write(() => {
              submission.sync_status = true;
              submission.syncStatus = "synced";
              submission.lastSyncAttempt = new Date();
            });
            syncedCount++;
          } else {
            console.log("response", response.status);
            throw new Error("Invalid response from server");
          }
        } catch (error: any) {
          if (error.response?.status === 400) {
            realm.write(() => {
              submission.sync_status = true;
              submission.syncStatus = "synced";
              submission.lastSyncAttempt = new Date();
            });
            console.log("Error status", error.response?.status);
            console.log(`Sync status changed to saved ${submission._id}`);
            console.log("Failed submission: ", JSON.stringify(submission, null, 2));
            syncedCount++;
          } else {
            console.log(`Error syncing submission: ${submission._id}`, error);
            console.error("Error syncing submission:", error);
            realm.write(() => {
              submission.sync_status = false;
              submission.syncStatus = "failed";
              submission.lastSyncAttempt = new Date();
            });
            failedCount++;
          }
        }

        setSyncProgress(((syncedCount + failedCount) / pendingCount) * 100);
      }

      setLastSyncDate(new Date());

      if (failedCount > 0) {
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
      setLastSyncDate(new Date()); // Move setLastSyncDate here to ensure it's set even on error
    }
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
        ],
      },
      {
        key: "data",
        name: "Sync Data",
        status:
          pendingSubmissions.length === 0
            ? "No Pending Submissions"
            : isSyncing && syncType === "Data"
            ? "Syncing"
            : lastSyncDate && syncType === "Data"
            ? "Success"
            : "Not Synced",
        progress: syncType === "Data" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
      },
    ],
    [
      isSyncing,
      currentSyncItem,
      syncProgress,
      lastSyncDate,
      syncType,
      syncStatuses,
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
          isSyncing && syncType === item.key ? "bg-gray-700" : "bg-primary"
        }`}
        onPress={() => {
          if (item.key === "Forms") {
            syncFormsAndSurveys();
          } else {
            syncData();
          }
        }}
        disabled={isSyncing}
      >
        <TabBarIcon
          name={isSyncing && syncType === item.key ? "hourglass-empty" : "sync"}
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
      />
    </SafeAreaView>
  );
};

export default SyncPage;
