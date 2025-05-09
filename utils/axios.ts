import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const env = process.env["EXPO_PUBLIC_API_ENV"] || "development";
// Add fallback URL if environment variable is not set
export const BASE_URL = process.env["EXPO_PUBLIC_API_URL"] || "https://sugiramuryango.project.co.rw";
console.log("The base url: ", BASE_URL);

// Create a flag to track authentication status
let isAuthenticated = false;

// Function to update authentication status - call this from useAuth
export const setAuthenticationStatus = (status: boolean) => {
  isAuthenticated = status;
  console.log("Authentication status updated:", isAuthenticated);
};

// Function to clear authentication tokens
export const clearAuthTokens = async () => {
  await AsyncStorage.removeItem("tknToken");
  isAuthenticated = false;
  console.log("Authentication tokens cleared");
};

// Define routes that don't require authentication
const publicRoutes = [
  "/login",
  "/user/reset-password",
  "/user/verify-reset-code",
];

const baseInstance = axios.create({
  baseURL: BASE_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
  // Add timeout configuration for better mobile performance
  timeout: 10000, // 10 seconds timeout
  // Optimize HTTP requests
  timeoutErrorMessage: "Network request timed out. Please check your connection.",
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

  console.log(`🔍 API ${type} [${method}] ${endpoint}`);

  if (type === "REQUEST") {
    console.log(
      "🔹 Headers:",
      JSON.stringify(
        {
          ...config.headers,
          Authorization: config.headers.Authorization?.substring(0, 15) + "...",
        },
        null,
        2
      )
    );
    if (config.data) {
      console.log("🔹 Request body:", JSON.stringify(config.data, null, 2));
    }
  } else if (type === "RESPONSE") {
    console.log("🔹 Status:", data?.status);
    // console.log("🔹 Response data:", JSON.stringify(data?.data, null, 2));
  } else if (type === "ERROR") {
    console.log("🔹 error data:", JSON.stringify(data, null, 2));
    console.log("🔹 Error status:", data?.response?.status);
    console.log(
      "🔹 Error data:",
      JSON.stringify(data?.response?.data, null, 2)
    );
  }
};

baseInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Check if the current route is public (doesn't require auth)
      const isPublicRoute = publicRoutes.some((route) =>
        config.url?.endsWith(route)
      );

      // Set auth header if token exists
      const token = await AsyncStorage.getItem("tknToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        isAuthenticated = true;
        console.log(
          "Setting Authorization header with token:",
          // print the last 15 characters of the token
          token.substring(token.length - 15) + "..."
        );
      } else {
        isAuthenticated = false;
        console.log("No token found in AsyncStorage");
      }

      // Only proceed with request if authenticated or it's a public route
      if (!isAuthenticated && !isPublicRoute) {
        console.log(
          "Preventing API call to protected route when not authenticated:",
          config.url
        );
        // Return a rejected promise to prevent the request
        return Promise.reject(new Error("User not authenticated"));
      }

      // Log the outgoing request
      logAPIRequest(config, "REQUEST");
    } catch (error) {
      console.error("Error retrieving token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
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
      console.log("Received 401 unauthorized, clearing token");
      await clearAuthTokens();
    }
    return Promise.reject(error);
  }
);

export { baseInstance };
