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
  Animated,
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

function HomeScreen(): React.JSX.Element {
  const [splashHidden, setSplashHidden] = useState(false);
  const [showSyncWarning, setShowSyncWarning] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const { user } = useAuth({
    onLogout: () => {
      router.push("/(user-management)/login");
    },
  });
  
  const { getAll } = useSQLite();
  const { t } = useTranslation();
  const { navigateTo } = useProtectedNavigation();
  const { isDataLoaded, isRefreshing, refreshAllData, formsCount, submissionsCount } = useAppData();

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  const HOUSEHOLD_ENROLLMENT_ID = 5;
  const IZU_SECTOR_COORDINATOR_DEMOGRAPHICS_ID = 8;
  const IZU_AT_VILLAGE_DEMOGRAPHICS_ID = 6;
  const IZU_CELL_TELEPHONE_SUPERVISION_ID = 11;
  const IZU_SECTOR_TELEPHONE_SUPERVISION_ID = 12;
  const IZU_MONITORING_ID = 10;

  // Check for unsynced data
  const checkUnsyncedData = async () => {
    if (!user?.id) return;

    const unsyncedSubmissions = await getAll(
      'SurveySubmissions',
      'sync_status == false AND created_by_user_id == ?',
      [user.id]
    );
    const syncedSubmissions = await getAll(
      'SurveySubmissions',
      'sync_status == true AND created_by_user_id == ?',
      [user.id]
    );
    
    const unsyncedCount = unsyncedSubmissions.length;
    const syncedCount = syncedSubmissions.length;
    
    setUnsyncedCount(unsyncedCount);
    setSyncedCount(syncedCount);
    setShowSyncWarning(unsyncedCount > 0);
  };
  

  // Dynamic links based on user role
  const getActiveLinks = () => {
    const baseLinks = [
      {
        icon: <TabBarIcon name="project" family="Octicons" />,
        title: t("HomePage.projects"),
        route: "/(projects)/project",
        color: "bg-blue-50",
        borderColor: "border-blue-200",
        iconColor: "#00227c",
      },
      {
        icon: <TabBarIcon name="calendar-month" family="MaterialCommunityIcons" />,
        title: t("HomePage.history"),
        route: "/(history)/realmDbViewer",
        color: "bg-orange-50",
        borderColor: "border-orange-200",
        iconColor: "#ec7414",
      },
      {
        icon: <TabBarIcon name="settings" family="Ionicons" />,
        title: t("HomePage.settings"),
        route: "/(settings)/",
        color: "bg-blue-50",
        borderColor: "border-blue-200",
        iconColor: "#001a5e",
      },
    ];

    return baseLinks;
  };

  const activeLinks = getActiveLinks();

  useEffect(() => {
    const hideSplash = async () => {
      if (isDataLoaded && !splashHidden) {
        try {
          await SplashScreen.hideAsync();
          setSplashHidden(true);
          
          // Fade in animation
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
          
          console.log("App loaded - Home screen displayed with data");
        } catch (error) {
          console.error("Error hiding splash screen:", error);
        }
      }
    };

    hideSplash();
  }, [isDataLoaded, splashHidden]);

  useEffect(() => {
    if (isDataLoaded && !isRefreshing) {
      (async () => {
        await checkUnsyncedData();
      })();
    }
  }, [isDataLoaded, isRefreshing, user?.id]);

  const onRefresh = React.useCallback(() => {
    refreshAllData();
  }, [refreshAllData]);

  const handleNavigation = (route: string) => {
    if (!isDataLoaded || isRefreshing) {
      Alert.alert(t("HomePage.wait"), t("HomePage.data_refreshing"), [
        { text: t("HomePage.ok"), style: "default" },
      ]);
      return;
    }
    navigateTo(route);
  };

  // Calculate sync percentage
  const totalSubmissions = syncedCount + unsyncedCount;
  const syncPercentage = totalSubmissions > 0 
    ? Math.round((syncedCount / totalSubmissions) * 100) 
    : 0;

  // Show loading screen when data is being loaded initially
  if (!isDataLoaded && !splashHidden) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#00227c" />
        <Text className="mt-4 text-base text-gray-600">
          {t("HomePage.loading_data")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation showLeft={false} showRight={true} />
      
      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            tintColor="#00227c"
            colors={["#00227c", "#ec7414"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Welcome Section */}
          <View className="px-6 pt-4 pb-6">
            <Text className="text-3xl font-bold text-gray-900">
              {t("HomePage.title")} {user?.firstName}!
            </Text>
          </View>

          {/* Sync Warning Banner */}
          {showSyncWarning && !isRefreshing && (
            <TouchableOpacity
              onPress={() => setShowSyncModal(true)}
              className="mx-6 mb-6 p-4 bg-orange-50 rounded-2xl border-2 border-orange-200 flex-row items-center"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-orange-500 rounded-full items-center justify-center mr-3">
                <TabBarIcon name="cloud-upload" family="Ionicons" color="white" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-orange-900 font-bold text-base">
                  {unsyncedCount} {t("History.pending")}
                </Text>
                <Text className="text-orange-700 text-sm">
                  {t("HomePage.tap_to_sync")}
                </Text>
              </View>
              <TabBarIcon name="chevron-right" family="Entypo" color="#ea580c" size={20} />
            </TouchableOpacity>
          )}

          {/* Stats Overview */}
          {isDataLoaded && !isRefreshing && (
            <View className="px-6 mb-6">
              {/* Primary Stats Row */}
              <View className="flex-row gap-3 mb-3">
                <TouchableOpacity
                  onPress={() => handleNavigation("/(projects)/project")}
                  className="flex-1 bg-primary/10 p-5 rounded-2xl border border-blue-200 shadow-sm"
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="w-12 h-12 bg-primary/20 rounded-xl items-center justify-center">
                      <TabBarIcon name="file-document-multiple" family="MaterialCommunityIcons" color="white" size={22} />
                    </View>
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                      <Text className="text-gray-600  text-xs font-semibold">
                        {t("HomePage.active_forms")}
                      </Text>
                    </View>
                  </View>
                 
                  <Text className="text-gray-600 text-4xl text-center font-bold">
                    {formsCount}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleNavigation("/(history)/realmDbViewer")}
                  className="flex-1 bg-orange-200/10 p-5 rounded-2xl border border-orange-200 shadow-sm"
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="w-12 h-12 bg-orange-200/30 rounded-xl items-center justify-center">
                      <TabBarIcon name="chart-bar" family="MaterialCommunityIcons" color="white" size={24} />
                    </View>
                    <View className="bg-white/20 px-3 py-1 rounded-full">
                      <Text className="text-gray-600 text-xs font-semibold">
                        {t("HistoryPage.title")}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-600 text-4xl text-center font-bold">
                    {submissionsCount}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sync Status Card */}
              <View className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <View className="flex-1 justify-between  gap-y-4 mb-4">
                  <View>
                    <Text className="text-gray-900 text-lg font-bold">
                      {t("HomePage.sync_status")}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {syncPercentage}% {t("History.synced")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleNavigation("/(settings)/sync")}
                    className="bg-blue-50 px-4 py-2 rounded-xl flex-row items-center"
                    activeOpacity={0.7}
                  >
                    <TabBarIcon name="sync" family="MaterialCommunityIcons" color="#00227c" size={16} />
                    <Text className="text-[#00227c] font-semibold ml-2 text-sm">
                      {t("HomePage.sync_now")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Progress Bar */}
                <View className="bg-gray-100 h-3 rounded-full overflow-hidden mb-4">
                  <View 
                    className="bg-gradient-to-r from-[#00227c] to-[#001a5e] h-full rounded-full"
                    style={{ width: `${syncPercentage}%` }}
                  />
                </View>

                {/* Sync Details */}
                <View className="flex-row justify-between">
                  <View className="flex-1 flex-row items-center">
                    <View className="w-8 h-8 bg-green-100 rounded-lg items-center justify-center mr-2">
                      <TabBarIcon name="check-circle" family="MaterialCommunityIcons" color="#16a34a" size={16} />
                    </View>
                    <View>
                      <Text className="text-gray-500 text-xs">
                        {t("HomePage.synced")}
                      </Text>
                      <Text className="text-gray-900 font-bold text-base">
                        {syncedCount}
                      </Text>
                    </View>
                  </View>

                  <View className="w-px bg-gray-200 mx-3" />

                  <View className="flex-1 flex-row items-center">
                    <View className="w-8 h-8 bg-orange-100 rounded-lg items-center justify-center mr-2">
                      <TabBarIcon name="clock-outline" family="MaterialCommunityIcons" color="#ea580c" size={16} />
                    </View>
                    <View>
                      <Text className="text-gray-500 text-xs">
                        {t("History.pending")}
                      </Text>
                      <Text className="text-gray-900 font-bold text-base">
                        {unsyncedCount}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View className="px-6 mb-6">
            <Text className="text-gray-900 text-xl font-bold mb-4">
              {t("HomePage.quick_actions")}
            </Text>
            
            <View className="gap-3">
              {activeLinks.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleNavigation(link.route)}
                  className={`flex-row items-center justify-between ${link.color} p-4 rounded-2xl border ${link.borderColor} ${
                    !isDataLoaded || isRefreshing ? "opacity-50" : ""
                  }`}
                  disabled={!isDataLoaded || isRefreshing}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1">
                    <View 
                      className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                      style={{ backgroundColor: link.iconColor + '15' }}
                    >
                      {React.cloneElement(link.icon, { 
                        color: link.iconColor,
                        size: 24 
                      })}
                    </View>
                    <Text className="text-gray-900 text-base font-semibold flex-1">
                      {link.title}
                    </Text>
                  </View>
                  <TabBarIcon name="chevron-right" family="Entypo" color="#9ca3af" size={20} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Loading State */}
          {!isDataLoaded && (
            <View className="flex-1 justify-center items-center p-8">
              <ActivityIndicator size="large" color="#00227c" />
              <Text className="text-center mt-4 text-gray-600">
                {t("HomePage.loading_data")}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
      {/* Sync Warning Modal */}
      <AlertDialog open={showSyncModal} onOpenChange={setShowSyncModal}>
        <AlertDialogContent className="bg-white rounded-2xl">
          <AlertDialogHeader>
            <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4 self-center">
              <TabBarIcon name="cloud-upload" family="Ionicons" color="#ea580c" size={32} />
            </View>
            <AlertDialogTitle className="text-center text-xl">
              {t("HomePage.sync_required")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-600">
              {t("HomePage.sync_description") || 
                `You have ${unsyncedCount} unsynced submissions. Sync now to backup your data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogAction
              onPress={() => {
                setShowSyncModal(false);
                navigateTo("/(settings)/sync");
              }}
              className="bg-[#00227c] w-full py-4 rounded-xl"
            >
              <Text className="text-white font-semibold">
                {t("HomePage.sync_now")}
              </Text>
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-gray-100 w-full py-4 rounded-xl"
              onPress={() => setShowSyncModal(false)}
            >
              <Text className="text-blue-900 font-semibold">
                {t("HomePage.cancel")}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}

export default HomeScreen;