import {
  View,
  SafeAreaView,
  Pressable,
  useWindowDimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React from "react";
import { useAuth } from "~/lib/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Href, router } from "expo-router";
import { Text } from "~/components/ui/text";
import i18n from "~/utils/i18n";
import { isOnline } from "~/services/network";

const HomeScreen = () => {

  console.log("Is ONLINE: ", isOnline());
  const { user, logout } = useAuth({
    onLogout: () => {
      router.push("/(user-management)/login");
    },
  });
  const { t } = useTranslation();

  // Get the screen width dynamically
  const { width } = useWindowDimensions();

  // Check if the screen width is less than 375px for list view
  const isSmallScreen = width < 375;

  // Calculate item width for grid view (only used when width >= 375)
  const itemWidth = (width - 48) / 2; // 2 columns for normal phones with padding

  console.log("The language: ", i18n.language);
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

  // Render list view for small screens
  const renderListView = () => (
    <View className="px-4">
      {activeLinks.map((link, index) => (
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: "/(page-auth)/pin-auth",
              params: { next: link.route },
            });
          }}
          key={index}
          className="flex flex-row items-center bg-[#A23A910D] border border-[#0000001A] mb-3 py-4 px-4 rounded-xl"
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
          onPress={() => {
            router.push({
              pathname: "/(page-auth)/pin-auth",
              params: { next: link.route },
            });
          }}
          key={index}
          style={{ width: itemWidth }}
          className="flex flex-col bg-[#A23A910D] border border-[#0000001A] items-center mb-4 py-6 rounded-xl"
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView>
        <View className="p-6">
          <Text className="text-2xl font-bold">
            {t("HomePage.title") + user?.name}
          </Text>
          <Text className="text-lg text-[#71717A]">
            {t("HomePage.description")}
          </Text>
        </View>
        
        {/* Conditionally render list or grid view based on screen width */}
        {isSmallScreen ? renderListView() : renderGridView()}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;