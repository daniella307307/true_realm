// _layout.tsx
import "~/global.css";
import { router, Slot, SplashScreen, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "~/lib/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "~/utils/i18n";
import "react-native-get-random-values";
import { useEffect, useState } from "react";
import QueryProvider from "~/providers/QueryProvider";
import Toast from "react-native-toast-message";
import { enableScreens } from "react-native-screens";
import { FontSizeProvider } from "~/providers/FontSizeContext";
import { initializeNetworkListener } from "~/services/network";
import { RealmContext } from "~/providers/RealContextProvider";
import { DrawerProvider } from "~/providers/DrawerProvider";
import CustomDrawer from "~/components/ui/custom-drawer";
import { useDrawer } from "~/providers/DrawerProvider";
import { RouteProtectionProvider } from "~/providers/RouteProtectionProvider";
import { AppDataProvider } from "~/providers/AppProvider";
import { configureNetworkForPlatform } from "~/utils/networkHelpers";
import { registerForPushNotificationsAsync } from "~/services/notificationService";
import * as Notifications from 'expo-notifications';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Enable native screens for better performance
enableScreens();

const { RealmProvider } = RealmContext;

export default function RootLayout() {
  const { authChecked } = useAuth({});
  const [appIsReady, setAppIsReady] = useState(false);
  const { isDrawerOpen, closeDrawer } = useDrawer();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize network listener
        initializeNetworkListener();

        // Configure network for platform
        await configureNetworkForPlatform();

        // Initialize notifications
        await registerForPushNotificationsAsync();

        // Listen for notification responses
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
          console.log('Notification received:', notification);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
          const data = response.notification.request.content.data as any;
          router.push({
            pathname: "/(notifications)/" + data.survey_result_id as any,
            params: {
              project_module_id: data.project_module_id,
              survey_id: data.survey_id,
              _id: data.survey_result_id,
              itemType: "notification",
              id: data.id,
            },
          });
        });

        return () => {
          Notifications.removeNotificationSubscription(notificationListener);
          Notifications.removeNotificationSubscription(responseListener);
        };
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <RealmProvider>
          <AppDataProvider>
            <FontSizeProvider>
              <DrawerProvider>
                <RouteProtectionProvider>
                  <CustomDrawer isOpen={isDrawerOpen} onClose={closeDrawer}>
                    <StatusBar style="auto" />
                    <Slot />
                    <PortalHost name="root" />
                    <Toast />
                  </CustomDrawer>
                </RouteProtectionProvider>
              </DrawerProvider>
            </FontSizeProvider>
          </AppDataProvider>
        </RealmProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}