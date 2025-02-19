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
import { useEffect } from "react";
import QueryProvider from "~/providers/QueryProvider";
import Toast from "react-native-toast-message";
import toastConfig from "~/providers/toastConfig";
import { enableScreens } from "react-native-screens";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "~/components/ui/custom-drawer";
import { FontSizeProvider } from "~/providers/FontSizeContext";

enableScreens();
export default function RootLayout() {
  Appearance.setColorScheme("light");
  return (
    <FontSizeProvider>
      <QueryProvider>
        <SplashScreenProvider>
          <Layout />
        </SplashScreenProvider>
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
