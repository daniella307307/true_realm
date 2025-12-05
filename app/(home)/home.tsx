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
  Dimensions,
} from "react-native";
import { SplashScreen } from "expo-router";
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
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "~/constants/colors";
import type { ColorValue } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  

 
  const getActiveLinks = () => {
    const baseLinks = [
      {
        icon: <TabBarIcon name="file-document-multiple" family="MaterialCommunityIcons" />,
        title: t("HomePage.projects"),
       
        route: "/(projects)/project",
        color: COLORS.primary.blue[500],
        gradient: [COLORS.primary.blue[500], COLORS.primary.blue[600]] as [ColorValue, ColorValue],
      },
      {
        icon: <TabBarIcon name="chart-bar" family="MaterialCommunityIcons" />,
        title: t("HomePage.history"),
        
        route: "/(history)/realmDbViewer",
        color: COLORS.primary.orange[500],
        gradient: [COLORS.primary.orange[500], COLORS.primary.orange[600]] as [ColorValue, ColorValue],
      },
      {
        icon: <TabBarIcon name="sync" family="MaterialCommunityIcons" />,
        title:t("HomePage.synced"),
        
        route: "/(settings)/sync",
        color: COLORS.semantic.info,
        gradient: [COLORS.semantic.info, '#2563EB'] as [ColorValue, ColorValue],
      },
      {
        icon: <TabBarIcon name="settings" family="Ionicons" />,
        title: t("HomePage.settings"),
      
        route: "/(settings)/",
        color: COLORS.neutral.gray[600],
        gradient: [COLORS.neutral.gray[600], COLORS.neutral.gray[700]] as [ColorValue, ColorValue],
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


  const totalSubmissions = syncedCount + unsyncedCount;
  const syncPercentage = totalSubmissions > 0 
    ? Math.round((syncedCount / totalSubmissions) * 100) 
    : 0;

  
  if (!isDataLoaded && !splashHidden) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary.blue[500]} />
        <Text className="mt-4 text-base text-gray-600">
          {t("HomePage.loading_data")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
 
      <View className="px-5 pt-12 pb-4 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          
          <View className="flex-row items-center">
           
            <View className="w-10 h-10 bg-blue-600 rounded-lg items-center justify-center mr-3">
              <Text className="text-white font-bold text-lg">A</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">Afriquollect</Text>
          </View>

        
          <View className="flex-row items-center">
            <TouchableOpacity className="mr-4 p-2">
              <TabBarIcon 
                name="menu" 
                family="Ionicons" 
                color={COLORS.neutral.gray[700]} 
                size={24} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleNavigation("/(settings)/")}
              className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center"
            >
              <Text className="text-blue-600 font-semibold text-sm">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        
      </View>
      
      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary.blue[500]}
            colors={[COLORS.primary.blue[500], COLORS.primary.orange[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Sync Warning Banner */}
          {showSyncWarning && !isRefreshing && (
            <TouchableOpacity
              onPress={() => setShowSyncModal(true)}
              className="mx-5 mt-5 mb-4 p-4 bg-orange-50 rounded-xl border border-orange-200"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                  <TabBarIcon 
                    name="cloud-upload" 
                    family="Ionicons" 
                    color={COLORS.primary.orange[500]} 
                    size={20} 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-orange-900 font-semibold text-sm">
                    {unsyncedCount} {t("History.pending")}
                  </Text>
                  <Text className="text-orange-700 text-xs mt-1">
                    {t("HomePage.tap_to_sync")}
                  </Text>
                </View>
                <TabBarIcon 
                  name="chevron-right" 
                  family="Entypo" 
                  color={COLORS.primary.orange[500]} 
                  size={16} 
                />
              </View>
            </TouchableOpacity>
          )}

          
          <View className="px-5 mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Dashboard overview
            </Text>

            {/* Stats Cards Row */}
            <View className="flex-row gap-4 mb-6">
              {/* Forms Card */}
              <TouchableOpacity
                onPress={() => handleNavigation("/(projects)/project")}
                className="flex-1 bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center">
                    <TabBarIcon 
                      name="file-document-multiple" 
                      family="MaterialCommunityIcons" 
                      color={COLORS.primary.blue[500]} 
                      size={24} 
                    />
                  </View>
                  <Text className="text-gray-400 text-sm font-medium">
                    {t("HomePage.active_forms")} 
                  </Text>
                </View>
                <Text className="text-3xl font-bold text-gray-900 mb-1">
                  {formsCount}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {t("HomePage.active_forms")}
                </Text>
              </TouchableOpacity>

              {/* Submissions Card */}
              <TouchableOpacity
                onPress={() => handleNavigation("/(history)/realmDbViewer")}
                className="flex-1 bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between mb-4">
                  <View className="w-12 h-12 bg-orange-100 rounded-lg items-center justify-center">
                    <TabBarIcon 
                      name="chart-bar" 
                      family="MaterialCommunityIcons" 
                      color={COLORS.primary.orange[500]} 
                      size={24} 
                    />
                  </View>
                  <Text className="text-gray-400 text-sm font-medium">
                    {t("HomePage.history")} 
                  </Text>
                </View>
                <Text className="text-3xl font-bold text-gray-900 mb-1">
                  {submissionsCount}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {t("HistoryPage.title")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sync Progress Card */}
            <View className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
             
              <View className="flex-row justify-between items-start mb-6">
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-lg">
                    {t("HomePage.sync_status")} 
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    {syncPercentage}% {t("History.synced")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleNavigation("/(settings)/sync")}
                  className="flex-row items-center bg-blue-50 px-4 py-2 rounded-lg ml-4"
                  activeOpacity={0.7}
                >
                  <TabBarIcon 
                    name="sync" 
                    family="MaterialCommunityIcons" 
                    color={COLORS.primary.blue[500]} 
                    size={16} 
                  />
                  <Text className="text-blue-600 font-semibold ml-2 text-sm">
                    {t("HomePage.sync_now")} 
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View className="relative mb-8">
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <LinearGradient
                    colors={[COLORS.primary.blue[500], COLORS.primary.blue[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="h-full rounded-full"
                    style={{ width: `${syncPercentage}%` }}
                  />
                </View>
              </View>

              {/* Stats Row */}
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
                    <TabBarIcon 
                      name="check-circle" 
                      family="MaterialCommunityIcons" 
                      color="#16a34a" 
                      size={20} 
                    />
                  </View>
                  <View>
                    <Text className="text-gray-500 text-xs">
                      {t("HomePage.synced")}
                    </Text>
                    <Text className="text-gray-900 font-bold text-xl">
                      {syncedCount}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <View className="mr-3">
                    <Text className="text-gray-500 text-xs text-right">
                      {t("History.pending")} {/* This will show "Pending" in English, "Nitbirahuzwa" in Kinyarwanda */}
                    </Text>
                    <Text className="text-gray-900 font-bold text-xl text-right">
                      {unsyncedCount}
                    </Text>
                  </View>
                  <View className="w-10 h-10 bg-orange-100 rounded-lg items-center justify-center">
                    <TabBarIcon 
                      name="clock-outline" 
                      family="MaterialCommunityIcons" 
                      color="#ea580c" 
                      size={20} 
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="px-5 mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-5">
              {t("HomePage.quick_actions")} 
            </Text>
            
            <View className="flex-row flex-wrap justify-between" style={{ gap: 16 }}>
              {activeLinks.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleNavigation(link.route)}
                  className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
                  style={{ 
                    width: (SCREEN_WIDTH - 56) / 2 - 8,
                    minHeight: 140
                  }}
                  disabled={!isDataLoaded || isRefreshing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={link.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="w-12 h-12 rounded-xl items-center justify-center mb-4"
                  >
                    {React.cloneElement(link.icon, { 
                      color: "white",
                      size: 24 
                    })}
                  </LinearGradient>
                  <Text className="text-gray-900 font-bold text-base mb-1">
                    {link.title}
                  </Text>
                  {/* <Text className="text-gray-500 text-xs">
                    {link.subtitle}
                  </Text> */}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* App Info Footer */}
          <View className="px-5 mb-8">
            <View className="bg-blue-50 rounded-xl p-6">
              <View className="flex-row items-center">
                <View className="w-14 h-14 bg-white rounded-full items-center justify-center shadow-sm mr-4">
                  <TabBarIcon 
                    name="chart-line" 
                    family="MaterialCommunityIcons" 
                    color={COLORS.primary.blue[500]} 
                    size={28} 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-lg">
                    Afriquollect
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    © 2025 All rights reserved.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Loading State */}
          {!isDataLoaded && (
            <View className="flex-1 justify-center items-center p-8">
              <ActivityIndicator size="large" color={COLORS.primary.blue[500]} />
              <Text className="text-center mt-4 text-gray-600">
                {t("HomePage.loading_data")}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Sync Modal - Using translations */}
      <AlertDialog open={showSyncModal} onOpenChange={setShowSyncModal}>
        <AlertDialogContent className="bg-white rounded-xl mx-5 max-w-md">
          <AlertDialogHeader>
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center">
                <TabBarIcon 
                  name="cloud-upload" 
                  family="Ionicons" 
                  color={COLORS.primary.orange[500]} 
                  size={32} 
                />
              </View>
            </View>
            <AlertDialogTitle className="text-center text-lg font-bold text-gray-900">
              {t("HomePage.sync_required")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-600 text-sm">
              {t("HomePage.sync_description") || 
                `You have ${unsyncedCount} unsynced submissions. Sync now to backup your data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 mt-4">
            <AlertDialogAction
              onPress={() => {
                setShowSyncModal(false);
                navigateTo("/(settings)/sync");
              }}
              className="bg-[#00227c] text-white w-full py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">
                {t("HomePage.sync_now")}
              </Text>
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-gray-100 w-full py-3 rounded-lg"
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