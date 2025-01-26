import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import Logo from "~/components/Logo";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";

const TabLayout = () => {
  const { colorScheme } = useColorScheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: NAV_THEME[colorScheme ?? "light"].primary,
        headerShown: true,
        headerLeft: () => (
          <Feather
            name="menu"
            size={24}
            color={NAV_THEME[colorScheme ?? "light"].primary}
            style={{ marginLeft: 10 }}
          />
        ),
        headerTitle: () => (
          <Logo horizontal size={32}/>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Statistics",
          tabBarIcon: ({ color, focused }) => {
            return (
              <View
                className={`flex items-center h-full justify-center flex-col ${
                  focused ? "border-t-2 border-primary" : "bg-transparent"
                }`}
              >
                <TabBarIcon
                  name={focused ? "stats-chart" : "stats-chart-outline"}
                  color={focused ? NAV_THEME.light.primary : color}
                  family="Ionicons"
                  size={focused ? 24 : 24}
                />
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="families"
        options={{
          title: "Families",
          tabBarIcon: ({ color, focused }) => {
            return (
              <View
                className={`flex items-center h-full justify-center flex-col ${
                  focused ? "border-t-2 border-primary" : "bg-transparent"
                }`}
              >
                <TabBarIcon
                  name={focused ? "people-sharp" : "people-outline"}
                  family="Ionicons"
                  color={focused ? NAV_THEME.light.primary : color}
                  size={focused ? 24 : 24}
                />
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "My History",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`flex items-center h-full justify-center flex-col ${
                focused ? "border-t-2 border-primary" : "bg-transparent"
              }`}
            >
              <TabBarIcon
                name={focused ? "history" : "history-toggle-off"}
                family="MaterialIcons"
                color={focused ? NAV_THEME.light.primary : color}
                size={focused ? 24 : 24}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="izu-monitoring"
        options={{
          title: "IZUs Monitoring",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`flex items-center h-full justify-center flex-col ${
                focused ? "border-t-2 border-primary" : "bg-transparent"
              }`}
            >
              <TabBarIcon
                name={focused ? "monitor-dashboard" : "monitor-dashboard"}
                family="MaterialCommunityIcons"
                color={focused ? NAV_THEME.light.primary : color}
                size={focused ? 24 : 24}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`flex items-center h-full justify-center flex-col ${
                focused ? "border-t-2 border-primary" : "bg-transparent"
              }`}
            >
              <TabBarIcon
                name={focused ? "chatbubbles-sharp" : "chatbubbles-outline"}
                family="Ionicons"
                color={focused ? NAV_THEME.light.primary : color}
                size={focused ? 24 : 24}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
