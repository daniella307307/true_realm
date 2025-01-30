import React from "react";
import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

const CohortIndexLayout = () => {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: {
          borderWidth: 0,
          borderEndEndRadius: 0,
          borderEndWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          borderBottomWidth: 0,
        },
        title: t("CohortPage.assigned_Family"),
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
