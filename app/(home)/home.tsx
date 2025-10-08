import React, { useEffect, useState } from "react";
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { SplashScreen } from "expo-router";
import HeaderNavigation from "~/components/ui/header";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useAuth } from "~/lib/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useProtectedNavigation } from "~/utils/navigation";
import { router } from "expo-router";
import { useAppData } from "~/providers/AppProvider";
import { useSQLite } from "~/providers/RealContextProvider";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";



function HomeScreen(): React.JSX.Element{
  const [splashHidden, setSplashHidden] = useState(false);
  const [showSyncWarning, setShowSyncWarning] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const { user } = useAuth({
    onLogout: () => {
      router.push("/(user-management)/login");
    },
  });
  const { getAll } = useSQLite();
  const { t } = useTranslation();
  const { navigateTo } = useProtectedNavigation();
  const { isDataLoaded, isRefreshing, refreshAllData } = useAppData();

  // Get the screen width dynamically
  const { width } = useWindowDimensions();

  // Check if the screen width is less than 375px for list view
  const isSmallScreen = width < 375;

  // Calculate item width for grid view (only used when width >= 375)
  const itemWidth = (width - 48) / 2; // 2 columns for normal phones with padding

  // Project IDs for navigation
  const HOUSEHOLD_ENROLLMENT_ID = 5;
  const IZU_SECTOR_COORDINATOR_DEMOGRAPHICS_ID = 8;
  const IZU_AT_VILLAGE_DEMOGRAPHICS_ID = 6;
  const IZU_CELL_TELEPHONE_SUPERVISION_ID = 11;
  const IZU_SECTOR_TELEPHONE_SUPERVISION_ID = 12;

  const IZU_MONITORING_ID = 10;

  // Check for unsynced data
  const checkUnsyncedData = async () => {
    if (!user?.id) return;

    const unsyncedFamilies = await getAll('Families', 'sync_status == false AND created_by_user_id == ?', [user.id]);
    const unsyncedFamiliesCount = unsyncedFamilies.length;
    const unsyncedFollowups = await getAll('FollowUps','sync_status == false AND created_by_user_id == ?', [user.id]);
    const unsyncedFollowupsCount = unsyncedFollowups.length;

    const unsyncedResponses = await getAll('MonitoringResponses', 'sync_status == false AND created_by_user_id == ?', [user.id]);
    const unsyncedResponsesCount = unsyncedResponses.length;

    const unsyncedSubmissions = await getAll('SurveySubmissions', 'sync_status == false AND created_by_user_id == ?', [user.id]);
    const unsyncedSubmissionsCount = unsyncedSubmissions.length;

    const unsyncedIzus = await getAll('Users', 'sync_status == false AND created_by_user_id == ?', [user.id]);
    const unsyncedIzusCount = unsyncedIzus.length;

    const total = unsyncedFamiliesCount + unsyncedFollowupsCount + unsyncedResponsesCount + unsyncedSubmissionsCount + unsyncedIzusCount;
    setUnsyncedCount(total);
    setShowSyncWarning(total > 0);
  };

  // Dynamic links based on user role
  const getActiveLinks = () => {
    const baseLinks = [
      // {
      //   icon: <TabBarIcon name="family-restroom" family="MaterialIcons" />,
      //   title: t("HomePage.families"),
      //   route: "/(families)/",
      // },
      // {
      //   icon: <TabBarIcon name="home" family="Entypo" />,
      //   title: t("HomePage.household_enrollment"),
      //   route: `/(projects)/(mods)/(projects)/${HOUSEHOLD_ENROLLMENT_ID}`,
      // },
     
      // {
      //   icon: <TabBarIcon name="chart-simple" family="FontAwesome6" />,
      //   title: t("HomePage.statistics"),
      //   route: "/(statistics)/",
      // },
      // {
      //   icon: <TabBarIcon name="account-star" family="MaterialCommunityIcons" />,
      //   title: t("HomePage.IZU_Monitoring"),
      //   route: `/(monitoring)/`,
      // },
      // {
      //   icon: <TabBarIcon name="video" family="Entypo" />,
      //   title: t("HomePage.videos"),
      //   route: "/(videos)/video",
      // },
      
      {
        icon: <TabBarIcon name="project" family="Octicons" />,
        title: t("HomePage.projects"),
        route: "/(projects)/project",
      },
       {
        icon: (
          <TabBarIcon name="calendar-month" family="MaterialCommunityIcons" />
        ),
        title: t("HomePage.history"),
        route: "/(history)/realmDbViewer",
      },
      {
        icon: <TabBarIcon name="account-group" family="MaterialCommunityIcons" />,
        title: t("HomePage.IZU_Sector_Coordinator_Demographics"),
        route: `/(projects)/(mods)/(projects)/${IZU_SECTOR_COORDINATOR_DEMOGRAPHICS_ID}`,
      },
      // {
      //   icon: <TabBarIcon name="chat" family="Entypo" />,
      //   title: t("HomePage.community"),
      //   route: "/(community)/community",
      // },
      {
        icon: <TabBarIcon name="settings" family="Ionicons" />,
        title: t("HomePage.settings"),
        route: "/(settings)/",
      },
    ];

    // Add Sector Coordinator Demographics for users with position 13
    // if (user?.position === 13) {
      // baseLinks.push({
      //   icon: <TabBarIcon name="account-group" family="MaterialCommunityIcons" />,
      //   title: t("HomePage.IZU_Sector_Coordinator_Demographics"),
      //   route: `/(projects)/(mods)/(projects)/${IZU_SECTOR_COORDINATOR_DEMOGRAPHICS_ID}`,
      // });
    // }

    // Add Village Demographics for users with position 7
    // if (user?.position === 7) {
    //   baseLinks.push({
    //     icon: <TabBarIcon name="account-group" family="MaterialCommunityIcons" />,
    //     title: t("HomePage.IZU_At_Village_Demographics"),
    //     route: `/(projects)/(mods)/(projects)/${IZU_AT_VILLAGE_DEMOGRAPHICS_ID}`,
    //   });
    // }

    // Add IZU Sector Telephone Supervision for users with position 13
    // if (user?.position === 14) {
    //   baseLinks.push({
    //     icon: <TabBarIcon name="phone" family="FontAwesome6" />,
    //     title: t("HomePage.IZU_Sector_Telephone_Supervision"),
    //     route: `/(projects)/(mods)/(projects)/${IZU_SECTOR_TELEPHONE_SUPERVISION_ID}`,
    //   });
    // }

    // Add IZU Cell Telephone Supervision for users with position 7 0791774091
    // if (user?.position === 13) {
      // baseLinks.push({
      //   icon: <TabBarIcon name="phone" family="FontAwesome6" />,
      //   title: t("HomePage.IZU_Cell_Telephone_Supervision"),
      //   route: `/(projects)/(mods)/(projects)/${IZU_CELL_TELEPHONE_SUPERVISION_ID}`,
      // });
    // }
    return baseLinks;
  };

  const activeLinks = getActiveLinks();

  useEffect(() => {
    // When data is loaded for the first time, hide the splash screen
    const hideSplash = async () => {
      if (isDataLoaded && !splashHidden) {
        try {
          await SplashScreen.hideAsync();
          setSplashHidden(true);
          console.log("App loaded - Home screen displayed with data");
        } catch (error) {
          console.error("Error hiding splash screen:", error);
        }
      }
    };

    hideSplash();
  }, [isDataLoaded, splashHidden]);

  // Check for unsynced data when the component mounts and when data is refreshed
  useEffect(() => {
    if (isDataLoaded && !isRefreshing) {
      (async () => {
        await checkUnsyncedData();
      })();
    }
  }, [isDataLoaded, isRefreshing, user?.id]);

  // On demand refresh when user pulls to refresh
  const onRefresh = React.useCallback(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handle navigation with PIN protection when needed
  const handleNavigation = (route: string) => {
    if (!isDataLoaded || isRefreshing) {
      Alert.alert(t("HomePage.wait"), t("HomePage.data_refreshing"), [
        { text: t("HomePage.ok"), style: "default" },
      ]);
      return;
    }
    navigateTo(route);
  };

  // Render list view for small screens
  const renderListView = () => (
    <View className="px-4">
      {activeLinks.map((link, index) => (
        <TouchableOpacity
          onPress={() => handleNavigation(link.route)}
          key={index}
          className={`flex flex-row items-center bg-[#A23A910D] border border-[#0000001A] mb-3 py-4 px-4 rounded-xl ${
            !isDataLoaded || isRefreshing ? "opacity-50" : ""
          }`}
          disabled={!isDataLoaded || isRefreshing}
        >
          <View className="mr-4">{link.icon}</View>
          <Text className="text-sm font-semibold text-gray-600 flex-1">
            {link.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render grid view for normal screens
  const renderGridView = () => (
    <View className="flex-row flex-wrap justify-between px-4">
      {activeLinks.map((link, index) => (
        <TouchableOpacity
          onPress={() => handleNavigation(link.route)}
          key={index}
          style={{ width: itemWidth }}
          className={`flex flex-col bg-[#A23A910D] border border-[#0000001A] items-center mb-4 py-6 rounded-xl ${
            !isDataLoaded || isRefreshing ? "opacity-50" : ""
          }`}
          disabled={!isDataLoaded || isRefreshing}
        >
          <>{link.icon}</>
          <Text className="text-sm font-semibold flex-1 w-full flex-row flex text-center text-gray-600 px-1 pt-4">
            {link.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Show loading screen when data is being loaded initially
  if (!isDataLoaded && !splashHidden) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#A23A91" />
        <Text className="mt-4 text-base text-gray-600">
          {t("HomePage.loading_data")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <HeaderNavigation
        showLeft={false}
        showRight={true}
        // showLogo={true}
        // logoSize={32}
      />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-6">
          <Text className="text-2xl font-bold">
            {t("HomePage.title") + user?.name}
          </Text>
          {/* <Text className="text-lg text-[#71717A]">
            {t("HomePage.description")}
          </Text> */}
        </View>
        {/* Show loading indicator if data is being refreshed */}
        {isRefreshing && (
          <View className="p-4">
            <Text className="text-center text-gray-500">
              {t("HomePage.loading_data")}
            </Text>
          </View>
        )}

        {/* Sync Warning */}
        {showSyncWarning && !isRefreshing && (
          <TouchableOpacity
            onPress={() => setShowSyncModal(true)}
            className="mx-4 mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200"
          >
            <Text className="text-yellow-800 font-medium">
              {t("HomePage.sync_warning")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Conditionally render list or grid view based on screen width */}
        {/* {isDataLoaded ? (
          isSmallScreen ? renderListView() : renderGridView()
        ) : (
          <View className="flex-1 justify-center items-center p-8">
            <ActivityIndicator size="large" color="#A23A91" />
            <Text className="text-center mt-4 text-gray-600">
              {t("HomePage.loading_data")}
            </Text>
          </View>
        )} */}

         {isDataLoaded ? renderGridView() : (
          <View className="flex-1 justify-center items-center p-8">
            <ActivityIndicator size="large" color="#A23A91" />
            <Text className="text-center mt-4 text-gray-600">
              {t("HomePage.loading_data")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Blur overlay when refreshing */}
      {isRefreshing && (
        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
      )}

      {/* Sync Warning Modal */}
      <AlertDialog open={showSyncModal} onOpenChange={setShowSyncModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("HomePage.sync_required")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("HomePage.sync_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onPress={() => {
                setShowSyncModal(false);
                navigateTo("/(settings)/sync");
              }}
            >
              <Text className="text-white">
                {t("HomePage.go_to_sync")}
              </Text>
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-gray-100"
              onPress={() => setShowSyncModal(false)}
            >
              <Text className="text-gray-900">
                {t("HomePage.cancel")}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
};

export default HomeScreen;