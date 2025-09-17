import NetInfo from '@react-native-community/netinfo';
import { Alert, Platform } from 'react-native';
import { baseInstance } from './axios';
import Toast from 'react-native-toast-message';

/**
 * Network helper utilities for improving API reliability and performance
 */

// Maximum number of retries for failed requests
const MAX_RETRIES = 3;

// Retry delay in milliseconds (increases with each retry)
const RETRY_DELAY_MS = 1000;

const CONNECTION_CHECK_INTERVAL = 5000;

/**
 * Checks if the device has an internet connection
 * @returns Promise resolving to a boolean indicating connectivity
 */
export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    const networkState = await NetInfo.fetch();
    const isConnected = !!(networkState.isConnected && networkState.isInternetReachable);
    // console.log("[Network] Connection status:", isConnected ? "Connected" : "Offline");
    return isConnected;
  } catch (error) {
    console.error("[Network] Error checking connection:", error);
    return false;
  }
};

/**
 * Shows a network error message to the user
 * @param errorMessage Optional custom error message
 */
export const showNetworkErrorAlert = (errorMessage?: string) => {
  Toast.show({
    type: 'error',
    text1: 'Network Error',
    text2: errorMessage || "Unable to connect to the server. Please check your internet connection.",
    position: 'bottom',
    visibilityTime: 4000,
  });
};

/**
 * Makes an API request with automatic retries on failure
 * @param apiCall Function that returns a promise (the API call)
 * @param retries Number of retries remaining
 * @returns Promise with the API response
 */
export const fetchWithRetry = async (
  apiCall: () => Promise<any>,
  retries = MAX_RETRIES
): Promise<any> => {
  try {
    // Check network before attempting call
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      throw new Error("No network connection");
    }
    
    return await apiCall();
  } catch (error: any) {
    console.log("[Network] API call failed:", error.message);
    
    if (
      retries <= 0 ||
      (error.response && error.response.status !== undefined && error.response.status !== 0)
    ) {
      throw error;
    }

    const delay = RETRY_DELAY_MS * (MAX_RETRIES - retries + 1);
    console.log(`[Network] Retrying in ${delay}ms (${retries} attempts left)`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(apiCall, retries - 1);
  }
};

/**
 * Sets optimal network configuration for the device platform
 */
export const configureNetworkForPlatform = () => {
  try {
    if (Platform.OS === 'android') {
      baseInstance.defaults.timeout = 15000;
      console.log("[Network] Configured for Android");
    } else if (Platform.OS === 'ios') {
      baseInstance.defaults.timeout = 10000;
      console.log("[Network] Configured for iOS");
    }

    // Set up network state monitoring
    NetInfo.addEventListener(state => {
      const isConnected = !!(state.isConnected && state.isInternetReachable);
      console.log("[Network] Connection changed:", isConnected ? "Online" : "Offline");
      
      if (!isConnected) {
        showNetworkErrorAlert();
      }
    });

    // Periodic connection checks
    setInterval(async () => {
      await checkNetworkConnection();
    }, CONNECTION_CHECK_INTERVAL);

  } catch (error) {
    console.error("[Network] Configuration error:", error);
  }
}; 