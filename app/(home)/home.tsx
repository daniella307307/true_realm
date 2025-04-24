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
import HeaderNavigation from "~/components/ui/header";
import i18n from "~/utils/i18n";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { useAuth } from "~/lib/hooks/useAuth";
import { useGetAllProjects } from "~/services/project";
import { useGetFamilies } from "~/services/families";
import { useGetForms } from "~/services/formElements";
import { useGetIzus } from "~/services/izus";
import { useGetPosts } from "~/services/posts";
import { useGetStakeholders } from "~/services/stakeholders";
import { useTranslation } from "react-i18next";
import { useProtectedNavigation } from "~/utils/navigation";
import { router } from "expo-router";

const HomeScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { user, logout } = useAuth({
    onLogout: () => {
      router.push("/(user-management)/login");
    },
  });
  const { t } = useTranslation();
  const { navigateTo } = useProtectedNavigation();

  // Data fetching hooks
  const { refresh: refreshProjects } = useGetAllProjects(true);
  const { refresh: refreshFamilies } = useGetFamilies(true);
  const { refresh: refreshForms } = useGetForms(true);
  const { refresh: refreshIzus } = useGetIzus(true);
  const { refresh: refreshPosts } = useGetPosts(true);
  const { refresh: refreshStakeholders } = useGetStakeholders(true);

  // Get the screen width dynamically
  const { width } = useWindowDimensions();

  // Check if the screen width is less than 375px for list view
  const isSmallScreen = width < 375;

  // Calculate item width for grid view (only used when width >= 375)
  const itemWidth = (width - 48) / 2; // 2 columns for normal phones with padding

  const activeLinks = [
    {
      icon: <TabBarIcon name="family-restroom" family="MaterialIcons" />,
      title: t("HomePage.families"),
      route: "/(families)/",
    },
    {
      icon: (
        <TabBarIcon name="calendar-month" family="MaterialCommunityIcons" />
      ),
      title: t("HomePage.history"),
      route: "/(history)/history",
    },
    {
      icon: <TabBarIcon name="chart-simple" family="FontAwesome6" />,
      title: t("HomePage.statistics"),
      route: "/(statistics)/",
    },
    {
      icon: <TabBarIcon name="account-star" family="MaterialCommunityIcons" />,
      title: t("HomePage.IZU_Monitoring"),
      route: "/(izu-monitoring)/izu-monitoring",
    },
    {
      icon: <TabBarIcon name="video" family="Entypo" />,
      title: t("HomePage.videos"),
      route: "/(videos)/video",
    },
    {
      icon: <TabBarIcon name="settings" family="Ionicons" />,
      title: t("HomePage.settings"),
      route: "/(settings)/",
    },
    {
      icon: <TabBarIcon name="project" family="Octicons" />,
      title: t("HomePage.projects"),
      route: "/(projects)/project",
    },
    {
      icon: <TabBarIcon name="phone" family="FontAwesome6" />,
      title: t("HomePage.Izu_telephone_Supervision"),
      route: "/(home)/home",
    },
    {
      icon: <TabBarIcon name="chat" family="Entypo" />,
      title: t("HomePage.community"),
      route: "/(community)/community",
    },
  ];

  const refreshAllData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        refreshProjects(),
        refreshFamilies(),
        refreshForms(),
        refreshIzus(),
        refreshPosts(),
        refreshStakeholders(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setIsInitialLoad(false);
      console.log("Data refreshed");
    }
  }, [
    refreshProjects,
    refreshFamilies,
    refreshForms,
    refreshIzus,
    refreshPosts,
    refreshStakeholders,
  ]);

  useEffect(() => {
    if (isInitialLoad) {
      refreshAllData();
    }
  }, [isInitialLoad, refreshAllData]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refreshAllData();
  }, [refreshAllData]);

  // Handle navigation with PIN protection when needed
  const handleNavigation = (route: string) => {
    if (isLoading || refreshing) {
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
            isLoading || refreshing ? "opacity-50" : ""
          }`}
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
            isLoading || refreshing ? "opacity-50" : ""
          }`}
        >
          <>{link.icon}</>
          <Text className="text-sm font-semibold text-gray-600 px-1 pt-4">
            {link.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {isLoading || refreshing ? (
        <ActivityIndicator size="large" color="#A23A91" />
      ) : (
        <>
          <HeaderNavigation
            showLeft={false}
            showRight={true}
            showLogo={true}
            logoSize={32}
          />
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View className="p-6">
              <Text className="text-2xl font-bold">
                {t("HomePage.title") + user?.name}
              </Text>
              <Text className="text-lg text-[#71717A]">
                {t("HomePage.description")}
              </Text>
            </View>

            {/* Show loading indicator if data is being loaded */}
            {(isLoading || refreshing) && (
              <View className="p-4">
                <Text className="text-center text-gray-500">
                  {t("Loading data...")}
                </Text>
              </View>
            )}

            {/* Conditionally render list or grid view based on screen width */}
            {isSmallScreen ? renderListView() : renderGridView()}
          </ScrollView>

          {/* Blur overlay when refreshing or loading */}
          {(isLoading || refreshing) && (
            <BlurView
              intensity={50}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;
