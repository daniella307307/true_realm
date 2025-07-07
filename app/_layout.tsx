// _layout.tsx
import "~/global.css";
import { Redirect, Slot, SplashScreen, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "~/lib/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "~/utils/i18n";
import "react-native-get-random-values";
import { useEffect, useState } from "react";
import { QueryProvider } from "~/providers/QueryProvider";
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
import NetInfo from "@react-native-community/netinfo";
import { registerForPushNotificationsAsync } from "~/services/notificationService";
import * as Notifications from 'expo-notifications';
import { View, Text } from 'react-native';

// Debug logging utility
const debug = {
  log: (component: string, message: string, data?: any) => {
    console.log(`[${component}] ${message}`, data ? data : '');
  },
  error: (component: string, message: string, error: any) => {
    console.error(`[${component}] ${message}:`, error);
    if (error?.stack) {
      console.error(`[${component}] Stack trace:`, error.stack);
    }
  }
};

SplashScreen.preventAutoHideAsync().catch(err => {
  debug.error('SplashScreen', 'Failed to prevent auto hide', err);
});
enableScreens();

const { RealmProvider } = RealmContext;

export default function AppLayout() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      debug.log('AppLayout', 'Configuring network');
      configureNetworkForPlatform();
      debug.log('AppLayout', 'Network configured successfully');
    } catch (err) {
      debug.error('AppLayout', 'Network configuration failed', err);
      setError(`Network configuration error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  if (error) {
    debug.log('AppLayout', 'Rendering error state', { error });
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', textAlign: 'center', margin: 20 }}>
          Critical Error: {error}
        </Text>
      </View>
    );
  }

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
  const [appReady, setAppReady] = useState(false);
  const [initialNavigationDone, setInitialNavigationDone] = useState(false);
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Debug state changes
  useEffect(() => {
    const logState = async () => {
      try {
        const loginStatus = await isLoggedIn;
        debug.log('Layout', 'State Update', {
          pathname,
          authChecked,
          appReady,
          initialNavigationDone,
          isLoggedIn: loginStatus,
          user: user ? 'exists' : 'null'
        });
      } catch (err) {
        debug.error('Layout', 'Failed to log state', err);
      }
    };
    logState();
  }, [pathname, authChecked, appReady, initialNavigationDone, isLoggedIn, user]);

  useEffect(() => {
    const initializeApp = async () => {
      debug.log('Layout', 'Starting app initialization');
      
      try {
        // Auth check
        if (!authChecked) {
          debug.log('Layout', 'Waiting for auth check to complete');
          return;
        }
        debug.log('Layout', 'Auth check completed');

        const loginStatus = await isLoggedIn;
        debug.log('Layout', 'Login status determined', { isLoggedIn: loginStatus });

        // Network initialization
        debug.log('Layout', 'Initializing network listener');
        const networkUnsubscribe = await initializeNetworkListener();
        debug.log('Layout', 'Network listener initialized successfully');

        // Push notifications
        try {
          debug.log('Layout', 'Initializing push notifications');
          await registerForPushNotificationsAsync();
          debug.log('Layout', 'Push notifications initialized successfully');
        } catch (notifError) {
          debug.error('Layout', 'Push notification initialization failed', notifError);
        }

        // Notification listeners
        debug.log('Layout', 'Setting up notification listeners');
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
          debug.log('Layout', 'Notification received', notification);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
          debug.log('Layout', 'Notification response received', response);
          try {
            const data = response.notification.request.content.data as any;
            debug.log('Layout', 'Processing notification data', data);
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
          } catch (routeError) {
            debug.error('Layout', 'Failed to handle notification navigation', routeError);
          }
        });

        // Network status check
        const netInfo = await NetInfo.fetch();
        debug.log('Layout', 'Network status check', {
          isConnected: netInfo.isConnected,
          type: netInfo.type,
          details: netInfo.details
        });

        setAppReady(true);
        debug.log('Layout', 'App initialization completed successfully');

        return () => {
          debug.log('Layout', 'Cleaning up resources');
          networkUnsubscribe && networkUnsubscribe();
          Notifications.removeNotificationSubscription(notificationListener);
          Notifications.removeNotificationSubscription(responseListener);
          debug.log('Layout', 'Cleanup completed');
        };
      } catch (error) {
        debug.error('Layout', 'App initialization failed', error);
        setError(error instanceof Error ? error.message : "Unknown initialization error");
        setAppReady(true); // Still mark as ready to show error state
      }
    };

    initializeApp();
  }, [authChecked]);

  // Navigation handling
  useEffect(() => {
    const handleNavigation = async () => {
      debug.log('Layout', 'Navigation handler started', {
        appReady,
        initialNavigationDone,
        pathname
      });

      if (!appReady || initialNavigationDone) {
        debug.log('Layout', 'Skipping navigation', {
          reason: !appReady ? 'app not ready' : 'navigation already done'
        });
        return;
      }

      try {
        const loginStatus = await isLoggedIn;
        debug.log('Layout', 'Checking navigation conditions', {
          loginStatus,
          authChecked,
          pathname
        });

        if (!authChecked) {
          debug.log('Layout', 'Auth check not complete, waiting');
          return;
        }

        if (loginStatus) {
          debug.log('Layout', 'User is logged in, determining navigation');
          
          if (!pathname || (pathname !== "/(user-management)/update-password" && !pathname.includes("update-password"))) {
            debug.log('Layout', 'Navigating to home screen');
            return <Redirect href="/(home)/home" />;
          } else {
            debug.log('Layout', 'On update-password path, staying');
          }
        } else {
          debug.log('Layout', 'User not logged in, navigating to login');
          return <Redirect href="/(user-management)/login" />;
        }

        debug.log('Layout', 'Attempting to hide splash screen');
        await SplashScreen.hideAsync();
        debug.log('Layout', 'Splash screen hidden successfully');
        
        setInitialNavigationDone(true);
        debug.log('Layout', 'Navigation completed successfully');
      } catch (error) {
        debug.error('Layout', 'Navigation failed', error);
        setError(`Navigation error: ${error instanceof Error ? error.message : String(error)}`);
        
        try {
          debug.log('Layout', 'Attempting error recovery navigation');
          await SplashScreen.hideAsync();
          setInitialNavigationDone(true);
        } catch (splashError) {
          debug.error('Layout', 'Failed to hide splash screen during error recovery', splashError);
        }
      }
    };

    handleNavigation();
  }, [appReady, isLoggedIn, authChecked, pathname]);

  if (!appReady || !authChecked) {
    debug.log('Layout', 'Rendering null - waiting for initialization', {
      appReady,
      authChecked
    });
    return null;
  }

  if (error) {
    debug.log('Layout', 'Rendering error state', { error });
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', textAlign: 'center', margin: 20 }}>
          Error: {error}
        </Text>
      </View>
    );
  }

  debug.log('Layout', 'Rendering main app layout');
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <CustomDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
      <Slot />
      <PortalHost />
    </GestureHandlerRootView>
  );
}
