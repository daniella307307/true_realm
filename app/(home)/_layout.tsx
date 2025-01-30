import React from "react";
import { Stack } from "expo-router";
import Logo from "~/components/Logo";
import { Feather } from "@expo/vector-icons";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";

const HomeScreenLayout = () => {
  const { colorScheme } = useColorScheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="home"
        options={{
          headerShown: true,
          headerTitleAlign: "center",
          headerLeft: () => (
            <Feather
              name="menu"
              size={24}
              color={NAV_THEME[colorScheme ?? "light"].primary}
              style={{ marginLeft: 10 }}
            />
          ),
          headerTitle: () => <Logo horizontal size={32} />,
        }}
      />
    </Stack>
  );
};

export default HomeScreenLayout;
