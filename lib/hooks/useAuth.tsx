import { AxiosError } from "axios";
import { useMemo, useState, useEffect, useRef } from "react";
import { ILoginDetails, ILoginResponse, IResponseError, User } from "~/types";
import { useMainStore } from "../store/main";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  updatePassword,
  getCurrentLoggedInProfile,
  userLogin,
  userLogout,
} from "~/services/user";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthenticationStatus } from "~/utils/axios";
import { Alert } from "react-native";
import { useSQLite } from "~/providers/RealContextProvider";
import { useTranslation } from "react-i18next";

export type AuthOptions = {
  onLogin?: (data: User) => void;
  onLogout?: () => void;
};

export const useAuth = ({ onLogin, onLogout }: AuthOptions) => {
  const queryClient = useQueryClient();
  const mainStore = useMainStore();
  const user = useMemo(() => mainStore.user!, [mainStore.user]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const lastLoginIdentifier = useRef<string | null>(null);
  const sqlite = useSQLite();
  const { t } = useTranslation();
  const isLoggedIn = useMemo(async () => {
    try {
      const token = await AsyncStorage.getItem("tknToken");
      const loggedIn = !!(user && token);
      console.log("[Auth] Token exists:", !!token, "User exists:", !!user, "Is logged in:", loggedIn);
      setAuthenticationStatus(loggedIn);
      return loggedIn;
    } catch (error) {
      console.error("[Auth] Error checking login status:", error);
      setAuthenticationStatus(false);
      return false;
    }
  }, [user]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const loggedIn = await isLoggedIn;
        console.log("[Auth] Login status check completed:", loggedIn);
        setAuthChecked(true);
      } catch (error) {
        console.error("[Auth] Error in checkLoginStatus:", error);
        setAuthChecked(true); // Still mark as checked even on error
      }
    };

    checkLoginStatus();
  }, [isLoggedIn]);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("tknToken");
      const hasValidAuth = !!(token && user);
      console.log("[Auth] Checking auth status - Token:", !!token, "User:", !!user);
      
      setAuthenticationStatus(hasValidAuth);

      if (token && !user) {
        console.log("[Auth] Token exists but no user - setting loading");
        setIsLoading(true);
      }
      
      if (!token && user) {
        console.log("[Auth] No token but user exists - logging out");
        await mainStore.logout();
        setAuthenticationStatus(false);
      }
      
      if (user?.userstatus === 0) {
        console.log("[Auth] User status is 0 - logging out");
        await mainStore.logout();
        setAuthenticationStatus(false);
      }
    } catch (error) {
      console.error("[Auth] Auth status check failed:", error);
      setAuthenticationStatus(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = async () => {
    // Ensure token is completely cleared
    queryClient.clear();
    queryClient.invalidateQueries();
    mainStore.logout();
    setAuthenticationStatus(false);
    onLogout?.();
    console.log("🚀 file: useAuth.tsx, fn: logout , line 14");
    
    // Clear the stored token
    await AsyncStorage.removeItem("tknToken");
    
    // Navigate to login screen
    router.replace("/(user-management)/login");
  };

  const _userLogout = useMutation<{}, AxiosError<IResponseError>>({
    mutationFn: () => userLogout(sqlite),
    onMutate: () => {
      logoutUser();
    },
    onError: (error) => {
      logoutUser();
    },
  });

  const _updatePasswordAuth = useMutation<
    { message: string },
    AxiosError<IResponseError>,
    { password: string; identifier: string }
  >({
    mutationFn: async ({
      password,
      identifier,
    }): Promise<{ message: string }> => {
      const result = await updatePassword(password, identifier);
      return result;
    },
    onMutate: async ({ password }) => {
      setIsUpdatingPassword(true);
      Toast.show({
        text1: t("Auth.updating_password"),
        type: "info",
        position: "bottom",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
      });
    },
    onError: (error) => {
      console.error("Password update failed:", error);
      Toast.show({
        text1: t("Auth.password_update_failed"),
        text2: error.message || "Unknown error occurred",
        type: "error",
        position: "bottom",
        visibilityTime: 6000,
        autoHide: true,
        topOffset: 30,
      });
      setIsUpdatingPassword(false);
    },
    onSuccess: async (data) => {
      // Show success message from the API response
      Toast.show({
        text1: data.message || t("Auth.password_update_success"),
        type: "success",
        position: "bottom",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
      });
      setIsUpdatingPassword(false);

      // Logout the user and clear any existing tokens
      await logoutUser();

      // Navigate to login page after successful password update
      router.replace("/(user-management)/login");
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
        text1: t("Auth.logging_in"),
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
        text1: t("Auth.login_failed"),
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
          text1: t("Auth.loading_essential_data"),
          type: "success",
        });

        // First completely clear any existing tokens to prevent collisions
        await AsyncStorage.removeItem("tknToken");

        // Now store the new token
        const tokenStoredInCookie = await storeTokenInAsynStorage(data.token);
        if (!tokenStoredInCookie) {
          Toast.show({
            text1: t("Auth.failed_to_store_token"),
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
          const profileData = await getCurrentLoggedInProfile();

          if (!profileData) {
            Toast.show({ text1: t("Auth.profile_fetch_failed"), type: "error" });
            await logoutUser();
            return;
          }

          const didStoreUserInfo = mainStore.login({
            userAccount: profileData,
          });
          console.log(
            "User info stored in state:",
            JSON.stringify(
              {
                user: {
                  id: profileData.id,
                  name: profileData.name,
                  email: profileData.email,
                  position: profileData.position,
                  is_password_changed: profileData.is_password_changed,
                },
                didStoreUserInfo,
              },
              null,
              2
            )
          );
          console.log("didStoreUserInfo", didStoreUserInfo);
          if (didStoreUserInfo) {
            Toast.show({
              text1: t("Auth.login_success"),
              type: "success",
              position: "bottom",
              visibilityTime: 3000,
              autoHide: true,
              topOffset: 30,
            });
            setIsLoggingIn(false);
            setIsLoading(false);

            console.log("is_password_changed: ", profileData.is_password_changed);
            
            // First call onLogin to handle data sync
            await onLogin?.(profileData);
            
            // Then handle navigation based on password status
            if (profileData.is_password_changed === 0) {
              console.log(t("Auth.password_needs_change"));
              // Navigate to password update screen with identifier
              router.replace({
                pathname: "/(user-management)/update-password",
                params: { identifier: lastLoginIdentifier.current },
              });
            } else {
              console.log(t("Auth.password_already_changed"));
              // Navigate to home screen
              router.replace("/(home)/home");
            }
          } else {
            Toast.show({
              text1: t("Auth.failed_to_store_user_data"),
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
            text1: t("Auth.error_loading_profile"),
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
          text1: t("Auth.login_failed"),
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
  const updatePasswordAuth = _updatePasswordAuth.mutate;

  return {
    login,
    user,
    logout,
    updatePasswordAuth,
    isLoggingIn,
    isUpdatingPassword,
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
