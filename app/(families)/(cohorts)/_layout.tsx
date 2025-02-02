import React from "react";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";

const CohortIndexLayout = () => {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: t("CohortPage.assigned_Family"),
        headerTitleAlign: "center",
        headerLeft: () => <HeaderNavigation showLeft={true} />,
        headerRight: () => <HeaderNavigation showLeft={false} />,
      }}
    >
      <Stack.Screen
        name="[cohortId]"
        options={{
          headerShown: true,
        }}
      />
    </Stack>
  );
};

export default CohortIndexLayout;
