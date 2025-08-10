import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '~/lib/hooks/useAuth';

/**
 * Root app entry point
 * 
 * This component handles the initial routing based on authentication status.
 * It will redirect to either login or home based on the user's login status.
 */

const debug = {
  log: (component: string, message: string, data?: any) => {
    console.log(`[${component}] ${message}`, data ?? "");
  },
  error: (component: string, message: string, error: any) => {
    console.error(`[${component}] ${message}:`, error);
    if (error?.stack) {
      console.error(`[${component}] Stack trace:`, error.stack);
    }
  },
};
export default function Index() {
  const { isLoggedIn, authChecked } = useAuth({});
  console.log("Index", isLoggedIn, authChecked);
  const [appIsReady, setAppIsReady] = useState(false);

  // Handle redirection after auth check
  useEffect(() => {
    const redirect = async () => {
      // Wait for auth check to complete
      if (!authChecked) return;
      
      const loginStatus = await isLoggedIn;
      console.log("Initial route auth check. Is logged in:", loginStatus);
      
      if (loginStatus) {
        // User is logged in, redirect to home
        router.replace('/(home)/home');
      } else {
        // User is not logged in, redirect to login
        router.replace('/(user-management)/login');
      }
    };
    
    redirect();
  }, [authChecked, isLoggedIn]);
  
  // Basic app preparation
  useEffect(() => {
    const prepare = async () => {
      debug.log('Layout', 'Starting basic app preparation');
      
      try {
        // Add small delay for smooth transition
        await new Promise((resolve) => setTimeout(resolve, 100));
        debug.log('Layout', 'Preparation delay completed');
        
      } catch (e) {
        debug.error('Layout', 'Error during preparation', e);
      } finally {
        // Set app as ready regardless of errors to prevent infinite loops
        setAppIsReady(true);
        debug.log('Layout', 'App marked as ready');
      }
    };

    prepare();
  }, []); // Empty dependency array ensures this only runs once

  // Show loading indicator while checking auth status
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
} 