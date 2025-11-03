import { AxiosError } from "axios";
import { useMemo, useState, useEffect, useRef } from "react";
import { ILoginDetails, ILoginResponse, IResponseError, User } from "~/types";
import { useMainStore } from "../store/main";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  updatePassword,
  userLogin,
  userLogout,
} from "~/services/user";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthenticationStatus } from "~/utils/axios";
import { useSQLite } from "~/providers/RealContextProvider";
import { useTranslation } from "react-i18next";
import { getPendingChangesCount } from "~/services/survey-submission";

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
  const { query } = sqlite;
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
        setAuthChecked(true);
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
        mainStore.logout();
        setAuthenticationStatus(false);
      }

      if (user?.userstatus === 0) {
        console.log("[Auth] User status is 0 - logging out");
        mainStore.logout();
        setAuthenticationStatus(false);
      }
    } catch (error) {
      console.error("[Auth] Auth status check failed:", error);
      setAuthenticationStatus(false);
    } finally {
      setIsLoading(false);
    }
  };

  const _userLogout = useMutation<{}, AxiosError<IResponseError>>({
    mutationFn: async () => {
      // Check if user exists
      if (!user?.id) {
        throw new Error("User ID not found");
      }
      if (!query) {
        console.error("SQLite query function not available");
        throw new Error("Database not ready. Please try again.");
      }

      console.log("Checking pending changes for user:", user.id);

      try {
        // Check for pending changes using SQLite query
        const pendingChanges = await getPendingChangesCount(query, user.id);

        console.log("Pending changes count:", pendingChanges);

        if (pendingChanges.total > 0) {
          // Show detailed pending changes message
          const details = [];
          if (pendingChanges.newSubmissions > 0) {
            details.push(`${pendingChanges.newSubmissions} new submission(s)`);
          }
          if (pendingChanges.modifiedSubmissions > 0) {
            details.push(`${pendingChanges.modifiedSubmissions} modified submission(s)`);
          }
          const message = `Cannot logout. You have ${pendingChanges.total} pending change(s): ${details.join(" and ")}. Please sync your changes before logging out.`;

          console.warn(message);
          Toast.show({
            type: "error",
            text1: t("Login.Logout.logout_prevented"),
            text2: t("Login.Logout.pending_sync", { count: pendingChanges.total }),
            visibilityTime: 5000,
            position: "top",
          });

          throw new Error("Pending changes exist. Logout aborted.");
        }

        // Only proceed with logout API call if no pending changes
        console.log("No pending changes found, proceeding with logout");
        return userLogout();
      } catch (error: any) {
        // Re-throw the error to be handled by onError
        console.error("Error during logout:", error);
        throw error;
      }
    },

    onSuccess: async () => {
      console.log("Logout API successful, clearing local data");
      // Only clear data after successful API logout
      await logoutUser();

      Toast.show({
        text1: t("Login.Logout.Success"),
        text2: t("Login.Logout.Success"),
        type: "success",
        position: "bottom",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
      });
    },

    onError: (error: any) => {
      console.error("Logout failed:", error);

      // Don't show error toast if it's the pending changes error
      // (already shown in mutationFn)
      if (error.message && !error.message.includes("Pending changes exist")) {
        Toast.show({
          text1: t("Auth.logout_failed"),
          text2: error.message || "Unknown error occurred",
          type: "error",
          position: "bottom",
          visibilityTime: 6000,
          autoHide: true,
          topOffset: 30,
        });
      }
    },
  });

  // ============================================
  // Additional: Check SQLite is properly initialized
  // ============================================

  // At the top of your useAuth hook, add this useEffect to verify SQLite:

  useEffect(() => {
    console.log("SQLite status in useAuth:", {
      hasQuery: !!query,
      queryType: typeof query,
      hasSQLite: !!sqlite,
    });
  }, [query, sqlite]);

  // ============================================
  // Updated _userLogout mutation in useAuth.tsx
  // ============================================

  const logoutUser = async () => {
    console.log("Clearing local data and navigating to login");

    // Clear all local data
    queryClient.clear();
    queryClient.invalidateQueries();
    mainStore.logout();
    setAuthenticationStatus(false);
    onLogout?.();

    // Clear the stored token and userId
    await AsyncStorage.removeItem("tknToken");
    await AsyncStorage.removeItem("userId");

    // Navigate to login screen
    router.replace("/(user-management)/login");
  };

  // Trigger logout
  const handleLogout = () => {
    _userLogout.mutate();
  };
  const _updatePasswordAuth = useMutation<
    { message: string },
    AxiosError<IResponseError>,
    { newPassword: string; identifier: string, verifyToken: string }
  >({
    mutationFn: async ({
      newPassword,
      identifier,
      verifyToken,
    }): Promise<{ message: string }> => {
      const result = await updatePassword(newPassword, identifier, verifyToken);
      return result;
    },
    onMutate: async ({ newPassword }) => {
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

      await logoutUser();

      lastLoginIdentifier.current = loginDetails.identifier;

      Toast.show({
        text1: t("Auth.logging_in"),
        type: "success",
        position: "bottom",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
      });
    },
    onError: (error: unknown) => {
      // Log everything for debugging
      console.log("onError called with:", error);

      const axiosError = error as AxiosError<IResponseError>;
      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data as any;

      // Extract server message more safely
      const serverMessage =
        responseData?.message ||
        responseData?.error ||
        responseData?.errors?.[0]?.message ||
        null;

      let userFriendlyMessage = "An unknown error occurred. Please try again.";

      if (status === 400 && serverMessage) {
        userFriendlyMessage = serverMessage;
      } else if (status === 401) {
        userFriendlyMessage = "Invalid credentials. Please try again.";
      } else if (status === 500) {
        userFriendlyMessage = "Server error. Please try again later.";
      } else if (serverMessage) {
        userFriendlyMessage = serverMessage;
      }

      console.error(
        "Detailed error in onError:",
        JSON.stringify(
          {
            message: axiosError.message,
            responseData,
            status,
            stack: (axiosError as any).stack,
          },
          null,
          2
        )
      );

      Toast.show({
        text1: "Login Failed",
        text2: userFriendlyMessage,
        type: "error",
        position: "top",
        visibilityTime: 6000,
      });

      setIsLoggingIn(false);
      setIsLoading(false);
      logoutUser();
    },


    onSuccess: async (data) => {
      if (data?.token) {
        Toast.show({
          text1: t("Auth.loading_essential_data"),
          type: "success",
        });

        // First completely clear any existing tokens to prevent collisions
        await AsyncStorage.removeItem("tknToken");
        await AsyncStorage.setItem("userId", data.user.id.toString());
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
          // const profileData = await getCurrentLoggedInProfile(userId);


          const profileData = data?.user;
          if (!profileData) {
            Toast.show({ text1: t("Auth.profile_fetch_failed"), type: "error" });
            await logoutUser();
            return;
          }
          const didStoreUserInfo = mainStore.login({
            userAccount: data?.user,
          });
        
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


            // First call onLogin to handle data sync
            onLogin?.(profileData);

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
