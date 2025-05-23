import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '~/lib/hooks/useAuth';

/**
 * Root app entry point
 * 
 * This component handles the initial routing based on authentication status.
 * It will redirect to either login or home based on the user's login status.
 */
export default function Index() {
  const { isLoggedIn, authChecked } = useAuth({});

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
  
  // Show loading indicator while checking auth status
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
} 