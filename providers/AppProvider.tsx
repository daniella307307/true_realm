import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from "~/lib/hooks/useAuth";
import { useSQLite } from "~/providers/RealContextProvider";

// Services (SQLite-compatible hooks)
import { useGetAllProjects } from "~/services/project";
// import { useFamilyService, useGetFamilies } from "~/services/families";
import { useGetForms } from "~/services/formElements";
import { useGetIzus } from "~/services/izus";
// import { useGetAllPosts } from "~/services/posts";
// import { useGetStakeholders } from "~/services/stakeholders";
// import { useGetCohorts } from "~/services/cohorts";
// import { useGetNotifications } from '~/services/notifications';
import { useGetAllSurveySubmissions } from '~/services/survey-submission';
// import { useGetMonitoringForms } from '~/services/monitoring/monitoring-forms';
// import { useGetMonitoringModules } from '~/services/monitoring/monitoring-module';
// import { useGetMonitoringResponses } from '~/services/monitoring/monitoring-responses';
// import { useGetAllFollowUps } from '~/services/followups';

type AppDataContextType = {
  isDataLoaded: boolean;
  isRefreshing: boolean;
  refreshAllData: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextType>({
  isDataLoaded: false,
  isRefreshing: false,
  refreshAllData: async () => {},
});

export const useAppData = () => useContext(AppDataContext);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { isLoggedIn, user } = useAuth({});
  const { isReady: isSQLiteReady } = useSQLite();
  const izusHook = useGetIzus(false);
  const projectsHook = useGetAllProjects(false);
  // const familiesHook = useGetFamilies(false);
  const formsHook = useGetForms(false);
  // const postsHook = useGetAllPosts(false);
  // const stakeholdersHook = useGetStakeholders(false);
  // const cohortsHook = useGetCohorts(false);
  // const notificationsHook = useGetNotifications(false);
  // const monitoringModulesHook = useGetMonitoringModules(false);
  // const monitoringFormsHook = useGetMonitoringForms(false);
  // const monitoringResponsesHook = useGetMonitoringResponses(false);
  // const followUpsHook = useGetAllFollowUps(false);
  const surveySubmissionsHook = useGetAllSurveySubmissions(false);

  // Memoized refresh function with rate limiting and sequential batching
  const refreshAllData = useCallback(async () => {
    if (isRefreshing) {
      console.log("Refresh already in progress, skipping...");
      return;
    }

    if (!isSQLiteReady) {
      console.log("SQLite not ready yet, cannot refresh data");
      return;
    }

    try {
      setIsRefreshing(true);
      console.log("Starting sequential data refresh with rate limiting...");

      // Batch 1: Critical data (with 200ms delays between each)
      console.log("Batch 1: Loading critical data...");
      try {
        await projectsHook?.refresh?.();
        await delay(200);
      } catch (error) {
        console.error("Error loading projects:", error);
      }
      
      try {
        await formsHook?.refresh?.();
        await delay(200);
      } catch (error) {
        console.error("Error loading forms:", error);
      }
      
      try {
        await izusHook?.refresh?.();
        await delay(200);
      } catch (error) {
        console.error("Error loading izus:", error);
      }

      // // Batch 2: User-related data (with 200ms delays)
      // console.log("Batch 2: Loading user data...");
      // try {
      //   await familiesHook?.refresh?.();
      //   await delay(200);
      // } catch (error) {
      //   console.error("Error loading families:", error);
      // }
      
      // try {
      //   await notificationsHook?.refresh?.();
      //   await delay(200);
      // } catch (error) {
      //   console.error("Error loading notifications:", error);
      // }
      
      // try {
      //   await followUpsHook?.refresh?.();
      //   await delay(200);
      // } catch (error) {
      //   console.error("Error loading follow-ups:", error);
      // }

      // // Batch 3: Monitoring data (with 200ms delays)
      // console.log("Batch 3: Loading monitoring data...");
      // try {
      //   await monitoringModulesHook?.refresh?.();
      //   await delay(200);
      // } catch (error) {
      //   console.error("Error loading monitoring modules:", error);
      // }
      
      // try {
      //   await monitoringFormsHook?.refresh?.();
      //   await delay(200);
      // } catch (error) {
      //   console.error("Error loading monitoring forms:", error);
      // }
      
      // try {
      //   await monitoringResponsesHook?.refresh?.();
      //   await delay(200);
      // } catch (error) {
      //   console.error("Error loading monitoring responses:", error);
      // }

      // Batch 4: Secondary data (with 200ms delays)
      // console.log(" Batch 4: Loading secondary data...");
      try {
        await surveySubmissionsHook?.refresh?.();
        await delay(200);
      } catch (error) {
        console.error("Error loading submissions:", error);
      }
      
      // try {
      //   await postsHook?.refresh?.();
      //   await delay(200);
      // } catch (error) {
      //   console.error("Error loading posts:", error);
      // }
      
      // try {
      //   await stakeholdersHook?.refresh?.();
      //   await delay(200);
      // } catch (error) {
      //   console.error("Error loading stakeholders:", error);
      // }
      
      // try {
      //   await cohortsHook?.refresh?.();
      // } catch (error) {
      //   console.error("Error loading cohorts:", error);
      // }

      console.log(" All data refresh completed successfully");
      setIsDataLoaded(true);
    } catch (error) {
      console.error(" Error refreshing app data:", error);
      // Still mark as loaded to allow app to function with whatever data succeeded
      setIsDataLoaded(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isRefreshing,
    isSQLiteReady,
    izusHook,
    projectsHook,
    // familiesHook,
    formsHook,
    // postsHook,
    // stakeholdersHook,
    // cohortsHook,
    // notificationsHook,
    // monitoringModulesHook,
    // monitoringFormsHook,
    surveySubmissionsHook,
    // monitoringResponsesHook,
    // followUpsHook,
  ]);

  // Initialize data when user logs in AND SQLite is ready
  useEffect(() => {
    const initializeData = async () => {
      try {
        const loginStatus = await Promise.resolve(isLoggedIn);
        
        console.log(" Checking initialization conditions:", {
          loginStatus,
          isSQLiteReady,
          hasInitialized,
          isRefreshing,
          isDataLoaded
        });

        if (loginStatus && isSQLiteReady && !hasInitialized && !isRefreshing) {
          console.log(" All conditions met, starting initial data load");
          setHasInitialized(true);
          await refreshAllData();
        } else if (!loginStatus && hasInitialized) {
          // Reset state when user logs out
          console.log(" User logged out, resetting data state");
          setHasInitialized(false);
          setIsDataLoaded(false);
        } else if (!isSQLiteReady) {
          console.log(" Waiting for SQLite to be ready before data load");
        }
      } catch (error) {
        console.error(" Error in initializeData:", error);
      }
    };

    initializeData();
  }, [isLoggedIn, isSQLiteReady, hasInitialized, isRefreshing, refreshAllData]);

  const contextValue: AppDataContextType = {
    isDataLoaded,
    isRefreshing,
    refreshAllData,
  };

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};