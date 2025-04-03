import React from "react";
import { Stack } from "expo-router";
import Logo from "~/components/Logo";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";

const HistoryPageLayout = () => {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="history"
        options={{
          headerShown: true,
          title: t("HistoryProjectPage.title"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
    </Stack>
  );
};

export default HistoryPageLayout;
