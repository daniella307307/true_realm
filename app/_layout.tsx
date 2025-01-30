import "~/global.css";
import { router, Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "~/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "~/lib/hooks/useAuth";
import { useKeepAwake } from "expo-keep-awake";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SplashScreenProvider } from "~/providers/SplashScreenProvider";
import "~/utils/i18n";
import { useEffect } from "react";
import QueryProvider from "~/providers/QueryProvider";
import Toast from "react-native-toast-message";
import toastConfig from "~/providers/toastConfig";

export default function RootLayout() {
  Appearance.setColorScheme("light");

  return (
    <QueryProvider>
      <SplashScreenProvider>
        <Layout />
      </SplashScreenProvider>
      <Toast config={toastConfig} />
    </QueryProvider>
  );
}

function Layout() {
  const { isDarkColorScheme } = useColorScheme();
  useKeepAwake();
  const { isLoggedIn } = useAuth({});

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/(home)/home");
    } else {
      router.replace("/(user-management)/login");
    }
  }, [isLoggedIn]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
      <Slot />
      <PortalHost />
    </GestureHandlerRootView>
  );
}
