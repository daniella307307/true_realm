import { AxiosError } from "axios";
import { useMemo, useState, useEffect, useRef } from "react";
import { ILoginDetails, ILoginResponse, IResponseError, User } from "~/types";
import { useMainStore } from "../store/main";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  useGetCurrentLoggedInProfile,
  userLogin,
  userLogout,
} from "~/services/user";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthenticationStatus, clearAuthTokens } from "~/utils/axios";
import { Alert } from "react-native";

export type AuthOptions = {
  onLogin?: (data: User) => void;
  onLogout?: () => void;
};

export const useAuth = ({ onLogin, onLogout }: AuthOptions) => {
  const queryClient = useQueryClient();
  const mainStore = useMainStore();
  const user = useMemo(() => mainStore.user!, [mainStore.user]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const lastLoginIdentifier = useRef<string | null>(null);

  const isLoggedIn = useMemo(async () => {
    const token = await AsyncStorage.getItem("tknToken");
    const loggedIn = !!(user && token);
    setAuthenticationStatus(loggedIn);
    return loggedIn;
  }, [user]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedIn = await isLoggedIn;
      console.log("is loggedIn: ", loggedIn);
      setAuthChecked(true);
    };

    checkLoginStatus();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("tknToken");
      setAuthenticationStatus(!!(token && user));

      if (token && !user) {
        setIsLoading(true);
      }
      if (!token && user) {
        mainStore.logout();
        setAuthenticationStatus(false);
      }
      if (user?.userstatus === 0) {
        mainStore.logout();
        setAuthenticationStatus(false);
      }
    } catch (error) {
      console.error("Auth status check failed:", error);
      setAuthenticationStatus(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = async () => {
    // Ensure token is completely cleared
    await AsyncStorage.removeItem("tknToken");
    queryClient.clear();
    queryClient.invalidateQueries();
    mainStore.logout();
    setAuthenticationStatus(false);
    router.push("/(user-management)/login");
    onLogout?.();
    console.log("🚀 file: useAuth.tsx, fn: logout , line 14");
  };

  const _userLogout = useMutation<{}, AxiosError<IResponseError>>({
    mutationFn: userLogout,
    onMutate: () => {
      logoutUser();
    },
    onError: (error) => {
      logoutUser();
    },
  });

  const _userLogin = useMutation<
    ILoginResponse,
    AxiosError<IResponseError>,
    ILoginDetails
  >({
    mutationFn: userLogin,
    onMutate: async (loginDetails) => {
      setIsLoggingIn(true);
      setIsLoading(true);

      // Clean up any existing authentication state first
      await logoutUser();

      // Store login identifier for validation later
      lastLoginIdentifier.current = loginDetails.identifier;

      // Add logging to see login details
      console.log(
        "Attempting login with credentials:",
        loginDetails.identifier
      );

      Toast.show({
        text1: "Logging in...",
        type: "success",
        position: "bottom",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
      });
    },
    onError: (error) => {
      console.log("🚀 file: useAuth.tsx, fn: onError , line 123", error);

      // Create a detailed error string for debugging
      const errorDetails = JSON.stringify(
        {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        },
        null,
        2
      );

      console.log("Detailed error:", errorDetails);
      Alert.alert("Login Error", error.message || "Unknown error occurred");

      Toast.show({
        text1: "Login failed",
        text2: error.message || "Unknown error occurred",
        type: "error",
        position: "bottom",
        visibilityTime: 6000,
        autoHide: true,
        topOffset: 30,
      });
      setIsLoggingIn(false);
      setIsLoading(false);
      logoutUser();
    },
    onSuccess: async (data) => {
      if (data?.token) {
        // Log the exact login response data to see what's coming from the server
        console.log(
          "LOGIN RESPONSE DATA:",
          JSON.stringify(
            {
              token: data.token,
              name: data.name,
              role: data.role,
              user: {
                id: data?.user?.id,
                user_code: data?.user?.user_code,
                existing_code: data?.user?.existing_code,
                nationalID: data?.user?.nationalID,
                name: data?.user?.name,
                gender: data?.user?.gender,
                email: data?.user?.email,
                dob: data?.user?.dob,
                date_enrollment: data?.user?.date_enrollment,
              },
            },
            null,
            2
          )
        );

        Toast.show({
          text1: "Loading essential data...",
          type: "success",
        });

        // First completely clear any existing tokens to prevent collisions
        await AsyncStorage.removeItem("tknToken");

        // Now store the new token
        const tokenStoredInCookie = await storeTokenInAsynStorage(data.token);
        if (!tokenStoredInCookie) {
          Toast.show({
            text1: "Failed to store authentication token",
            type: "error",
          });
          setIsLoggingIn(false);
          setIsLoading(false);
          return;
        }

        // Set auth status to true as soon as token is stored
        setAuthenticationStatus(true);

        try {
          console.log("Fetching user profile with token...");
          const profileData = await useGetCurrentLoggedInProfile();

          if (!profileData) {
            Toast.show({ text1: "Profile fetch failed", type: "error" });
            await logoutUser();
            return;
          }

          console.log(
            "PROFILE DATA RECEIVED:",
            JSON.stringify(
              {
                id: profileData.id,
                name: profileData.name,
                email: profileData.email,
                position: profileData.position,
              },
              null,
              2
            )
          );

          // Accept the profile data without validation since you confirmed
          // the API is working correctly and there's no need to verify email match

          const didStoreUserInfo = mainStore.login({
            userAccount: profileData,
          });
          console.log("User info stored in state:", 
            JSON.stringify(
              {
                user: {
                  id: profileData.id,
                  name: profileData.name,
                  email: profileData.email,
                  position: profileData.position,
                },
                didStoreUserInfo,
              },
              null,
              2
            )
          );
          if (didStoreUserInfo) {
            Toast.show({
              text1: "Login successful",
              type: "success",
              position: "bottom",
              visibilityTime: 3000,
              autoHide: true,
              topOffset: 30,
            });
            setIsLoggingIn(false);
            setIsLoading(false);
            onLogin?.(profileData);
          } else {
            Toast.show({
              text1: "Failed to store user data",
              type: "error",
              position: "bottom",
              visibilityTime: 3000,
              autoHide: true,
              topOffset: 30,
            });
            await logoutUser();
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          Toast.show({
            text1: "Error loading profile data",
            type: "error",
            position: "bottom",
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 30,
          });
          await logoutUser();
        }
      } else {
        Toast.show({
          text1: "Login failed. Please check your credentials",
          type: "error",
          position: "bottom",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 30,
        });
        setIsLoggingIn(false);
        setIsLoading(false);
        await logoutUser();
      }
    },
  });

  const login = _userLogin.mutate;
  const logout = _userLogout.mutate;

  return {
    login,
    user,
    logout,
    isLoggingIn,
    isLoggedIn,
    isLoading,
    authChecked,
  };
};

export async function storeTokenInAsynStorage(token: string) {
  try {
    console.log(
      "Storing token in AsyncStorage:",
      token.substring(0, 15) + "..."
    );
    await AsyncStorage.setItem("tknToken", token);
    const storedToken = await AsyncStorage.getItem("tknToken");
    const isStored = storedToken === token;
    console.log("Token stored successfully:", isStored);
    return isStored;
  } catch (error) {
    console.error("Error storing token:", error);
    return false;
  }
}
