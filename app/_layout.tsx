import "~/global.css";
import { router, Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "~/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "~/lib/hooks/useAuth";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SplashScreenProvider } from "~/providers/SplashScreenProvider";
import "~/utils/i18n";
import { useEffect } from "react";
import QueryProvider from "~/providers/QueryProvider";
import Toast from "react-native-toast-message";
import toastConfig from "~/providers/toastConfig";
import { enableScreens } from "react-native-screens";

enableScreens();
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
  const { isLoggedIn } = useAuth({});

  SplashScreen.hideAsync();
  useEffect(() => {
    if (!isLoggedIn) {
      console.log("🚀 file: _layout.tsx, fn: Layout, line 57");
      router.push("/(home)/home");
      console.log("🚀 file: _layout.tsx, fn: Layout, line 59");
    } else {
      router.push("/(user-management)/login");
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
