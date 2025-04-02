import React from "react";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";

const FamilyModuleLayout = () => {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="[familyId]"
        options={{
          headerShown: true,
          title: t("ModulePage.title"),
          headerTitleAlign: "center",
          headerLeft: () => (
            <HeaderNavigation
              showLeft={true}
            />
          ),
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
    </Stack>
  );
};

export default FamilyModuleLayout;
