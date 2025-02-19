import React from "react";
import { Stack } from "expo-router";
import Logo from "~/components/Logo";
import HeaderNavigation from "~/components/ui/header";

const HomeScreenLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="home"
        options={{
          headerShown: true,
          headerTitleAlign: "center",
          headerRight: () => (
            <HeaderNavigation showLeft={false} />
          ),
          headerTitle: () => <Logo horizontal size={32} />,
        }}
      />
    </Stack>
  );
};

export default HomeScreenLayout;
