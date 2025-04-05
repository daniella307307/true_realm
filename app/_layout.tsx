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
import "react-native-get-random-values";
import { useEffect, useState } from "react";
import QueryProvider from "~/providers/QueryProvider";
import Toast from "react-native-toast-message";
import toastConfig from "~/providers/toastConfig";
import { enableScreens } from "react-native-screens";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "~/components/ui/custom-drawer";
import { FontSizeProvider } from "~/providers/FontSizeContext";
import { PaperProvider } from "react-native-paper";
import { initializeNetworkListener } from "~/services/network";
import { initializeSyncService } from "~/services/sync";
import NetInfo from "@react-native-community/netinfo";
import { RealmContext } from "~/providers/RealContextProvider";

enableScreens();
export default function RootLayout() {
  Appearance.setColorScheme("light");
  return (
    <FontSizeProvider>
      <QueryProvider>
        <PaperProvider>
          <SplashScreenProvider>
            <RealmContext.RealmProvider>
              <Layout />
            </RealmContext.RealmProvider>
          </SplashScreenProvider>
        </PaperProvider>
        <Toast config={toastConfig} />
      </QueryProvider>
    </FontSizeProvider>
  );
}

function Layout() {
  const { isLoggedIn, authChecked } = useAuth({});
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Wait for auth check to complete before proceeding
    const initializeServices = async () => {
      try {
        // Only proceed once auth has been checked
        if (!authChecked) return;

        const loginStatus = await isLoggedIn;
        console.log("Is Logged In:", loginStatus);

        // Only initialize network services if logged in
        if (loginStatus) {
          const networkUnsubscribe = await initializeNetworkListener();
          const syncUnsubscribe = initializeSyncService();

          router.push("/(home)/home");

          // Check and show internet connectivity status
          const netInfo = await NetInfo.fetch();
          console.log("NetInfo", netInfo);
          Toast.show({
            type: netInfo.isConnected ? "success" : "error",
            text1: "Network Status",
            text2: netInfo.isConnected
              ? "You are connected to the internet"
              : "You are offline",
            position: "top",
            visibilityTime: 3000,
          });

          return () => {
            networkUnsubscribe();
            syncUnsubscribe();
          };
        } else {
          router.push("/(user-management)/login");
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        router.push("/(user-management)/login");
      } finally {
        SplashScreen.hideAsync();
        setIsInitialized(true);
      }
    };

    initializeServices();
  }, [isLoggedIn, authChecked]);

  // Show splash screen until auth is checked and initialization is complete
  if (!authChecked || !isInitialized) {
    return null; // Or a loading component
  }

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
