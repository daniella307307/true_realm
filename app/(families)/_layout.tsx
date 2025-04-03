import React from "react";
import { router, Stack } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "~/components/ui/text";
import HeaderNavigation from "~/components/ui/header";

const FamilyFormsLayout = () => {
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
          title: t("ModulePage.title"),
          headerTitleAlign: "center",
          headerLeft: () => <HeaderNavigation showLeft={true} />,
          headerRight: () => <HeaderNavigation showLeft={false} />,
        }}
      />
    </Stack>
  );
};

export default FamilyFormsLayout;
