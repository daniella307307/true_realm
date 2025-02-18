import React from "react";
import { router, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";

const FormsLayout = () => {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="form-izu"
        options={{
          headerShown: true,
          title: t("FormPage.title"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation backFunction={() => router.push('/(izu-monitoring)/izu-monitoring')} showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
      <Stack.Screen
        name="[modId]"
        options={{
          headerShown: true,
          title: t("FormPage.title"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
    </Stack>
  );
};

export default FormsLayout;
