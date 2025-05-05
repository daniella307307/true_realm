import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetAllProjects } from "~/services/project";
import { useGetFamilies } from "~/services/families";
import { useGetForms } from "~/services/formElements";
import { useGetIzus } from "~/services/izus";
import { useGetPosts } from "~/services/posts";
import { useGetStakeholders } from "~/services/stakeholders";
import { useGetCohorts } from "~/services/cohorts";
import { useAuth } from "~/lib/hooks/useAuth";
import { useGetStatistics } from '~/services/statistics';
import { useGetNotifications } from '~/services/notifications';
import { useGetAllSurveySubmissions, useGetRemoteSurveySubmissions } from '~/services/survey-submission';

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

export const AppDataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isLoggedIn } = useAuth({});

  // Data fetching hooks
  const { refresh: refreshProjects } = useGetAllProjects(true);
  const { refresh: refreshFamilies } = useGetFamilies(true);
  const { refresh: refreshForms } = useGetForms(true);
  const { refresh: refreshIzus } = useGetIzus(true);
  const { refresh: refreshPosts } = useGetPosts(true);
  const { refresh: refreshStakeholders } = useGetStakeholders(true);
  const { refresh: refreshCohorts } = useGetCohorts(true);
  const { refresh: refreshStatistics } = useGetStatistics(true);
  const { refresh: refreshNotifications } = useGetNotifications(true);
  const { refresh: refreshRemoteSurveySubmissions } = useGetRemoteSurveySubmissions(true);
  const refreshAllData = async () => {
    try {
      setIsRefreshing(true);
      console.log("Starting data refresh...");
      
      await Promise.all([
        refreshProjects(),
        refreshFamilies(),
        refreshForms(),
        refreshIzus(),
        refreshPosts(),
        refreshStakeholders(),
        refreshCohorts(),
        refreshNotifications(),
        refreshStatistics(),
        refreshRemoteSurveySubmissions(),
      ]);
      
      console.log("All data refreshed successfully");
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Error refreshing app data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Don't auto-load data when not logged in
  useEffect(() => {
    const checkLoginAndLoadData = async () => {
      const loginStatus = await isLoggedIn;
      if (loginStatus && !isDataLoaded && !isRefreshing) {
        console.log("User is logged in, initializing data load");
        refreshAllData();
      }
    };
    
    checkLoginAndLoadData();
  }, [isLoggedIn]);

  return (
    <AppDataContext.Provider value={{ isDataLoaded, isRefreshing, refreshAllData }}>
      {children}
    </AppDataContext.Provider>
  );
};
