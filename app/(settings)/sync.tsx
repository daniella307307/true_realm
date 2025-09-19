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
import { syncTemporaryFamilies } from "~/services/families";
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
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingFamiliesCount, setPendingFamiliesCount] = useState<number>(0);
  const [pendingIzusCount, setPendingIzusCount] = useState<number>(0);
  const [pendingMonitoringResponsesCount, setPendingMonitoringResponsesCount] = useState<number>(0);
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState<number>(0);
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

      // Count unsent submissions - using sync_data.sync_status
      const pendingCount = allSubmissions.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      ).length;

      console.log('Unsent submissions:', pendingCount);

      setPendingCount(pendingCount);

      // Count unsent families
      const allFamilies = realm.objects(Families);
      console.log('\n=== FAMILIES COUNTS ===');
      const pendingFamilies = allFamilies.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      ).length;
      console.log('Unsent families:', pendingFamilies);

      setPendingFamiliesCount(pendingFamilies);

      // Count unsent izus
      const allIzus = realm.objects(Izu);
      console.log('\n=== IZUS COUNTS ===');

      const pendingIzus = allIzus.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      ).length;

      console.log('Unsent Izus:', pendingIzus);

      setPendingIzusCount(pendingIzus);

      // Count unsent monitoring responses
      const allMonitoringResponses = realm.objects(MonitoringResponses);
      console.log('\n=== MONITORING RESPONSES COUNTS ===')

      const pendingMonitoringResponses = allMonitoringResponses.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      ).length;

      console.log('Unsent monitoring responses:', pendingMonitoringResponses);

      setPendingMonitoringResponsesCount(pendingMonitoringResponses);

      // Count unsent followups
      const allFollowups = realm.objects(FollowUps);
      console.log('\n=== FOLLOWUPS COUNTS ===');

      const pendingFollowups = allFollowups.filtered(
        'sync_data.sync_status == false AND sync_data.created_by_user_id == $0',
        user?.id
      ).length;

      console.log('Unsent followups:', pendingFollowups);

      setPendingFollowupsCount(pendingFollowups);

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
        await syncTemporaryFamilies(realm, `/createFamily`, t, user?.id);

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
        await syncTemporaryIzus(realm, `/izucelldemography/create`, t, user?.id);
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
        await syncTemporaryMonitoringResponses(realm, "/sendMonitoringData", t, user?.id);

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
        await syncTemporaryFollowups(realm, "/followups", t, user?.id);

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
      await syncPendingSubmissions(realm, t, user?.id);
      console.log("Completed syncPendingSubmissions");

      // Force refresh submissions state
      await refresh();

      // Force UI update by triggering the forceRefresh counter
      setForceRefresh((prev) => prev + 1);

      // Update counts directly from realm after all operations
      updateSubmissionCounts();

      // Set last sync date
      setLastSyncDate(new Date());

    } catch (error) {
      console.error("Error during data sync:", error);
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
      await syncTemporaryFamilies(realm, `/createFamily`, t, user?.id);

      // Set last sync date
      setLastSyncDate(new Date());

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);

    } catch (error) {
      console.error("Error during families sync:", error);
    } finally {
      setIsSyncing(false);
      setSyncType(null);
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
      await syncTemporaryIzus(realm, `/izucelldemography/create`, t, user?.id);
      await refreshIzus();

      // Set last sync date
      setLastSyncDate(new Date());

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);

    } catch (error) {
      console.error("Error during izus sync:", error);
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

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
      await syncTemporaryMonitoringResponses(realm, "/sendMonitoringData", t, user?.id);

      // Set last sync date
      setLastSyncDate(new Date());

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);

    } catch (error) {
      console.error("Error during monitoring responses sync:", error);
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

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
      await syncTemporaryFollowups(realm, "/followups", t, user?.id);

      // Set last sync date
      setLastSyncDate(new Date());

      // Force a UI refresh after completion
      setForceRefresh((prev) => prev + 1);

    } catch (error) {
      console.error("Error during followups sync:", error);
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  // Modify the services useMemo to use correct status types
  // const services = useMemo(() => {
  //   const currentStatuses = currentSyncStatusesRef.current;

  //   const formsOverallStatus: SyncStatusType =
  //     isSyncing && syncType === "Forms"
  //       ? "syncing"
  //       : Object.values(currentStatuses).includes("failed")
  //       ? "failed"
  //       : lastSyncDate && syncType === "Forms"
  //       ? "success"
  //       : "notsynced";

  //   return [
  //     {
  //       key: "Forms",
  //       name: "Forms/Surveys",
  //       status: formsOverallStatus,
  //       progress: syncType === "Forms" ? syncProgress : undefined,
  //       lastSyncDate: lastSyncDate,
  //       items: [
  //         {
  //           name: "Projects",
  //           status: currentStatuses.Projects.toLowerCase() as SyncStatusType,
  //           lastSyncDate: lastSyncDate,
  //         },
  //         {
  //           name: "Modules",
  //           status: currentStatuses.Modules.toLowerCase() as SyncStatusType,
  //           lastSyncDate: lastSyncDate,
  //         },
  //         {
  //           name: "Forms",
  //           status: currentStatuses.Forms.toLowerCase() as SyncStatusType,
  //           lastSyncDate: lastSyncDate,
  //         },
  //         {
  //           name: "Stakeholders",
  //           status: currentStatuses.Stakeholders.toLowerCase() as SyncStatusType,
  //           lastSyncDate: lastSyncDate,
  //         },
  //       ],
  //     },
  //     {
  //       key: "Sync.data",
  //       name: `${t("Sync.data")} (${pendingCount} ${t("Sync.unsent")})`,
  //       status:
  //         pendingCount === 0
  //           ? "nopendingsubmissions"
  //           : isSyncing && syncType === "Data"
  //           ? "syncing"
  //           : lastSyncDate && syncType === "Data"
  //           ? "success"
  //           : "notsynced",
  //       progress: syncType === "Data" ? syncProgress : undefined,
  //       lastSyncDate: lastSyncDate,
  //     },
  //     {
  //       key: "Sync.families",
  //       name: `${t("Sync.families")} (${pendingFamiliesCount} ${t("Sync.unsent")})`,
  //       status:
  //         pendingFamiliesCount === 0
  //           ? "nopendingfamilies"
  //           : isSyncing && syncType === "Families"
  //           ? "syncing"
  //           : lastSyncDate && syncType === "Families"
  //           ? "success"
  //           : currentStatuses.Families.toLowerCase() as SyncStatusType,
  //       progress: syncType === "Families" ? syncProgress : undefined,
  //       lastSyncDate: lastSyncDate,
  //     },
  //     {
  //       key: "Sync.izus",
  //       name: `${t("Sync.izus")} (${pendingIzusCount} ${t("Sync.unsent")})`,
  //       status:
  //         pendingIzusCount === 0
  //           ? "nopendingizus"
  //           : isSyncing && syncType === "Izus"
  //           ? "syncing"
  //           : lastSyncDate && syncType === "Izus"
  //           ? "success"
  //           : currentStatuses.Izus.toLowerCase() as SyncStatusType,
  //       progress: syncType === "Izus" ? syncProgress : undefined,
  //       lastSyncDate: lastSyncDate,
  //     },
  //     {
  //       key: "Sync.responses",
  //       name: `${t("Sync.responses")} (${pendingMonitoringResponsesCount} ${t("Sync.unsent")})`,
  //       status:
  //         pendingMonitoringResponsesCount === 0
  //           ? "nopendingresponses"
  //           : isSyncing && syncType === "MonitoringResponses"
  //           ? "syncing"
  //           : lastSyncDate && syncType === "MonitoringResponses"
  //           ? "success"
  //           : currentStatuses.MonitoringResponses.toLowerCase() as SyncStatusType,
  //       progress: syncType === "MonitoringResponses" ? syncProgress : undefined,
  //       lastSyncDate: lastSyncDate,
  //     },
  //     {
  //       key: "Sync.followups",
  //       name: `${t("Sync.followups")} (${pendingFollowupsCount} ${t("Sync.unsent")})`,
  //       status:
  //         pendingFollowupsCount === 0
  //           ? "nopendingfollowups"
  //           : isSyncing && syncType === "Followups"
  //           ? "syncing"
  //           : lastSyncDate && syncType === "Followups"
  //           ? "success"
  //           : currentStatuses.Followups.toLowerCase() as SyncStatusType,
  //       progress: syncType === "Followups" ? syncProgress : undefined,
  //       lastSyncDate: lastSyncDate,
  //     }
  //   ];
  // }, [
  //   isSyncing,
  //   currentSyncItem,
  //   syncProgress,
  //   lastSyncDate,
  //   syncType,
  //   syncStatuses,
  //   pendingCount,
  //   pendingFamiliesCount,
  //   pendingIzusCount,
  //   pendingMonitoringResponsesCount,
  //   forceRefresh,
  //   isConnected,
  //   t,
  //   pendingFollowupsCount,
  // ]);

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
        name: "Projects",
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
          // {
          //   name: "Stakeholders",
          //   status: currentStatuses.Stakeholders.toLowerCase() as SyncStatusType,
          //   lastSyncDate: lastSyncDate,
          // },
        ],
      },
      {
        key: "Sync.data",
        name: `${t("Sync.data")} (${pendingCount} ${t("Sync.unsent")})`,
        status:
          pendingCount === 0
            ? "nopendingsubmissions"
            : isSyncing && syncType === "Data"
              ? "syncing"
              : lastSyncDate && syncType === "Data"
                ? "success"
                : "notsynced",
        progress: syncType === "Data" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
      },
      // 👇 Families removed from the list
      {
        key: "Sync.izus",
        name: `${t("Sync.Users")} (${pendingIzusCount} ${t("Sync.unsent")})`,
        status:
          pendingIzusCount === 0
            ? "nopendingizus"
            : isSyncing && syncType === "Izus"
              ? "syncing"
              : lastSyncDate && syncType === "Izus"
                ? "success"
                : currentStatuses.Izus.toLowerCase() as SyncStatusType,
        progress: syncType === "Izus" ? syncProgress : undefined,
        lastSyncDate: lastSyncDate,
      },
      // {
      //   key: "Sync.responses",
      //   name: `${t("Sync.responses")} (${pendingMonitoringResponsesCount} ${t("Sync.unsent")})`,
      //   status:
      //     pendingMonitoringResponsesCount === 0
      //       ? "nopendingresponses"
      //       : isSyncing && syncType === "MonitoringResponses"
      //         ? "syncing"
      //         : lastSyncDate && syncType === "MonitoringResponses"
      //           ? "success"
      //           : currentStatuses.MonitoringResponses.toLowerCase() as SyncStatusType,
      //   progress: syncType === "MonitoringResponses" ? syncProgress : undefined,
      //   lastSyncDate: lastSyncDate,
      // },
      // {
      //   key: "Sync.followups",
      //   name: `${t("Sync.followups")} (${pendingFollowupsCount} ${t("Sync.unsent")})`,
      //   status:
      //     pendingFollowupsCount === 0
      //       ? "nopendingfollowups"
      //       : isSyncing && syncType === "Followups"
      //         ? "syncing"
      //         : lastSyncDate && syncType === "Followups"
      //           ? "success"
      //           : currentStatuses.Followups.toLowerCase() as SyncStatusType,
      //   progress: syncType === "Followups" ? syncProgress : undefined,
      //   lastSyncDate: lastSyncDate,
      // }
    ];
  }, [
    isSyncing,
    currentSyncItem,
    syncProgress,
    lastSyncDate,
    syncType,
    syncStatuses,
    pendingCount,
    pendingIzusCount,
    pendingMonitoringResponsesCount,
    forceRefresh,
    isConnected,
    t,
    pendingFollowupsCount,
  ]);

  const getStatusText = (status: SyncStatusType) => {
    switch (status) {
      case "success":
        return t("Sync.success");
      case "failed":
        return t("Sync.failed");
      case "syncing":
        return t("Sync.syncing");
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
        className={`flex items-center justify-center h-12 w-12 flex-col rounded-full ml-4 ${isSyncing && syncType === item.key
            ? "bg-gray-700"
            : item.status === "failed"
              ? "bg-red-500"
              : "bg-primary"
          }`}
        onPress={() => {
          if (item.key === "Forms") {
            syncFormsAndSurveys();
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
        extraData={forceRefresh} // Ensure re-render on forceRefresh change
      />
      <Toast />
    </SafeAreaView>
  );
};

export default SyncPage;
