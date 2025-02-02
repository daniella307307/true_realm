import React from "react";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";

const SettingsLayout = () => {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: t("Settings"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          headerShown: true,
          title: t("Settings"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
      <Stack.Screen
        name="language"
        options={{
          headerShown: true,
          title: t("Change Language"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
      <Stack.Screen
        name="fontsize"
        options={{
          headerShown: true,
          title: t("Change Font Size"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
    </Stack>
  );
};

export default SettingsLayout;
