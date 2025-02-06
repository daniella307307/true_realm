import React from "react";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";

const StatisticsLayout = () => {
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
          title: t("StatisticsPage.statistics"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
      <Stack.Screen
        name="statistics"
        options={{
          headerShown: true,
          title: t("StatisticsPage.statistics"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
    </Stack>
  );
};

export default StatisticsLayout;
