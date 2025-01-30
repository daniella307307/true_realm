import { View, Text, SafeAreaView, Pressable } from "react-native";
import React from "react";
import { useAuth } from "~/lib/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Href, router } from "expo-router";

const HomeScreen = () => {
  const { user, logout } = useAuth({
    onLogout: () => {
      router.push("/(user-management)/login");
    }
  });
  const { t } = useTranslation();

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
      route: "/(home)/",
    },
    {
      icon: <TabBarIcon name="account-star" family="MaterialCommunityIcons" />,
      title: t("HomePage.IZU_Monitoring"),
      route: "/(izu-monitoring)/izu-monitoring",
    },
    {
      icon: <TabBarIcon name="video" family="Entypo" />,
      title: t("HomePage.videos"),
      route: "/(home)/home",
    },
    {
      icon: <TabBarIcon name="settings" family="Ionicons" />,
      title: t("HomePage.settings"),
      route: "/(settings)/",
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
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-6">
        <Text className="text-2xl font-bold">
          {t("HomePage.title") + user?.name}
        </Text>
        <Text className="text-lg text-[#71717A]">
          {t("HomePage.description")}
        </Text>
      </View>
      <View className="flex-row flex-wrap justify-between px-6">
        {activeLinks.map((link, index) => (
          <Pressable
            onPress={() => {
              router.push(link.route as Href);
            }}
            key={index}
            className="flex flex-col bg-[#A23A910D] border border-[#0000001A]  items-center gap-6 py-6 rounded-xl w-[48%] mb-4"
          >
            {link.icon}
            <Text className="text-sm">{link.title}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
