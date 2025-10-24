import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import NetInfo from "@react-native-community/netinfo";

const env = process.env["EXPO_PUBLIC_API_ENV"] || "development";
// Add fallback URL if environment variable is not set
export const BASE_URL = process.env["EXPO_PUBLIC_API_URL"] || "http://172.16.16.42:9002";
console.log("[API] Base URL:", BASE_URL);

// Create a flag to track authentication status
let isAuthenticated = false;
let isCheckingAuth = false;

// Function to update authentication status - call this from useAuth
export const setAuthenticationStatus = (status: boolean) => {
  isAuthenticated = status;
  console.log("[API] Authentication status updated:", isAuthenticated);
};

// Function to clear authentication tokens
export const clearAuthTokens = async () => {
  try {
    await AsyncStorage.removeItem("tknToken");
    isAuthenticated = false;
    console.log("[API] Authentication tokens cleared");
  } catch (error) {
    console.error("[API] Error clearing auth tokens:", error);
  }
};

// Define routes that don't require authentication
const publicRoutes = [
  "/auth/login",
  "/user/reset-password",
  "/user/verify-reset-code",
];

const baseInstance = axios.create({
  baseURL: BASE_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
  // Add timeout configuration for better mobile performance
  timeout: 15000, // Increased timeout for better reliability
  // Optimize HTTP requests
  timeoutErrorMessage: "Request timed out. Please check your connection.",
});

// Debug logging function for API requests
const logAPIRequest = (
  config: any,
  type: "REQUEST" | "RESPONSE" | "ERROR",
  data?: any
) => {
  const url = config.url || "unknown";
  const method = config.method?.toUpperCase() || "unknown";
  const endpoint = url.replace(BASE_URL + "/api", "");

  console.log(`[API ${type}] ${method} ${endpoint}`);

  if (type === "REQUEST") {
    if (config.headers?.Authorization) {
      console.log("[API] Using auth token:", config.headers.Authorization.substring(0, 20) + "...");
    }
    if (config.data) {
      console.log("[API] Request payload:", typeof config.data === 'string' ? config.data : JSON.stringify(config.data));
    }
  } else if (type === "RESPONSE") {
    console.log("🔹 Status:", data?.status);
    // console.log("🔹 Response data:", JSON.stringify(data?.data, null, 2));
  } else if (type === "ERROR") {
    console.log("[API] Error status:", data?.response?.status);
    console.log("[API] Error details:", data?.response?.data);
  }
};

const checkNetworkConnection = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable;
  } catch (error) {
    console.error("[API] Error checking network:", error);
    return false;
  }
};

baseInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Check network first
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        console.log("[API] No network connection available");
        return Promise.reject(new Error("No network connection"));
      }

      const isPublicRoute = publicRoutes.some((route) =>
        config.url?.endsWith(route)
      );

      if (isCheckingAuth && !isPublicRoute) {
        console.log("[API] Auth check in progress, delaying request");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const token = await AsyncStorage.getItem("tknToken");
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        if (!isAuthenticated) {
          console.log("[API] Token found but not authenticated - updating status");
          setAuthenticationStatus(true);
        }
      } else {
        if (!isPublicRoute) {
          console.log("[API] No token for protected route:", config.url);
          return Promise.reject(new Error("Authentication required"));
        }
      }

      logAPIRequest(config, "REQUEST");
      return config;
    } catch (error) {
      console.error("[API] Request interceptor error:", error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error("[API] Request setup failed:", error);
    return Promise.reject(error);
  }
);

baseInstance.interceptors.response.use(
  (response) => {
    // Log successful response
    logAPIRequest(response.config, "RESPONSE", response);
    return response;
  },
  async (error: AxiosError) => {
    // Log error response
    logAPIRequest(error.config, "ERROR", error);

    if (error.response?.status === 401) {
      console.log("[API] Unauthorized - clearing auth state");
      await clearAuthTokens();
    }
    
    // Add network error handling
    if (!error.response) {
      console.log("[API] Network error occurred");
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        return Promise.reject(new Error("No network connection"));
      }
    }

    return Promise.reject(error);
  }
);

export { baseInstance };
