import React from "react";
import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

const AuthLayout = () => {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: t("Login.title"),
          headerShown: true,
          headerTitleAlign: "center",
          contentStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => { router.back(); }}>
              <ChevronLeft color={"#A23A91"} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: t("Login.forgotPassword"),
          headerShown: true,
          contentStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => { router.back(); }}>
              <ChevronLeft color={"#A23A91"} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="password-verification-sent"
        options={{
          title: t("Password Verification"), // Add the respective translation key here
          headerShown: true,
          contentStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => { router.back(); }}>
              <ChevronLeft color={"#A23A91"} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
};

export default AuthLayout;
