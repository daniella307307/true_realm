// _layout.tsx
import "~/global.css";
import { router, Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "~/lib/hooks/useAuth";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SplashScreenProvider } from "~/providers/SplashScreenProvider";
import "~/utils/i18n";
import 'react-native-get-random-values';
import { useEffect } from "react";
import QueryProvider from "~/providers/QueryProvider";
import Toast from "react-native-toast-message";
import toastConfig from "~/providers/toastConfig";
import { enableScreens } from "react-native-screens";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "~/components/ui/custom-drawer";
import { FontSizeProvider } from "~/providers/FontSizeContext";
import { PaperProvider } from "react-native-paper";
import React from "react";
import { RealmProvider } from "@realm/react";
import { Families } from "~/models/family/families";
import * as FileSystem from "expo-file-system";
import { Module } from "~/models/modules/module";
import { Project } from "~/models/projects/project";
import { Survey } from "~/models/surveys/survey";
import { SurveySubmission } from "~/models/surveys/survey-submission";

enableScreens();
export default function RootLayout() {
  const realmPath = `${FileSystem.documentDirectory}/sugiramuryango-offline-db.realm`;

  Appearance.setColorScheme("light");
  return (
    <FontSizeProvider>
      <QueryProvider>
        <PaperProvider>
          <SplashScreenProvider>
            <RealmProvider schema={[Families, Module, Project, Survey, SurveySubmission]} path={realmPath}>
              <Layout />
            </RealmProvider>
          </SplashScreenProvider>
        </PaperProvider>
        <Toast config={toastConfig} />
      </QueryProvider>
    </FontSizeProvider>
  );
}

function Layout() {
  const { isLoggedIn } = useAuth({});
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        SplashScreen.hideAsync();
        const loginStatus = await isLoggedIn;
        console.log("Is Logged In:", loginStatus);
        if (loginStatus) {
          router.push("/(home)/home");
        } else {
          router.push("/(user-management)/login");
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        router.push("/(user-management)/login");
      }
    };

    checkLoginStatus();
  }, [isLoggedIn]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Drawer
        screenOptions={{
          drawerPosition: "right",
          headerShown: false,
          drawerStyle: {
            width: "70%",
          },
          drawerType: "front",
        }}
        drawerContent={() => <CustomDrawerContent />}
      >
        <Slot />
      </Drawer>
      <PortalHost />
    </GestureHandlerRootView>
  );
}
