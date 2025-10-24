import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useMemo, useState, useEffect, useCallback } from "react";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { useGetAllForms } from "~/services/project";
import { syncPendingSubmissions, getPendingSubmissionsCount } from "~/services/survey-submission";
// import { useGetStakeholders } from "~/services/stakeholders";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
// import { useFamilyOperations } from "~/services/families";
// import { useSyncIzus, useGetIzus } from "~/services/izus";
import Toast from "react-native-toast-message";
import { syncTemporaryMonitoringResponses } from "~/services/monitoring/monitoring-responses";
import { useNetworkStatus } from "~/services/network";
import { useGetForms } from "~/services/formElements";
import { useAuth } from "~/lib/hooks/useAuth";
import { useSQLite } from "~/providers/RealContextProvider";

// ===== Types =====
type SyncStatusType =
  | "notsynced"
  | "syncing"
  | "success"
  | "failed"
  | "nopendingsubmissions"
  | "nopendingfamilies"
  | "nopendingusers"
  | "nopendingresponses"
  | "nopendingfollowups";

type SyncStatusTypeKiny =
  | "ntibirahuzwa"
  | "guhuzaamakuru"
  | "byakunze"
  | "byanze"
  | "ntabisubizobitarahuzwa"
  | "ntamiryangoitarahuzwa"
  | "ntabakoreshabatarahuzwa"
  | "ntabisubizobitarahuzwa"
  | "ntagukurikiranabitarahuzwa";

const syncStatusKiny: Record<SyncStatusType, SyncStatusTypeKiny> = {
  notsynced: "ntibirahuzwa",
  syncing: "guhuzaamakuru",
  success: "byakunze",
  failed: "byanze",
  nopendingsubmissions: "ntabisubizobitarahuzwa",
  nopendingfamilies: "ntamiryangoitarahuzwa",
  nopendingusers: "ntabakoreshabatarahuzwa",
  nopendingresponses: "ntabisubizobitarahuzwa",
  nopendingfollowups: "ntagukurikiranabitarahuzwa",
};

interface SyncItem {
  key: string;
  name: string;
  status: SyncStatusType;
}

const getSyncTypeKey = (key: string, t: (key: string) => string) => {
  const mapping: Record<string, string> = {
    "Sync.data": "Sync.data",
    "Sync.submissions": "Sync.submissions",
    "Sync.families": "Sync.families",
    "Sync.izus": "Sync.izus",
    "Sync.responses": "Sync.responses",
    "Sync.followups": "Sync.followups",
  };

  return t(mapping[key] || key);
};

// ===== Toast Helper =====
const showToast = (
  type: "success" | "error" | "info",
  text1: string,
  text2: string
) => {
  Toast.show({
    type,
    text1,
    text2,
    position: "top",
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  });
};

// ===== SyncPage =====
const SyncPage = () => {
  const { query, getAll, update } = useSQLite();
  const { isConnected } = useNetworkStatus();
  const { user } = useAuth({});
  const { t } = useTranslation();
  // const { syncTemporaryFamilies } = useFamilyOperations();
  // const { syncTemporaryIzus } = useSyncIzus();

  // Service hooks
   const { refresh: refreshProjects } = useGetAllForms(true);
  // const { refresh: refreshStakeholders } = useGetStakeholders(true);
  // useGetIzus(true);
  useGetForms(true);

  // State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState<number>(0);

  const [pendingSurveySubmissionsCount, setPendingSurveySubmissionsCount] = useState(0);
  // const [pendingFamiliesCount, setPendingFamiliesCount] = useState(0);
  const [pendingIzusCount, setPendingIzusCount] = useState(0);
  // const [pendingMonitoringResponsesCount, setPendingMonitoringResponsesCount] = useState(0);
  // const [pendingFollowupsCount, setPendingFollowupsCount] = useState(0);

  // ===== Count pending items =====
  const updateSubmissionCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Survey Submissions count
      const surveyCount = await getPendingSubmissionsCount(query, user.id);
      setPendingSurveySubmissionsCount(surveyCount);

      // Families count
      // const familiesResult = await query(
      //   `SELECT COUNT(*) as count FROM Families WHERE sync_status = 0 AND created_by_user_id = ?`,
      //   [user.id]
      // );
      // setPendingFamiliesCount(familiesResult[0]?.count || 0);

      // Izus count
      const izusResult = await query(
        `SELECT COUNT(*) as count FROM Izu WHERE sync_status = 0 AND created_by_user_id = ?`,
        [user.id]
      );
      setPendingIzusCount(izusResult[0]?.count || 0);

      // Monitoring Responses count
      // const responsesResult = await query(
      //   `SELECT COUNT(*) as count FROM MonitoringResponses WHERE sync_status = 0 AND created_by_user_id = ?`,
      //   [user.id]
      // );
      // setPendingMonitoringResponsesCount(responsesResult[0]?.count || 0);

      // // Followups count
      // const followupsResult = await query(
      //   `SELECT COUNT(*) as count FROM FollowUps WHERE sync_status = 0 AND created_by_user_id = ?`,
      //   [user.id]
      // );
      // setPendingFollowupsCount(followupsResult[0]?.count || 0);

      console.log(`📊 Pending counts updated: Surveys=${surveyCount}`);
    } catch (error) {
      console.error("❌ Error updating counts:", error);
    }
  }, [user?.id, query]);

  useEffect(() => {
    updateSubmissionCounts();
  }, [updateSubmissionCounts]);

  // ===== Sync Functions =====
  
  /**
   * Sync Survey Submissions using the new SQLite service
   */
  const syncSurveySubmissions = async () => {
    if (isSyncing || !isConnected || !user?.id) {
      showToast("error", t("Sync.networkError"), t("Sync.offlineMessage"));
      return;
    }

    setIsSyncing(true);
    setSyncType(getSyncTypeKey("Sync.submissions", t));

    try {
      console.log("🔄 Starting survey submissions sync...");
      
      // Use the new syncPendingSubmissions function
      const syncResult = await syncPendingSubmissions(getAll, update, t, user.id);
      
      await updateSubmissionCounts();
      setLastSyncDate(new Date());
      
      if (syncResult.synced > 0 && syncResult.failed === 0) {
        showToast(
          "success",
          t("Sync.success"),
          `${syncResult.synced} ${t("Sync.submissionsSynced") || "submissions synced successfully"}`
        );
      } else if (syncResult.synced > 0 && syncResult.failed > 0) {
        showToast(
          "info",
          t("Sync.partialSuccess"),
          `${syncResult.synced} synced, ${syncResult.failed} failed`
        );
      } else if (syncResult.failed > 0) {
        showToast(
          "error",
          t("Sync.error"),
          `${syncResult.failed} ${t("Sync.submissionsFailed") || "submissions failed to sync"}`
        );
      } else {
        showToast("info", t("Sync.info"), t("Sync.noPendingSubmissions"));
      }

      console.log(`✅ Survey submissions sync complete: ${syncResult.synced} synced, ${syncResult.failed} failed`);
    } catch (error) {
      console.error("❌ Error syncing survey submissions:", error);
      showToast("error", t("Sync.error"), t("Sync.submissionsSyncFailed") || "Failed to sync submissions");
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      setForceRefresh((prev) => prev + 1);
    }
  };

  // const syncFamilies = async () => {
  //   if (isSyncing || !isConnected || !user?.id) {
  //     showToast("error", t("Sync.networkError"), t("Sync.offlineMessage"));
  //     return;
  //   }

  //   setIsSyncing(true);
  //   setSyncType(getSyncTypeKey("Sync.families", t));

  //   try {
  //     console.log("Starting families sync...");
  //     await syncTemporaryFamilies(query, "/families", t, user.id);
  //     setLastSyncDate(new Date());
  //     await updateSubmissionCounts();
  //     showToast("success", t("Sync.success"), t("Sync.familiesSynced") || "Families synced successfully");
  //   } catch (error) {
  //     console.error("Error syncing families:", error);
  //     showToast("error", t("Sync.error"), t("Sync.familiesSyncFailed") || "Failed to sync families");
  //   } finally {
  //     setIsSyncing(false);
  //     setSyncType(null);
  //     setForceRefresh((prev) => prev + 1);
  //   }
  // };

  // const syncIzusFn = async () => {
  //   if (isSyncing || !isConnected || !user?.id) {
  //     showToast("error", t("Sync.networkError"), t("Sync.offlineMessage"));
  //     return;
  //   }

  //   setIsSyncing(true);
  //   setSyncType(getSyncTypeKey("Sync.izus", t));

  //   try {
  //     console.log("🔄 Starting izus sync...");
  //     await syncTemporaryIzus("/izus");
  //     setLastSyncDate(new Date());
  //     await updateSubmissionCounts();
  //     showToast("success", t("Sync.success"), t("Sync.izusSynced") || "Users synced successfully");
  //   } catch (error) {
  //     console.error("❌ Error syncing izus:", error);
  //     showToast("error", t("Sync.error"), t("Sync.izusSyncFailed") || "Failed to sync users");
  //   } finally {
  //     setIsSyncing(false);
  //     setSyncType(null);
  //     setForceRefresh((prev) => prev + 1);
  //   }
  // };

  // const syncMonitoringResponsesFn = async () => {
  //   if (isSyncing || !isConnected || !user?.id) {
  //     showToast("error", t("Sync.networkError"), t("Sync.offlineMessage"));
  //     return;
  //   }

  //   setIsSyncing(true);
  //   setSyncType(getSyncTypeKey("Sync.responses", t));

  //   try {
  //     console.log("🔄 Starting monitoring responses sync...");
  //     await syncTemporaryMonitoringResponses(query, "/get-performances", t, user.id);
  //     setLastSyncDate(new Date());
  //     await updateSubmissionCounts();
  //     showToast("success", t("Sync.success"), t("Sync.responsesSynced") || "Responses synced successfully");
  //   } catch (error) {
  //     console.error("❌ Error syncing monitoring responses:", error);
  //     showToast("error", t("Sync.error"), t("Sync.responsesSyncFailed") || "Failed to sync responses");
  //   } finally {
  //     setIsSyncing(false);
  //     setSyncType(null);
  //     setForceRefresh((prev) => prev + 1);
  //   }
  // };

  // const syncFollowupsFn = async () => {
  //   if (isSyncing || !isConnected || !user?.id) {
  //     showToast("error", t("Sync.networkError"), t("Sync.offlineMessage"));
  //     return;
  //   }

  //   setIsSyncing(true);
  //   setSyncType(getSyncTypeKey("Sync.followups", t));

  //   try {
  //     console.log("🔄 Starting followups sync...");
  //     // TODO: Replace with your followups sync service
  //     // e.g., await syncTemporaryFollowups(query, t, user.id);
  //     console.log("TODO: sync followups with backend");
  //     setLastSyncDate(new Date());
  //     await updateSubmissionCounts();
  //     showToast("info", t("Sync.info"), "Followups sync not implemented yet");
  //   } catch (error) {
  //     console.error("Error syncing followups:", error);
  //     showToast("error", t("Sync.error"), t("Sync.followupsSyncFailed") || "Failed to sync followups");
  //   } finally {
  //     setIsSyncing(false);
  //     setSyncType(null);
  //     setForceRefresh((prev) => prev + 1);
  //   }
  // };

  // ===== Sync All Function =====
  const syncAll = async () => {
    if (isSyncing || !isConnected || !user?.id) {
      showToast("error", t("Sync.networkError"), t("Sync.offlineMessage"));
      return;
    }

    setIsSyncing(true);
    setSyncType("Syncing All");

    try {
      console.log("Starting sync all...");
      
      // Sync in order
      await syncSurveySubmissions();
      // await syncFamilies();
      // await syncIzusFn();
      // await syncMonitoringResponsesFn();
      
      setLastSyncDate(new Date());
      showToast("success", t("Sync.success"), t("Sync.allSynced") || "All data synced successfully");
    } catch (error) {
      console.error("Error syncing all:", error);
      showToast("error", t("Sync.error"), "Failed to sync all data");
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      setForceRefresh((prev) => prev + 1);
    }
  };

  // ===== UI =====
  const services: SyncItem[] = useMemo(
    () => [
      {
        key: "Sync.submissions",
        name: `${t("Sync.submissions") || "Survey Submissions"} (${pendingSurveySubmissionsCount} ${t("Sync.unsent") || "unsent"})`,
        status: pendingSurveySubmissionsCount === 0 ? "nopendingsubmissions" : "notsynced",
      },
      // {
      //   key: "Sync.families",
      //   name: `${t("Sync.families") || "Families"} (${pendingFamiliesCount} ${t("Sync.unsent") || "unsent"})`,
      //   status: pendingFamiliesCount === 0 ? "nopendingfamilies" : "notsynced",
      // },
      // {
      //   key: "Sync.izus",
      //   name: `${t("Sync.Users") || "Users"} (${pendingIzusCount} ${t("Sync.unsent") || "unsent"})`,
      //   status: pendingIzusCount === 0 ? "nopendingusers" : "notsynced",
      // },
      // {
      //   key: "Sync.responses",
      //   name: `${t("Sync.responses") || "Monitoring Responses"} (${pendingMonitoringResponsesCount} ${t("Sync.unsent") || "unsent"})`,
      //   status: pendingMonitoringResponsesCount === 0 ? "nopendingresponses" : "notsynced",
      // },
      // {
      //   key: "Sync.followups",
      //   name: `${t("Sync.followups") || "Follow-ups"} (${pendingFollowupsCount} ${t("Sync.unsent") || "unsent"})`,
      //   status: pendingFollowupsCount === 0 ? "nopendingfollowups" : "notsynced",
      // },
    ],
    [
      pendingSurveySubmissionsCount,
      // pendingFamiliesCount,
      // pendingIzusCount,
      // pendingMonitoringResponsesCount,
      // pendingFollowupsCount,
      t,
    ]
  );

  const renderItem = ({ item }: { item: SyncItem }) => {
    const isCurrentlySyncing = isSyncing && syncType === getSyncTypeKey(item.key, t);
    
    return (
      <View className="p-4 border-b bg-white flex flex-row justify-between border-gray-300">
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold">{item.name}</Text>
            {isCurrentlySyncing && (
              <ActivityIndicator size="small" color="#0000ff" />
            )}
          </View>
          <Text
            className={
              item.status === "success"
                ? "text-green-500"
                : item.status === "failed"
                ? "text-red-500"
                : item.status === "syncing"
                ? "text-blue-500"
                : "text-gray-500"
            }
          >
            {syncStatusKiny[item.status]}
          </Text>
        </View>
        <TouchableOpacity
          className={`flex items-center justify-center h-12 w-12 flex-col rounded-full ml-4 ${
            isCurrentlySyncing
              ? "bg-gray-700"
              : item.status === "failed"
              ? "bg-red-500"
              : "bg-primary"
          }`}
          onPress={() => {
            if (item.key === "Sync.submissions") syncSurveySubmissions();
            // else if (item.key === "Sync.families") syncFamilies();
            // else if (item.key === "Sync.izus") syncIzusFn();
            // else if (item.key === "Sync.responses") syncMonitoringResponsesFn();
            // else if (item.key === "Sync.followups") syncFollowupsFn();
          }}
          disabled={isSyncing}
        >
          <TabBarIcon
            name={isCurrentlySyncing ? "hourglass-empty" : "sync"}
            family="MaterialIcons"
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <HeaderNavigation title={t("SettingsPage.sync") || "Sync"} />
      
      {/* Sync Status Banner */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-sm text-gray-600">
              {isConnected ? "🌐 Online" : "📴 Offline"}
            </Text>
            {lastSyncDate && (
              <Text className="text-xs text-gray-500 mt-1">
                {t("Sync.lastSync") || "Last sync"}: {lastSyncDate.toLocaleString()}
              </Text>
            )}
          </View>
          
          {/* Sync All Button */}
          <TouchableOpacity
            className={`px-4 py-2 rounded-lg ${isSyncing ? "bg-gray-400" : "bg-primary"}`}
            onPress={syncAll}
            disabled={isSyncing || !isConnected}
          >
            <Text className="text-white font-bold">
              {isSyncing ? t("Sync.syncing") || "Syncing..." : t("Sync.syncAll") || "Sync All"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync Items List */}
      <FlatList<SyncItem>
        data={services}
        extraData={forceRefresh}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

export default SyncPage;