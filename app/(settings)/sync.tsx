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
import {
  useGetAllSurveySubmissions,
  syncPendingSubmissions,
} from "~/services/survey-submission";
import { RealmContext } from "~/providers/RealContextProvider";
import { useGetStakeholders } from "~/services/stakeholders";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { syncTemporaryFamilies, useGetFamilies } from "~/services/families";
import { syncTemporaryIzus, useGetIzus } from "~/services/izus";
import { Survey } from "~/models/surveys/survey";
import { Stakeholder } from "~/models/stakeholders/stakeholder";
import { Families } from "~/models/family/families";
import { Izu } from "~/models/izus/izu";
import { IModule, IProject } from "~/types";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import Toast from "react-native-toast-message"; // Make sure to install this package
import {
  syncTemporaryMonitoringResponses,
  useGetAllLocallyCreatedMonitoringResponses,
} from "~/services/monitoring/monitoring-responses";
import { MonitoringResponses } from "~/models/monitoring/monitoringresponses";
import { syncTemporaryFollowups } from "~/services/followups";
import { FollowUps } from "~/models/followups/follow-up";

// Network-related imports
import { isOnline, useNetworkStatus } from "~/services/network";
import { useGetForms } from "~/services/formElements";
import { useAuth } from "~/lib/hooks/useAuth";

const { useRealm, useQuery } = RealmContext;

// Define sync status types for better type safety
type SyncStatusType =
  | "notsynced"
  | "syncing"
  | "success"
  | "failed"
  | "networkerrors"
  | "nopendingsubmissions"
  | "nopendingfamilies"
  | "nopendingizus"
  | "nopendingresponses"
  | "nopendingfollowups";

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
  MonitoringResponses: SyncStatusType;
  Followups: SyncStatusType;
}

// Toast helper function
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

const SyncPage = () => {
  const realm = useRealm();
  const { isConnected } = useNetworkStatus();
  const { user } = useAuth({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSyncItem, setCurrentSyncItem] = useState<string>("");
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [networkErrorCount, setNetworkErrorCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [pendingFamiliesCount, setPendingFamiliesCount] = useState<number>(0);
  const [failedFamiliesCount, setFailedFamiliesCount] = useState<number>(0);
  const [pendingIzusCount, setPendingIzusCount] = useState<number>(0);
  const [failedIzusCount, setFailedIzusCount] = useState<number>(0);
  const [pendingMonitoringResponsesCount, setPendingMonitoringResponsesCount] =
    useState<number>(0);
  const [failedMonitoringResponsesCount, setFailedMonitoringResponsesCount] =
    useState<number>(0);
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState<number>(0);
  const [failedFollowupsCount, setFailedFollowupsCount] = useState<number>(0);
  const [forceRefresh, setForceRefresh] = useState<number>(0); // Used to force remounting

  // Keep track of sync statuses
  const [syncStatuses, setSyncStatuses] = useState<SyncStatuses>({
    Projects: "notsynced",
    Modules: "notsynced",
    Forms: "notsynced",
    Stakeholders: "notsynced",
    Families: "notsynced",
    Izus: "notsynced",
    MonitoringResponses: "notsynced",
    Followups: "notsynced",
  });

  // Ref to track the latest sync statuses (not affected by React's asynchronous state updates)
  const currentSyncStatusesRef = useRef<SyncStatuses>({ ...syncStatuses });

  // Service hooks
  const { refresh: refreshProjects } = useGetAllProjects(true);
  const { submissions: surveySubmissions, refresh } =
    useGetAllSurveySubmissions();
  const { refresh: refreshStakeholders } = useGetStakeholders(true);
  const { refresh: refreshForms } = useGetForms(true);
  const { refresh: refreshIzus } = useGetIzus(true);
  const { refresh: refreshMonitoringResponses } =
    useGetAllLocallyCreatedMonitoringResponses();
  // Sync translation
  const { t } = useTranslation();

  // Update submission counts
  const updateSubmissionCounts = useCallback(() => {
    try {
      console.log('\n=== UPDATE SUBMISSION COUNTS CALLED ===');
      console.log('User ID:', user?.id);
      
      // Direct realm query for maximum accuracy
      const allSubmissions = realm.objects(SurveySubmission);
      
      console.log('\n=== SYNC DATA COUNTS ===');
      console.log('Total submissions:', allSubmissions.length);

      // Count pending submissions - using sync_data.created_by_user_id
      const pendingCount = allSubmissions.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0 AND (sync_data.sync_reason == "pending" || sync_data.sync_reason == null || sync_data.sync_reason == "")',
        user?.id
      ).length;

      // Count network error submissions
      const networkErrorCount = allSubmissions.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0 AND sync_data.sync_reason == "Network Error"',
        user?.id
      ).length;

      // Count failed submissions
      const failedCount = allSubmissions.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0 AND (sync_data.sync_reason == "failed" || sync_data.sync_reason == "Other error")',
        user?.id
      ).length;

      console.log('Pending submissions:', pendingCount);
      console.log('Network error submissions:', networkErrorCount);
      console.log('Failed submissions:', failedCount);

      setPendingCount(pendingCount);
      setNetworkErrorCount(networkErrorCount);
      setFailedCount(failedCount);

      // Count pending and failed families
      const allFamilies = realm.objects(Families);
      console.log('\n=== FAMILIES COUNTS ===');
      console.log('Total families:', allFamilies.length);
      
      const pendingFamilies = allFamilies.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0 AND (sync_data.sync_reason == "pending" || sync_data.sync_reason == null || sync_data.sync_reason == "")',
        user?.id
      ).length;
      
      const failedFamilies = allFamilies.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0 AND (sync_data.sync_reason == "failed" || sync_data.sync_reason == "Other error")',
        user?.id
      ).length;

      console.log('Pending families:', pendingFamilies);
      console.log('Failed families:', failedFamilies);

      setPendingFamiliesCount(pendingFamilies);
      setFailedFamiliesCount(failedFamilies);

      // Count pending and failed izus
      const allIzus = realm.objects(Izu);
      console.log('\n=== IZUS COUNTS ===');
      console.log('Total Izus:', allIzus.length);
      
      const pendingIzus = allIzus.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      ).length;
      
      const failedIzus = allIzus.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      ).length;

      console.log('Pending Izus:', pendingIzus);
      console.log('Failed Izus:', failedIzus);

      setPendingIzusCount(pendingIzus);
      setFailedIzusCount(failedIzus);

      // Count pending and failed monitoring responses
      const allMonitoringResponses = realm.objects(MonitoringResponses);
      console.log('\n=== MONITORING RESPONSES COUNTS ===');
      console.log('Total monitoring responses:', allMonitoringResponses.length);
      
      // Debug log to see all monitoring responses
      console.log('All monitoring responses:', JSON.stringify(Array.from(allMonitoringResponses).map(mr => ({
        id: mr.id,
        sync_status: mr.sync_data?.sync_status,
        created_by_user_id: mr.sync_data?.created_by_user_id,
        user_id: mr.user_id,
        sync_reason: mr.sync_data?.sync_reason,
        sync_attempts: mr.sync_data?.sync_attempts
      })), null, 2));

      // Count pending monitoring responses - check both user_id and created_by_user_id
      const pendingMonitoringResponses = allMonitoringResponses.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      );

      console.log('Pending monitoring responses:', pendingMonitoringResponses.length);
      
      console.log('Pending monitoring responses details:', JSON.stringify(Array.from(pendingMonitoringResponses).map(mr => ({
        id: mr.id,
        sync_status: mr.sync_data?.sync_status,
        created_by_user_id: mr.sync_data?.created_by_user_id,
        user_id: mr.user_id,
        sync_reason: mr.sync_data?.sync_reason
      })), null, 2));

      const failedMonitoringResponses = allMonitoringResponses.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      );

      console.log('Pending monitoring responses count:', pendingMonitoringResponses.length);
      console.log('Failed monitoring responses count:', failedMonitoringResponses.length);

      setPendingMonitoringResponsesCount(pendingMonitoringResponses.length);
      setFailedMonitoringResponsesCount(failedMonitoringResponses.length);

      // Count pending and failed followups
      const allFollowups = realm.objects(FollowUps);
      console.log('\n=== FOLLOWUPS COUNTS ===');
      console.log('Total followups:', allFollowups.length);
      
      const pendingFollowups = allFollowups.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      ).length;
      
      const failedFollowups = allFollowups.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0 AND (sync_data.sync_reason == "failed" || sync_data.sync_reason == "Other error")',
        user?.id
      ).length;

      console.log('Pending followups:', pendingFollowups);
      console.log('Failed followups:', failedFollowups);

      setPendingFollowupsCount(pendingFollowups);
      setFailedFollowupsCount(failedFollowups);

      console.log('\n=== SYNC STATUS SUMMARY ===');
      console.log('Current user ID:', user?.id);
      console.log('Is network connected:', isConnected);
      console.log('Last sync date:', lastSyncDate);
      console.log('Current sync type:', syncType);
      console.log('Is syncing:', isSyncing);
      console.log('===========================\n');

    } catch (error) {
      console.error("Error updating counts:", error);
    }
  }, [realm, user?.id, isConnected, lastSyncDate, syncType, isSyncing]);

  // Add useEffect to call updateSubmissionCounts
  useEffect(() => {
    console.log('=== SYNC PAGE MOUNTED ===');
    updateSubmissionCounts();
  }, [updateSubmissionCounts]);

  // Get direct submissions from Realm - more reliable than using the hook data
  const getDirectSubmissions = useCallback(
    (filter: string) => {
      console.log(
        "getDirectSubmissions",
        realm.objects(SurveySubmission).filtered(filter)
      );
      return realm.objects(SurveySubmission).filtered(filter);
    },
    [realm]
  );

  const syncFormsAndSurveys = async () => {
    if (isSyncing) return;

    // Check network connectivity first
    if (!isConnected) {
      showToast(
        "error",
        t("Sync.networkError"),
        t("Sync.offlineMessage")
      );
      return;
    }

    // Reset all states for a fresh sync
    setIsSyncing(true);
    setSyncType("Forms");
    setSyncProgress(0);
    setLastSyncDate(null);
    setCurrentSyncItem("");
    let successCount = 0;
    const totalItems = 5; // Updated to reflect combined projects/modules
    let hasErrors = false;

    // Initialize current sync statuses with "notsynced"
    const localSyncStatuses: SyncStatuses = {
      Projects: "notsynced",
      Modules: "notsynced",
      Forms: "notsynced",
      Stakeholders: "notsynced",
      Families: "notsynced",
      Izus: "notsynced",
      MonitoringResponses: "notsynced",
      Followups: "notsynced",
    };

    // Update the ref to the initial state
    currentSyncStatusesRef.current = { ...localSyncStatuses };

    // Reset state sync statuses
    setSyncStatuses({ ...localSyncStatuses });

    try {
      // Double-check network connection before proceeding
      const networkAvailable = await isOnline();
      if (!networkAvailable) {
        throw new Error("Network unavailable");
      }
      
      // Sync Projects and Modules together
      setCurrentSyncItem("Projects");

      // Update both local and state statuses
      localSyncStatuses.Projects = "syncing";
      localSyncStatuses.Modules = "syncing";
      currentSyncStatusesRef.current = { ...localSyncStatuses };
      setSyncStatuses({ ...localSyncStatuses });

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

          localSyncStatuses.Projects = "success";
          localSyncStatuses.Modules = "success";
          currentSyncStatusesRef.current = { ...localSyncStatuses };
          setSyncStatuses({ ...localSyncStatuses });

          successCount += 2; // Count both projects and modules as successful
          setSyncProgress((successCount / totalItems) * 100);
          console.log("Projects and Modules sync completed successfully");
        } else {
          console.log(
            "No projects were stored, but not treating as error since this might be valid"
          );

          localSyncStatuses.Projects = "success";
          localSyncStatuses.Modules = "success";
          currentSyncStatusesRef.current = { ...localSyncStatuses };
          setSyncStatuses({ ...localSyncStatuses });

          successCount += 2;
          setSyncProgress((successCount / totalItems) * 100);
        }
      } catch (error) {
        console.log("Error syncing projects and modules:", error);

        localSyncStatuses.Projects = "failed";
        localSyncStatuses.Modules = "failed";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        hasErrors = true;
      }

      // Sync Forms
      setCurrentSyncItem("Forms");

      localSyncStatuses.Forms = "syncing";
      currentSyncStatusesRef.current = { ...localSyncStatuses };
      setSyncStatuses({ ...localSyncStatuses });

      try {
        console.log("Starting Forms sync...");
        await refreshForms();
        // Verify forms were stored by checking the realm
        const storedForms = realm.objects(Survey);
        console.log("Forms check - count:", storedForms.length);
        // Don't treat empty as an error

        localSyncStatuses.Forms = "success";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Forms sync completed successfully");
      } catch (error) {
        console.log("Error syncing forms:", error);

        localSyncStatuses.Forms = "failed";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        hasErrors = true;
      }

      // Sync Stakeholders
      setCurrentSyncItem("Stakeholders");

      localSyncStatuses.Stakeholders = "syncing";
      currentSyncStatusesRef.current = { ...localSyncStatuses };
      setSyncStatuses({ ...localSyncStatuses });

      try {
        console.log("Starting Stakeholders sync...");
        await refreshStakeholders();
        // Verify stakeholders were stored by checking the realm
        const storedStakeholders = realm.objects(Stakeholder);
        console.log("Stakeholders stored", storedStakeholders.length);

        localSyncStatuses.Stakeholders = "success";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
        console.log("Stakeholders sync completed successfully");
      } catch (error) {
        console.log("Error syncing stakeholders:", error);

        localSyncStatuses.Stakeholders = "failed";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        hasErrors = true;
      }

      // Sync Families
      setCurrentSyncItem("Families");

      localSyncStatuses.Families = "syncing";
      currentSyncStatusesRef.current = { ...localSyncStatuses };
      setSyncStatuses({ ...localSyncStatuses });

      try {
        console.log("Starting Families sync...");
        const networkAvailable = await isOnline();
        if (!networkAvailable) {
          throw new Error("Network unavailable");
        }
        await syncTemporaryFamilies(realm, `/createFamily`, user?.id);

        // Verify families were stored by checking the realm
        const storedFamilies = realm.objects(Families);
        console.log("Families stored", storedFamilies.length);

        localSyncStatuses.Families = "success";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
      } catch (error: any) {
        console.error("Error during families sync:", error);
        if (error.message === "Network unavailable" || 
            error.message?.includes?.("Network") || 
            !isConnected) {
          showToast(
            "error", 
            t("Sync.networkError"), 
            t("Sync.familySyncNetworkError")
          );
        } else {
          showToast("error", t("Sync.error"), t("Sync.familySyncFailed"));
        }
        localSyncStatuses.Families = "failed";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });
        hasErrors = true;
      }

      // Sync Izus
      setCurrentSyncItem("Izus");

      localSyncStatuses.Izus = "syncing";
      currentSyncStatusesRef.current = { ...localSyncStatuses };
      setSyncStatuses({ ...localSyncStatuses });

      try {
        console.log("Starting Izus sync...");
        const networkAvailable = await isOnline();
        if (!networkAvailable) {
          throw new Error("Network unavailable");
        }
        await syncTemporaryIzus(realm, `/izucelldemography/create`, user?.id);
        await refreshIzus();

        // Verify izus were stored by checking the realm
        const storedIzus = realm.objects(Izu);
        console.log("Izus stored", storedIzus.length);

        localSyncStatuses.Izus = "success";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
      } catch (error: any) {
        console.error("Error during izus sync:", error);
        if (error.message === "Network unavailable" || 
            error.message?.includes?.("Network") || 
            !isConnected) {
          showToast(
            "error", 
            t("Sync.networkError"), 
            t("Sync.izuSyncNetworkError")
          );
        } else {
          showToast("error", t("Sync.error"), t("Sync.izuSyncFailed"));
        }
        localSyncStatuses.Izus = "failed";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });
        hasErrors = true;
      }

      // Sync Monitoring Responses
      setCurrentSyncItem("MonitoringResponses");

      localSyncStatuses.MonitoringResponses = "syncing";
      currentSyncStatusesRef.current = { ...localSyncStatuses };
      setSyncStatuses({ ...localSyncStatuses });

      try {
        console.log("Starting Monitoring Responses sync...");
        const networkAvailable = await isOnline();
        if (!networkAvailable) {
          throw new Error("Network unavailable");
        }
        await syncTemporaryMonitoringResponses(realm, "/monitoring/responses", user?.id);

        // Verify responses were stored by checking the realm
        const storedResponses = realm.objects(MonitoringResponses);
        console.log("Monitoring Responses stored", storedResponses.length);

        localSyncStatuses.MonitoringResponses = "success";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
      } catch (error: any) {
        console.error("Error during monitoring responses sync:", error);
        if (error.message === "Network unavailable" || 
            error.message?.includes?.("Network") || 
            !isConnected) {
          showToast(
            "error", 
            t("Sync.networkError"), 
            t("Sync.monitoringNetworkError")
          );
        } else {
          showToast("error", t("Sync.error"), t("Sync.monitoringFailed"));
        }
        localSyncStatuses.MonitoringResponses = "failed";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });
        hasErrors = true;
      }

      // Sync Followups
      setCurrentSyncItem("Followups");

      localSyncStatuses.Followups = "syncing";
      currentSyncStatusesRef.current = { ...localSyncStatuses };
      setSyncStatuses({ ...localSyncStatuses });

      try {
        console.log("Starting Followups sync...");
        const networkAvailable = await isOnline();
        if (!networkAvailable) {
          throw new Error("Network unavailable");
        }
        await syncTemporaryFollowups(realm, "/followups", user?.id);

        // Verify followups were stored by checking the realm
        const storedFollowups = realm.objects(FollowUps);
        console.log("Followups stored", storedFollowups.length);

        localSyncStatuses.Followups = "success";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });

        successCount++;
        setSyncProgress((successCount / totalItems) * 100);
      } catch (error: any) {
        console.error("Error during followups sync:", error);
        if (error.message === "Network unavailable" || 
            error.message?.includes?.("Network") || 
            !isConnected) {
          showToast(
            "error", 
            t("Sync.networkError"), 
            t("Sync.followupSyncNetworkError")
          );
        } else {
          showToast("error", t("Sync.error"), t("Sync.followupSyncFailed"));
        }
        localSyncStatuses.Followups = "failed";
        currentSyncStatusesRef.current = { ...localSyncStatuses };
        setSyncStatuses({ ...localSyncStatuses });
        hasErrors = true;
      }

      // Set last sync date regardless of errors
      setLastSyncDate(new Date());

      // Check if any components failed
      const failedComponents = Object.entries(localSyncStatuses)
        .filter(([_, status]) => status === "failed")
        .map(([component, _]) => component);

      // Final sync status determination
      if (hasErrors || failedComponents.length > 0) {
        const failedComponentsList = failedComponents.join(", ");

        // Show toast instead of alert
        showToast(
          "error",
          t("Sync.partialSuccess"),
          t("Sync.partialSyncMessage", { components: failedComponentsList })
        );
      } else {
        // Show toast instead of alert
        showToast("success", t("Sync.success"), t("Sync.allSynced"));
      }
    } catch (error: any) {
      console.error("Error during sync:", error);
      
      if (error.message === "Network unavailable" || 
          (error.message && error.message.includes("Network")) || 
          !isConnected) {
        showToast(
          "error", 
          t("Sync.networkError"), 
          t("Sync.offlineMessage")
        );
      } else {
        // Show toast instead of alert
        showToast("error", t("Sync.error"), t("Sync.formSyncFailed"));
      }
    } finally {
      setIsSyncing(false);
      setSyncType(null);
      setCurrentSyncItem("");
    }
  };

  const syncData = async () => {
    if (isSyncing) return;

    // Check network connectivity first
    if (!isConnected) {
      showToast(
        "error",
        t("Sync.networkError"),
        t("Sync.offlineMessage")
      );
      return;
    }

    setIsSyncing(true);
    setSyncType("Data");
    setSyncProgress(0);

    try {
      // Check network again before proceeding with the actual sync operation
      const networkAvailable = await isOnline();
      if (!networkAvailable) {
        throw new Error("Network unavailable");
      }

      // Use the syncPendingSubmissions service function to sync submissions
      await syncPendingSubmissions(realm, user?.id);
      console.log("Completed syncPendingSubmissions");

      // Force refresh submissions state
      await refresh();

      // Force UI update by triggering the forceRefresh counter
      setForceRefresh((prev) => prev + 1);

      // Update counts directly from realm after all operations
      updateSubmissionCounts();

      // Get the updated counts
      const pendingCount = realm
        .objects(SurveySubmission)
        .filtered(
          'sync_data.sync_status == false && (sync_data.sync_reason == "pending" || sync_data.sync_reason == null || sync_data.sync_reason == "")'
        ).length;

      const networkErrorCount = realm
        .objects(SurveySubmission)
        .filtered('sync_data.sync_reason == "Network Error"').length;

      const failedCount = realm
        .objects(SurveySubmission)
        .filtered(
          'sync_data.sync_reason == "failed" || sync_data.sync_reason == "Other error"'
        ).length;

      const syncedCount = realm
        .objects(SurveySubmission)
        .filtered("sync_data.sync_status == true").length;

      // Set last sync date
      setLastSyncDate(new Date());

      // Display appropriate message based on results
      if (networkErrorCount > 0 && (failedCount > 0 || syncedCount > 0)) {
        showToast(
          "info",
          t("Sync.partialSuccess"),
          t("Sync.partialNetworkError", { 
            synced: syncedCount, 
            failed: failedCount, 
            networkError: networkErrorCount 
          })
        );
      } else if (networkErrorCount > 0) {
        showToast(
          "error",
          t("Sync.networkError"),
          t("Sync.allNetworkError", { count: networkErrorCount })
        );
      } else if (failedCount > 0) {
        showToast(
          "info",
          t("Sync.partialSuccess"),
          t("Sync.partialSubmissionSuccess", { synced: syncedCount, failed: failedCount })
        );
      } else if (syncedCount > 0) {
        showToast(
          "success",
          t("Sync.success"),
          t("Sync.successfullySynced", { count: syncedCount })
        );
      } else {
        showToast("info", t("Sync.info"), t("Sync.noPendingSubmissions"));
      }
    } catch (error: any) {
      console.error("Error during data sync:", error);
      if (error.message === "Network unavailable" || 
          (error.message && error.message.includes("Network")) || 
          !isConnected) {
        showToast(
          "error", 
          t("Sync.networkError"), 
          t("Sync.syncDataNetworkError")
        );
      } else {
        showToast("error", t("Sync.error"), t("Sync.syncDataFailed"));
      }
    } finally {
      setIsSyncing(false);
      setSyncType(null);

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);
    }
  };

  const syncFamilies = async () => {
    if (isSyncing) return;

    // Check network connectivity first
    if (!isConnected) {
      showToast(
        "error",
        t("Sync.networkError"),
        t("Sync.offlineMessage")
      );
      return;
    }

    setIsSyncing(true);
    setSyncType("Families");
    setSyncProgress(0);

    try {
      // Double-check network connection before proceeding
      const networkAvailable = await isOnline();
      if (!networkAvailable) {
        throw new Error("Network unavailable");
      }

      console.log("Starting Families sync...");
      const storedFamilies = realm.objects(Families);
      console.log(
        "Families stored",
        storedFamilies.map((fam) => fam.hh_head_fullname)
      );
      await syncTemporaryFamilies(realm, `/createFamily`, user?.id);

      // Verify families were stored by checking the realm
      console.log("Families stored", storedFamilies.length);

      // Set last sync date
      setLastSyncDate(new Date());

      // Show success message
      showToast(
        "success",
        t("Sync.success"),
        t("Sync.successfullySyncedFamilies", { count: storedFamilies.length })
      );
    } catch (error: any) {
      console.error("Error during families sync:", error);
      if (error.message === "Network unavailable" || 
          (error.message && error.message.includes("Network")) || 
          !isConnected) {
        showToast(
          "error", 
          t("Sync.networkError"), 
          t("Sync.familySyncNetworkError")
        );
      } else {
        showToast("error", t("Sync.error"), t("Sync.familySyncFailed"));
      }
    } finally {
      setIsSyncing(false);
      setSyncType(null);

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);
    }
  };

  const syncIzus = async () => {
    if (isSyncing) return;

    // Check network connectivity first
    if (!isConnected) {
      showToast(
        "error",
        t("Sync.networkError"),
        t("Sync.offlineMessage")
      );
      return;
    }

    setIsSyncing(true);
    setSyncType("Izus");
    setSyncProgress(0);

    try {
      // Double-check network connection before proceeding
      const networkAvailable = await isOnline();
      if (!networkAvailable) {
        throw new Error("Network unavailable");
      }

      console.log("Starting Izus sync...");
      // Use the syncTemporaryIzus function to sync Izus that need syncing
      await syncTemporaryIzus(realm, `/izucelldemography/create`, user?.id);
      // Then refresh from the server
      await refreshIzus();

      // Verify izus were stored by checking the realm
      const storedIzus = realm.objects(Izu);
      console.log("Izus stored", storedIzus.length);

      // Set last sync date
      setLastSyncDate(new Date());

      // Show success message
      showToast(
        "success",
        t("Sync.success"),
        t("Sync.successfullySyncedIzus", { count: storedIzus.length })
      );
    } catch (error: any) {
      console.error("Error during izus sync:", error);
      if (error.message === "Network unavailable" || 
          (error.message && error.message.includes("Network")) || 
          !isConnected) {
        showToast(
          "error", 
          t("Sync.networkError"), 
          t("Sync.izuSyncNetworkError")
        );
      } else {
        showToast("error", t("Sync.error"), t("Sync.izuSyncFailed"));
      }
    } finally {
      setIsSyncing(false);
      setSyncType(null);

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);
    }
  };

  // Manual retry for network error submissions
  const retryNetworkErrors = async () => {
    // Check network connectivity first
    if (!isConnected) {
      showToast(
        "error",
        t("Sync.networkError"),
        t("Sync.offlineMessage")
      );
      return;
    }

    try {
      // Double-check network connection before proceeding
      const networkAvailable = await isOnline();
      if (!networkAvailable) {
        throw new Error("Network unavailable");
      }

      const networkErrorSubmissions = getDirectSubmissions(
        'sync_data.sync_reason == "Network Error"'
      );

      if (networkErrorSubmissions.length === 0) {
        showToast("info", t("Sync.info"), t("Sync.noNetworkErrors"));
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
    } catch (error: any) {
      console.error("Error during retry of network errors:", error);
      if (error.message === "Network unavailable" || 
          (error.message && error.message.includes("Network")) || 
          !isConnected) {
        showToast(
          "error", 
          t("Sync.networkError"), 
          t("Sync.retryNetworkNetworkError")
        );
      } else {
        showToast("error", t("Sync.error"), t("Sync.retryNetworkFailed"));
      }
    }
  };

  // Add syncMonitoringResponses function
  const syncMonitoringResponses = async () => {
    if (isSyncing) return;

    // Check network connectivity first
    if (!isConnected) {
      showToast(
        "error",
        t("Sync.networkError"),
        t("Sync.offlineMessage")
      );
      return;
    }

    if (!user?.id) {
      showToast(
        "error",
        t("Sync.error"),
        t("Sync.noUserError")
      );
      return;
    }

    setIsSyncing(true);
    setSyncType("MonitoringResponses");
    setSyncProgress(0);

    try {
      // Double-check network connection before proceeding
      const networkAvailable = await isOnline();
      if (!networkAvailable) {
        throw new Error("Network unavailable");
      }

      console.log("Starting Monitoring Responses sync...");
      // Pass the user ID to the sync function
      await syncTemporaryMonitoringResponses(realm, "/monitoring/responses", user.id);

      // Verify responses were stored by checking the realm
      const storedResponses = realm.objects(MonitoringResponses);
      console.log("Monitoring Responses stored", storedResponses.length);

      // Set last sync date
      setLastSyncDate(new Date());

      // Show success message
      showToast(
        "success",
        t("Sync.success"),
        t("Sync.successfullySyncedResponses", { count: storedResponses.length })
      );
    } catch (error: any) {
      console.error("Error during monitoring responses sync:", error);
      if (error.message === "Network unavailable" || 
          (error.message && error.message.includes("Network")) || 
          !isConnected) {
        showToast(
          "error", 
          t("Sync.networkError"), 
          t("Sync.monitoringNetworkError")
        );
      } else {
        showToast("error", t("Sync.error"), t("Sync.monitoringFailed"));
      }
    } finally {
      setIsSyncing(false);
      setSyncType(null);

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);
    }
  };

  // Add syncFollowups function
  const syncFollowups = async () => {
    if (isSyncing) return;

    // Check network connectivity first
    if (!isConnected) {
      showToast(
        "error",
        t("Sync.networkError"),
        t("Sync.offlineMessage")
      );
      return;
    }

    setIsSyncing(true);
    setSyncType("Followups");
    setSyncProgress(0);

    try {
      // Double-check network connection before proceeding
      const networkAvailable = await isOnline();
      if (!networkAvailable) {
        throw new Error("Network unavailable");
      }

      console.log("Starting Followups sync...");
      // Use the syncTemporaryFollowups function to sync followups that need syncing
      await syncTemporaryFollowups(realm, "/followups", user?.id);

      // Verify followups were stored by checking the realm
      const storedFollowups = realm.objects(FollowUps);
      console.log("Followups stored", storedFollowups.length);

      // Set last sync date
      setLastSyncDate(new Date());

      // Show success message
      showToast(
        "success",
        t("Sync.success"),
        t("Sync.successfullySyncedFollowups", { count: storedFollowups.length })
      );
    } catch (error: any) {
      console.error("Error during followups sync:", error);
      if (error.message === "Network unavailable" || 
          (error.message && error.message.includes("Network")) || 
          !isConnected) {
        showToast(
          "error", 
          t("Sync.networkError"), 
          t("Sync.followupSyncNetworkError")
        );
      } else {
        showToast("error", t("Sync.error"), t("Sync.followupSyncFailed"));
      }
    } finally {
      setIsSyncing(false);
      setSyncType(null);

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);
    }
  };

  // Modify the services useMemo to use correct status types
  const services = useMemo(() => {
    const currentStatuses = currentSyncStatusesRef.current;

    const formsOverallStatus: SyncStatusType =
      isSyncing && syncType === "Forms"
        ? "syncing"
        : Object.values(currentStatuses).includes("failed")
        ? "failed"
        : lastSyncDate && syncType === "Forms"
        ? "success"
        : "notsynced";

    return [
      {
        key: "Forms",
        name: "Forms/Surveys",
        status: formsOverallStatus,
        progress: syncType === "Forms" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
        items: [
          {
            name: "Projects",
            status: currentStatuses.Projects.toLowerCase() as SyncStatusType,
            lastSyncDate: lastSyncDate,
          },
          {
            name: "Modules",
            status: currentStatuses.Modules.toLowerCase() as SyncStatusType,
            lastSyncDate: lastSyncDate,
          },
          {
            name: "Forms",
            status: currentStatuses.Forms.toLowerCase() as SyncStatusType,
            lastSyncDate: lastSyncDate,
          },
          {
            name: "Stakeholders",
            status: currentStatuses.Stakeholders.toLowerCase() as SyncStatusType,
            lastSyncDate: lastSyncDate,
          },
        ],
      },
      {
        key: "Sync.data",
        name: `${t("Sync.data")} (${pendingCount} ${t("Sync.pending")}, ${failedCount} ${t("Sync.failed")})`,
        status:
          pendingCount + failedCount === 0
            ? "nopendingsubmissions"
            : isSyncing && syncType === "Data"
            ? "syncing"
            : lastSyncDate && syncType === "Data"
            ? "success"
            : "notsynced",
        progress: syncType === "Data" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
      },
      {
        key: "Sync.families",
        name: `${t("Sync.families")} (${pendingFamiliesCount} ${t("Sync.pending")}, ${failedFamiliesCount} ${t("Sync.failed")})`,
        status:
          pendingFamiliesCount + failedFamiliesCount === 0
            ? "nopendingfamilies"
            : isSyncing && syncType === "Families"
            ? "syncing"
            : lastSyncDate && syncType === "Families"
            ? "success"
            : currentStatuses.Families.toLowerCase() as SyncStatusType,
        progress: syncType === "Families" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
      },
      {
        key: "Sync.izus",
        name: `${t("Sync.izus")} (${pendingIzusCount} ${t("Sync.pending")}, ${failedIzusCount} ${t("Sync.failed")})`,
        status:
          pendingIzusCount + failedIzusCount === 0
            ? "nopendingizus"
            : isSyncing && syncType === "Izus"
            ? "syncing"
            : lastSyncDate && syncType === "Izus"
            ? "success"
            : currentStatuses.Izus.toLowerCase() as SyncStatusType,
        progress: syncType === "Izus" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
      },
      {
        key: "Sync.responses",
        name: `${t("Sync.responses")} (${pendingMonitoringResponsesCount} ${t("Sync.pending")}, ${failedMonitoringResponsesCount} ${t("Sync.failed")})`,
        status:
          pendingMonitoringResponsesCount + failedMonitoringResponsesCount === 0
            ? "nopendingresponses"
            : isSyncing && syncType === "MonitoringResponses"
            ? "syncing"
            : lastSyncDate && syncType === "MonitoringResponses"
            ? "success"
            : currentStatuses.MonitoringResponses.toLowerCase() as SyncStatusType,
        progress: syncType === "MonitoringResponses" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
      },
      {
        key: "Sync.followups",
        name: `${t("Sync.followups")} (${pendingFollowupsCount} ${t("Sync.pending")}, ${failedFollowupsCount} ${t("Sync.failed")})`,
        status:
          pendingFollowupsCount + failedFollowupsCount === 0
            ? "nopendingfollowups"
            : isSyncing && syncType === "Followups"
            ? "syncing"
            : lastSyncDate && syncType === "Followups"
            ? "success"
            : currentStatuses.Followups.toLowerCase() as SyncStatusType,
        progress: syncType === "Followups" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
      },
      ...(networkErrorCount > 0
        ? [
            {
              key: "network",
              name: `${t("Sync.networkErrors")} (${networkErrorCount})`,
              status: "networkerrors" as SyncStatusType,
              lastSyncDate: null,
            },
          ]
        : []),
    ];
  }, [
    isSyncing,
    currentSyncItem,
    syncProgress,
    lastSyncDate,
    syncType,
    syncStatuses,
    pendingCount,
    failedCount,
    pendingFamiliesCount,
    failedFamiliesCount,
    pendingIzusCount,
    failedIzusCount,
    pendingMonitoringResponsesCount,
    failedMonitoringResponsesCount,
    networkErrorCount,
    forceRefresh,
    isConnected,
    t,
    pendingFollowupsCount,
    failedFollowupsCount,
  ]);

  const getStatusText = (status: SyncStatusType) => {
    switch (status) {
      case "success":
        return t("Sync.success");
      case "failed":
        return t("Sync.failed");
      case "syncing":
        return t("Sync.syncing");
      case "networkerrors":
        return t("Sync.networkErrors");
      case "notsynced":
        return t("Sync.notSynced");
      case "nopendingsubmissions":
        return t("Sync.noPendingSubmissions");
      case "nopendingfamilies":
        return t("Sync.noPendingFamilies");
      case "nopendingizus":
        return t("Sync.noPendingIzus");
      case "nopendingresponses":
        return t("Sync.noPendingResponses");
      case "nopendingfollowups":
        return t("Sync.noPendingFollowups");
      default:
        return t("Sync.unknown");
    }
  };

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
              : item.status === "networkerrors"
              ? "text-orange-500"
              : "text-gray-500"
          }
        >
          {getStatusText(item.status)}
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
              {t("Sync.complete", { percent: Math.round(item.progress) })}
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
                    subItem.status === "success"
                      ? "text-green-500"
                      : subItem.status === "failed"
                      ? "text-red-500"
                      : subItem.status === "syncing"
                      ? "text-blue-500"
                      : "text-gray-500"
                  }
                >
                  {getStatusText(subItem.status)}
                </Text>
              </View>
            ))}
          </View>
        )}
        {item.lastSyncDate && (
          <Text className="text-xs text-gray-500 mt-2">
            {t("Sync.lastSynced", { date: item.lastSyncDate.toLocaleString() })}
          </Text>
        )}
      </View>
      <TouchableOpacity
        className={`flex items-center justify-center h-12 w-12 flex-col rounded-full ml-4 ${
          isSyncing && syncType === item.key
            ? "bg-gray-700"
            : item.status === "failed"
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
          } else if (item.key === "Sync.families") {
            syncFamilies();
          } else if (item.key === "Sync.izus") {
            syncIzus();
          } else if (item.key === "Sync.responses") {
            syncMonitoringResponses();
          } else if (item.key === "Sync.followups") {
            syncFollowups();
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
      
      {/* Network status indicator */}
      {!isConnected && (
        <View className="bg-red-500 py-2 px-4">
          <Text className="text-white text-center font-bold">
            {t("Sync.offline")}
          </Text>
        </View>
      )}
      
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
