import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import NetInfo from "@react-native-community/netinfo";
import { router } from "expo-router";

const env = process.env["EXPO_PUBLIC_API_ENV"] || "development";
export const BASE_URL = process.env["EXPO_PUBLIC_API_URL"] || "https://afriquollect.heis.farm";
console.log("[API] Base URL:", BASE_URL);

let isAuthenticated = false;
let isCheckingAuth = false;
let authCheckPromise: Promise<void> | null = null;

export const setAuthenticationStatus = (status: boolean) => {
  isAuthenticated = status;
  console.log("[API] Authentication status updated:", isAuthenticated);
};

export const getAuthenticationStatus = () => isAuthenticated;

export const clearAuthTokens = async () => {
  try {
    await AsyncStorage.removeItem("tknToken");
    await AsyncStorage.removeItem("userId");
    isAuthenticated = false;
    console.log("[API] Authentication tokens cleared");
  } catch (error) {
    console.error("[API] Error clearing auth tokens:", error);
  }
};

const publicRoutes = [
  "/auth/login",
  "/auth/logout",
  "/auth/reset-password",
  "/auth/verify-reset-code",
  "/auth/forgot-password",
  "/user/reset-password",
  "/user/verify-reset-code",
];

const baseInstance = axios.create({
  baseURL: BASE_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  timeoutErrorMessage: "Request timed out. Please check your connection.",
});

const logAPIRequest = (
  config: any,
  type: "REQUEST" | "RESPONSE" | "ERROR",
  data?: any
) => {
  const url = config?.url || "unknown";
  const method = config?.method?.toUpperCase() || "unknown";
  const endpoint = url.replace(BASE_URL + "/api", "");

  console.log(`[API ${type}] ${method} ${endpoint}`);

  if (type === "REQUEST") {
    if (config?.headers?.Authorization) {
      console.log("[API] Using auth token:", config.headers.Authorization.substring(0, 20) + "...");
    }
    if (config?.data) {
      console.log("[API] Request payload:", typeof config.data === 'string' ? config.data : JSON.stringify(config.data));
    }
  } else if (type === "RESPONSE") {
    console.log("[API] Status:", data?.status);
    console.log("[API] Response data:", JSON.stringify(data?.data, null, 2));
  } else if (type === "ERROR") {
    console.log("[API] Error status:", data?.response?.status);
    console.log("[API] Error details:", data?.response?.data);
  }
};

const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    const netInfo = await NetInfo.fetch();
    const isConnected = netInfo.isConnected && netInfo.isInternetReachable !== false;
    console.log("[API] Network check:", { 
      isConnected: netInfo.isConnected, 
      isInternetReachable: netInfo.isInternetReachable 
    });
    return isConnected;
  } catch (error) {
    console.error("[API] Error checking network:", error);
    return false;
  }
};

const isPublicRoute = (url?: string): boolean => {
  if (!url) return false;
  return publicRoutes.some((route) => url.includes(route));
};

baseInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        console.log("[API] No network connection available");
        const error: any = new Error("No network connection. Please check your internet and try again.");
        error.isNetworkError = true;
        return Promise.reject(error);
      }

      const isPublic = isPublicRoute(config.url);

      if (isCheckingAuth && !isPublic && authCheckPromise) {
        console.log("[API] Auth check in progress, waiting...");
        await authCheckPromise;
      }

      const token = await AsyncStorage.getItem("tknToken");
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        
        if (!isAuthenticated) {
          console.log("[API] Token found, updating authentication status");
          setAuthenticationStatus(true);
        }
      } else {
        if (!isPublic) {
          console.log("[API] No token available for protected route:", config.url);
          const error: any = new Error("Authentication required");
          error.isAuthError = true;
          error.config = config;
          return Promise.reject(error);
        } else {
          delete config.headers.Authorization;
        }
      }

      logAPIRequest(config, "REQUEST");
      return config;
    } catch (error: any) {
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
    logAPIRequest(response.config, "RESPONSE", response);
    return response;
  },
  async (error: AxiosError) => {
    logAPIRequest(error.config, "ERROR", error);

    if (error.response?.status === 401) {
      console.log("[API] 401 Unauthorized - clearing auth state");
      await clearAuthTokens();
      setAuthenticationStatus(false);
      
      router.replace('/(user-management)/login');
    }
    
    if (!error.response) {
      console.log("[API] Network error occurred");
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        const networkError: any = new Error("No network connection. Please check your internet and try again.");
        networkError.isNetworkError = true;
        return Promise.reject(networkError);
      }
    }

    if (error.code === 'ECONNABORTED') {
      console.log("[API] Request timeout");
      const timeoutError: any = new Error("Request timed out. Please try again.");
      timeoutError.isTimeoutError = true;
      return Promise.reject(timeoutError);
    }

    return Promise.reject(error);
  }
);


export const initializeAuthStatus = async (): Promise<boolean> => {
  if (authCheckPromise) {
    await authCheckPromise;
    return isAuthenticated;
  }

  isCheckingAuth = true;
  authCheckPromise = (async () => {
    try {
      const token = await AsyncStorage.getItem("tknToken");
      const hasToken = !!token;
      setAuthenticationStatus(hasToken);
      console.log("[API] Auth status initialized:", hasToken);
    } catch (error) {
      console.error("[API] Failed to initialize auth status:", error);
      setAuthenticationStatus(false);
    } finally {
      isCheckingAuth = false;
      authCheckPromise = null;
    }
  })();

  await authCheckPromise;
  return isAuthenticated;
};

export { baseInstance };