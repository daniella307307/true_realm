import React from "react";
import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

const ModuleLayout = () => {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="forms"
        options={{
          headerShown: true,
          title: t("FormPage.title"),
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                router.back();
              }}
            >
              <ChevronLeft color={"#A23A91"} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
};

export default ModuleLayout;
