// _layout.tsx
import "~/global.css";
import { Slot, SplashScreen, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "~/lib/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "~/utils/i18n";
import "react-native-get-random-values";
import { useEffect, useState, useRef } from "react";
import { QueryProvider } from "~/providers/QueryProvider";
import Toast from "react-native-toast-message";
import { enableScreens } from "react-native-screens";
import { FontSizeProvider } from "~/providers/FontSizeContext";
import { initializeNetworkListener } from "~/services/network";
import { SQLiteProvider, useSQLite } from "~/providers/RealContextProvider";
import { DrawerProvider } from "~/providers/DrawerProvider";
import CustomDrawer from "~/components/ui/custom-drawer";
import { useDrawer } from "~/providers/DrawerProvider";
import { RouteProtectionProvider } from "~/providers/RouteProtectionProvider";
import { AppDataProvider } from "~/providers/AppProvider";
import { configureNetworkForPlatform } from "~/utils/networkHelpers";
import NetInfo from "@react-native-community/netinfo";
import { registerForPushNotificationsAsync, retryPushTokenRegistration } from "~/services/notificationService";
import * as Notifications from 'expo-notifications';
import { View, Text, ActivityIndicator } from 'react-native';

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10, fontSize: 16, fontWeight: 'bold' }}>
          Critical Error
        </Text>
        <Text style={{ color: '#333', textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <QueryProvider>
      <SQLiteProvider>
        <SQLiteReadyGate>
          <DrawerProvider>
            <FontSizeProvider>
              <RouteProtectionProvider>
                <AppDataProvider>
                  <Layout />
                </AppDataProvider>
              </RouteProtectionProvider>
            </FontSizeProvider>
          </DrawerProvider>
        </SQLiteReadyGate>
      </SQLiteProvider>
      <Toast />
    </QueryProvider>
  );
}

function SQLiteReadyGate({ children }: { children: React.ReactNode }) {
  const { isReady } = useSQLite();

  if (!isReady) {
    debug.log('SQLiteReadyGate', 'Waiting for SQLite to be ready...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        {/* <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Initializing database...
        </Text> */}
      </View>
    );
  }

  debug.log('SQLiteReadyGate', 'SQLite is ready, rendering app');
  return <>{children}</>;
}

function Layout() {
  const { isLoggedIn, authChecked, user } = useAuth({});
  const [appReady, setAppReady] = useState(false);
  const [initialNavigationDone, setInitialNavigationDone] = useState(false);
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  
  // Use refs to prevent multiple attempts
  const hasRedirectedRef = useRef(false);
  const pushRegistrationAttempted = useRef(false);

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

        // Push notifications - only try once and only if logged in
        if (loginStatus && !pushRegistrationAttempted.current) {
          pushRegistrationAttempted.current = true;
          
          // Check network status first
          const netInfo = await NetInfo.fetch();
          
          if (netInfo.isConnected) {
            try {
              debug.log('Layout', 'Initializing push notifications (online)');
              await registerForPushNotificationsAsync();
              debug.log('Layout', 'Push notifications initialized');
            } catch (notifError) {
              debug.log('Layout', 'Push notification setup failed, will retry when online');
            }
          } else {
            debug.log('Layout', 'eOffline - push notifications will register when online');
          }
        }

        // Network change listener for push token retry
        const netInfoUnsubscribe = NetInfo.addEventListener(state => {
          if (state.isConnected && state.isInternetReachable && loginStatus) {
            debug.log('Layout', 'Network restored - retrying push registration');
            retryPushTokenRegistration().catch(err => {
              debug.log('Layout', 'Push retry failed:', err);
            });
          }
        });

        // Notification listeners
        debug.log('Layout', 'Setting up notification listeners');
        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
          debug.log('Layout', 'Notification received', notification);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
          debug.log('Layout', 'Notification tapped', response);
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

        // Final network status log
        const netInfo = await NetInfo.fetch();
        debug.log('Layout', 'Network status', {
          isConnected: netInfo.isConnected,
          type: netInfo.type,
        });

        setAppReady(true);
        debug.log('Layout', 'App initialization completed');

        return () => {
          debug.log('Layout', 'Cleaning up resources');
          networkUnsubscribe && networkUnsubscribe();
          netInfoUnsubscribe && netInfoUnsubscribe();
          Notifications.removeNotificationSubscription(notificationListener);
          Notifications.removeNotificationSubscription(responseListener);
          debug.log('Layout', 'Cleanup completed');
        };
      } catch (error) {
        debug.error('Layout', 'App initialization failed', error);
        setError(error instanceof Error ? error.message : "Unknown initialization error");
        setAppReady(true);
      }
    };

    initializeApp();
  }, [authChecked, isLoggedIn]);

  useEffect(() => {
    const handleNavigation = async () => {
      debug.log('Layout', 'Navigation handler started', {
        appReady,
        initialNavigationDone,
        pathname,
        hasRedirected: hasRedirectedRef.current
      });

      if (!appReady || initialNavigationDone || hasRedirectedRef.current) {
        debug.log('Layout', 'Skipping navigation', {
          reason: !appReady ? 'app not ready' : 
                  hasRedirectedRef.current ? 'already redirected' : 
                  'navigation already done'
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

        // Define routes that don't need authentication
        const publicRoutes = [
          '/(user-management)/login',
          '/(user-management)/register',
          '/(user-management)/forgot-password',
          '/login',
          '/register',
        ];

        // Define routes that should redirect to home if already logged in
        const authOnlyRoutes = [
          '/(user-management)/login',
          '/login',
        ];

        const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
        const isAuthOnlyRoute = authOnlyRoutes.some(route => pathname.startsWith(route));

        if (loginStatus) {
          debug.log('Layout', 'User is logged in');
          
          if (isAuthOnlyRoute) {
            debug.log('Layout', 'User logged in on auth page, redirecting to home');
            hasRedirectedRef.current = true;
            router.replace('/(home)/home');
          } else {
            debug.log('Layout', 'User logged in, allowing access to:', pathname);
          }
        } else {
          debug.log('Layout', 'User not logged in');
          
          if (!isPublicRoute) {
            debug.log('Layout', 'User not logged in, redirecting to login');
            hasRedirectedRef.current = true;
            router.replace('/(user-management)/login');
          } else {
            debug.log('Layout', 'User on public route, allowing access');
          }
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10, fontSize: 16, fontWeight: 'bold' }}>
          Error
        </Text>
        <Text style={{ color: '#333', textAlign: 'center' }}>
          {error}
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