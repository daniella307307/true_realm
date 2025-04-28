import NetInfo from '@react-native-community/netinfo';
import { Alert, Platform } from 'react-native';
import { baseInstance } from './axios';

/**
 * Network helper utilities for improving API reliability and performance
 */

// Maximum number of retries for failed requests
const MAX_RETRIES = 3;

// Retry delay in milliseconds (increases with each retry)
const RETRY_DELAY_MS = 1000;

/**
 * Checks if the device has an internet connection
 * @returns Promise resolving to a boolean indicating connectivity
 */
export const checkNetworkConnection = async (): Promise<boolean> => {
  const networkState = await NetInfo.fetch();
  return !!networkState.isConnected;
};

/**
 * Shows a network error message to the user
 * @param errorMessage Optional custom error message
 */
export const showNetworkErrorAlert = (errorMessage?: string) => {
  Alert.alert(
    "Network Error",
    errorMessage || "Unable to connect to the server. Please check your internet connection and try again.",
    [{ text: "OK" }]
  );
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
    // First attempt
    return await apiCall();
  } catch (error: any) {
    // If we have no more retries, or this isn't a network error, throw
    if (
      retries <= 0 ||
      (error.response && error.response.status !== undefined)
    ) {
      throw error;
    }

    // Wait before retrying (increasing delay with each retry)
    const delay = RETRY_DELAY_MS * (MAX_RETRIES - retries + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`API call failed, retrying (${retries} attempts left)`);
    
    // Retry the request
    return fetchWithRetry(apiCall, retries - 1);
  }
};

/**
 * Sets optimal network configuration for the device platform
 */
export const configureNetworkForPlatform = () => {
  // Modify Axios instance based on platform
  if (Platform.OS === 'android') {
    // Android-specific optimizations
    baseInstance.defaults.timeout = 15000; // Longer timeout for Android
  } else if (Platform.OS === 'ios') {
    // iOS-specific optimizations
    baseInstance.defaults.timeout = 10000;
  }
  
  console.log(`Network configured for ${Platform.OS} platform`);
}; 