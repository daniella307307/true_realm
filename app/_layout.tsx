// _layout.tsx
import "~/global.css";
import { router, Slot, SplashScreen, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "~/lib/hooks/useAuth";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "~/utils/i18n";
import "react-native-get-random-values";
import { useEffect, useState } from "react";
import QueryProvider from "~/providers/QueryProvider";
import Toast from "react-native-toast-message";
import { enableScreens } from "react-native-screens";
import { FontSizeProvider } from "~/providers/FontSizeContext";
import { initializeNetworkListener } from "~/services/network";
import NetInfo from "@react-native-community/netinfo";
import { RealmContext } from "~/providers/RealContextProvider";
import { DrawerProvider } from "~/providers/DrawerProvider";
import CustomDrawer from "~/components/ui/custom-drawer";
import { useDrawer } from "~/providers/DrawerProvider";
import { RouteProtectionProvider } from "~/providers/RouteProtectionProvider";
import { AppDataProvider } from "~/providers/AppProvider";
import { configureNetworkForPlatform } from "~/utils/networkHelpers";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Enable native screens for better performance
enableScreens();

const { RealmProvider } = RealmContext;

export default function AppLayout() {
  // Configure network as early as possible in the app lifecycle
  useEffect(() => {
    configureNetworkForPlatform();
  }, []);

  return (
    <QueryProvider>
      <RealmProvider>
        <DrawerProvider>
          <FontSizeProvider>
            <RouteProtectionProvider>
              <AppDataProvider>
                <Layout />
              </AppDataProvider>
            </RouteProtectionProvider>
          </FontSizeProvider>
        </DrawerProvider>
      </RealmProvider>
      <Toast />
    </QueryProvider>
  );
}

function Layout() {
  const { isLoggedIn, authChecked, user } = useAuth({});
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const [appReady, setAppReady] = useState(false);
  const [initialNavigationDone, setInitialNavigationDone] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for auth check to complete
        if (!authChecked) return;

        const loginStatus = await isLoggedIn;
        console.log("Auth check completed. Is logged in:", loginStatus);

        // Initialize network services regardless of login status
        const networkUnsubscribe = await initializeNetworkListener();
        
        // Only initialize sync service if logged in
        let syncUnsubscribe = null;
        if (loginStatus) {
          console.log("Sync service initialized");
        }

        // Check and show internet connectivity status
        const netInfo = await NetInfo.fetch();
        console.log("Network status:", netInfo.isConnected ? "Connected" : "Offline");
        
        // App is ready now, but keep splash screen visible until navigation completes
        setAppReady(true);
        
        return () => {
          networkUnsubscribe && networkUnsubscribe();
        };
      } catch (error) {
        console.error("Error initializing app:", error);
        // Even on error, mark app as ready and navigate to login
        setAppReady(true);
      }
    };

    initializeApp();
  }, [authChecked]);

  // Handle navigation and splash screen hiding after app is ready
  useEffect(() => {
    const handleNavigation = async () => {
      if (!appReady || initialNavigationDone) return;
      const currentPath = usePathname();

      try {
        const loginStatus = await isLoggedIn;
        console.log("Login status:", loginStatus);
        if (loginStatus) {
          console.log("Login status down:", loginStatus);
          // Check the current route to avoid interrupting the password update flow
          console.log("Current route:", currentPath);
          
          // Only navigate to home if not already in a specific path
          // and NOT in the update-password path
          if (!currentPath || 
              (currentPath !== "/(user-management)/update-password" && 
               !currentPath.includes("update-password"))) {
            console.log("Navigating to home screen");
            router.replace("/(home)/home");
          } else {
            console.log("Already on update-password, not redirecting to home");
            // Still need to hide splash screen when staying on update-password
            await SplashScreen.hideAsync();
          }
        } else {
          // User is not logged in, navigate to login and hide splash screen
          console.log("Navigating to login screen");
          router.replace("/(user-management)/login");
          await SplashScreen.hideAsync();
          console.log("App loaded - Login screen displayed");
        }
        
        // Mark that initial navigation is done
        setInitialNavigationDone(true);
      } catch (error) {
        console.error("Error during navigation:", error);
        // On error, navigate to login and hide splash screen
        router.replace("/(user-management)/login");
        await SplashScreen.hideAsync();
        setInitialNavigationDone(true);
      }
    };

    handleNavigation();
  }, [appReady, isLoggedIn]);

  // Don't render anything until app is ready
  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
      <CustomDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
      <PortalHost />
    </GestureHandlerRootView>
  );
}