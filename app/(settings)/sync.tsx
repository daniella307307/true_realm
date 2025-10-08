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
import { syncPendingSubmissions } from "~/services/survey-submission";
import { useGetStakeholders } from "~/services/stakeholders";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation} from "react-i18next";
import { useFamilyOperations } from "~/services/families";
import { useSyncIzus, useGetIzus } from "~/services/izus";
import Toast from "react-native-toast-message";
import { syncTemporaryMonitoringResponses } from "~/services/monitoring/monitoring-responses";
import { isOnline, useNetworkStatus } from "~/services/network";
import { useGetForms } from "~/services/formElements";
import { useAuth } from "~/lib/hooks/useAuth";

// SQLite Hook
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
    "Sync.families": "Sync.families",
    "Sync.izus": "Sync.izus",
    "Sync.responses": "Sync.responses",
    "Sync.followups": "Sync.followups",
  };

  return t(mapping[key] || key);
};

interface SyncStatuses {
  Projects: SyncStatusType;
  Modules: SyncStatusType;
  Forms: SyncStatusType;
  Stakeholders: SyncStatusType;
  Families: SyncStatusType;
  Izus: SyncStatusType;
  MonitoringResponses: SyncStatusType;
  Followups: SyncStatusType;
}

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
  const sqlite = useSQLite();
  const { db, query } = sqlite;
  const { isConnected } = useNetworkStatus();
  const { user } = useAuth({});
  const { t } = useTranslation();
  const { syncTemporaryFamilies } = useFamilyOperations();
  const { syncTemporaryIzus } = useSyncIzus();

  // Service hooks
  const { refresh: refreshProjects } = useGetAllProjects(true);
  const { refresh: refreshStakeholders } = useGetStakeholders(true);
  useGetIzus(true);
  useGetForms(true);

  // State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState<number>(0);

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingFamiliesCount, setPendingFamiliesCount] = useState(0);
  const [pendingIzusCount, setPendingIzusCount] = useState(0);
  const [pendingMonitoringResponsesCount, setPendingMonitoringResponsesCount] =
    useState(0);
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState(0);

  // ===== Count pending items =====
  const updateSubmissionCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const submissionsResult = await query(
        `SELECT COUNT(*) as count FROM SurveySubmissions WHERE sync_status = 0 AND created_by_user_id = ?`,
        [user.id]
      );
      setPendingCount(submissionsResult[0]?.count || 0);

      const familiesResult = await query(
        `SELECT COUNT(*) as count FROM Families WHERE sync_status = 0 AND created_by_user_id = ?`,
        [user.id]
      );
      setPendingFamiliesCount(familiesResult[0]?.count || 0);

      const izusResult = await query(
        `SELECT COUNT(*) as count FROM Izu WHERE sync_status = 0 AND created_by_user_id = ?`,
        [user.id]
      );
      setPendingIzusCount(izusResult[0]?.count || 0);

      const responsesResult = await query(
        `SELECT COUNT(*) as count FROM MonitoringResponses WHERE sync_status = 0 AND created_by_user_id = ?`,
        [user.id]
      );
      setPendingMonitoringResponsesCount(responsesResult[0]?.count || 0);

      const followupsResult = await query(
        `SELECT COUNT(*) as count FROM FollowUps WHERE sync_status = 0 AND created_by_user_id = ?`,
        [user.id]
      );
      setPendingFollowupsCount(followupsResult[0]?.count || 0);
    } catch (error) {
      console.error("Error updating counts:", error);
    }
  }, [user?.id, query]);

  useEffect(() => {
    updateSubmissionCounts();
  }, [updateSubmissionCounts]);

  // ===== Sync Functions =====
  const syncData = async () => {
    if (isSyncing || !isConnected || !user?.id) {
      showToast("error", t("Sync.networkError"), t("Sync.offlineMessage"));
      return;
    }

    setIsSyncing(true);
    setSyncType(getSyncTypeKey("Sync.data", t));

    try {
      const pendingSubmissions = await query(
        `SELECT * FROM SurveySubmissions WHERE sync_status = ? AND created_by_user_id = ?`,
        [false,user.id]
      );

      for (const submission of pendingSubmissions) {
        await syncPendingSubmissions(sqlite, submission, user.id);
        await query(
          `UPDATE SurveySubmissions SET sync_status = ? WHERE id = ?`,
          [true,submission.id]
        );
      }

      await updateSubmissionCounts();
      setLastSyncDate(new Date());
      showToast("success", t("Sync.success"), t("Sync.allSynced"));
    } catch (error) {
      console.error("Error syncing data:", error);
      showToast("error", t("Sync.error"), t("Sync.dataSyncFailed"));
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      setForceRefresh((prev) => prev + 1);
    }
  };

  const syncFamilies = async () => {
    if (isSyncing || !isConnected || !user?.id) return;

    setIsSyncing(true);
    setSyncType(getSyncTypeKey("Sync.families", t)); 

    try {
      await syncTemporaryFamilies(query, '/families', t, user.id);
      setLastSyncDate(new Date());
      await updateSubmissionCounts();
    } catch (error) {
      console.error("Error syncing families:", error);
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      setForceRefresh((prev) => prev + 1);
    }
  };

  const syncIzusFn = async () => {
    if (isSyncing || !isConnected || !user?.id) return;

    setIsSyncing(true);
    setSyncType(getSyncTypeKey("Sync.izus", t));

    try {
      await syncTemporaryIzus("/izus");
      setLastSyncDate(new Date());
      await updateSubmissionCounts();
    } catch (error) {
      console.error("Error syncing izus:", error);
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      setForceRefresh((prev) => prev + 1);
    }
  };

  const syncMonitoringResponsesFn = async () => {
    if (isSyncing || !isConnected || !user?.id) return;

    setIsSyncing(true);
    setSyncType(getSyncTypeKey("Sync.responses", t));

    try {
      await syncTemporaryMonitoringResponses(query, '/get-performances', t, user.id);
      setLastSyncDate(new Date());
      await updateSubmissionCounts();
    } catch (error) {
      console.error("Error syncing monitoring responses:", error);
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      setForceRefresh((prev) => prev + 1);
    }
  };

  const syncFollowupsFn = async () => {
    if (isSyncing || !isConnected || !user?.id) return;

    setIsSyncing(true);
    setSyncType(getSyncTypeKey("Sync.followups", t));

    try {
      // Replace with your followups sync service
      // e.g., await syncTemporaryFollowups(db, t, user.id);
      console.log("TODO: sync followups with backend");
      setLastSyncDate(new Date());
      await updateSubmissionCounts();
    } catch (error) {
      console.error("Error syncing followups:", error);
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
        key: "Sync.data",
        name: `${t("Sync.data")} (${pendingCount} ${t("Sync.unsent")})`,
        status: pendingCount === 0 ? "nopendingsubmissions" : "notsynced",
      },
      // {
      //   key: "Sync.families",
      //   name: `${t("Sync.families")} (${pendingFamiliesCount} ${t("Sync.unsent")})`,
      //   status: pendingFamiliesCount === 0 ? "nopendingfamilies" : "notsynced",
      // },
      {
        key: "Sync.izus",
        name: `${t("Sync.Users")} (${pendingIzusCount} ${t("Sync.unsent")})`,
        status: pendingIzusCount === 0 ? "nopendingusers" : "notsynced",
      },
      {
        key: "Sync.responses",
        name: `${t("Sync.responses")} (${pendingMonitoringResponsesCount} ${t("Sync.unsent")})`,
        status:
          pendingMonitoringResponsesCount === 0
            ? "nopendingresponses"
            : "notsynced",
      },
      {
        key: "Sync.followups",
        name: `${t("Sync.followups")} (${pendingFollowupsCount} ${t("Sync.unsent")})`,
        status:
          pendingFollowupsCount === 0 ? "nopendingfollowups" : "notsynced",
      },
    ],
    [
      pendingCount,
      pendingFamiliesCount,
      pendingIzusCount,
      pendingMonitoringResponsesCount,
      pendingFollowupsCount,
      t,
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
          isSyncing && syncType === item.key
            ? "bg-gray-700"
            : item.status === "failed"
            ? "bg-red-500"
            : "bg-primary"
        }`}
        onPress={() => {
          if (item.key === "Sync.data") syncData();
          else if (item.key === "Sync.families") syncFamilies();
          else if (item.key === "Sync.izus") syncIzusFn();
          else if (item.key === "Sync.responses") syncMonitoringResponsesFn();
          else if (item.key === "Sync.followups") syncFollowupsFn();
        }}
        disabled={isSyncing}
      >
        <TabBarIcon
          name={isSyncing && syncType === item.key ? "hourglass-empty" : "sync"}
          family="MaterialIcons"
          size={24}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <HeaderNavigation title={t("SettingsPage.sync")} />
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
