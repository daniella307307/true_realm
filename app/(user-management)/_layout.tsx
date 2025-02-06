import React from "react";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";

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
          headerLeft: () => <HeaderNavigation showLeft={true} />,
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
          headerLeft: () => <HeaderNavigation showLeft={true} />,
        }}
      />
      <Stack.Screen
        name="password-verification-sent"
        options={{
          title: t("PasswordVerification.title"),
          headerShown: true,
          contentStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => <HeaderNavigation showLeft={true} />,
        }}
      />
    </Stack>
  );
};

export default AuthLayout;
