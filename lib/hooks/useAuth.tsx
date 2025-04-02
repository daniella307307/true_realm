import { AxiosError } from "axios";
import { useMemo, useState, useEffect } from "react";
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

type AuthOptions = {
  onLogin?: (data: User) => void;
  onLogout?: () => void;
};

export const useAuth = ({ onLogin, onLogout }: AuthOptions) => {
  const queryClient = useQueryClient();
  const mainStore = useMainStore();
  const user = useMemo(() => mainStore.user!, [mainStore.user]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggedIn = useMemo(async () => {
    const token = await AsyncStorage.getItem("tknToken");
    return !!(user && token);
  }, [user]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      console.log("is loggedIn: ", await isLoggedIn);
    };
    checkLoginStatus();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("tknToken");
      if (token && !user) {
        // You might want to validate the token here
        setIsLoading(true);
        // Add your token validation logic if needed
      }
      if (!token && user) {
        mainStore.logout();
      }
      if (user?.userstatus === 0) {
        mainStore.logout();
      }
    } catch (error) {
      console.error("Auth status check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = () => {
    if (mainStore.logout()) {
      queryClient.clear();
      queryClient.invalidateQueries();
      AsyncStorage.removeItem("tknToken");
      router.push("/(user-management)/login");
    }
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
    onMutate: async () => {
      setIsLoggingIn(true);
      setIsLoading(true);
      const token = await AsyncStorage.getItem("tknToken");
      if (token) {
        mainStore.logout();
      }
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
      console.log("🚀 file: useAuth.tsx, fn: onError , line 64", error);
      Toast.show({
        text1: "An error occurred",
        text2: error.response?.data?.message || "Please try again",
        type: "error",
        position: "bottom",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
      });
      setIsLoggingIn(false);
      setIsLoading(false);
    },
    onSuccess: async (data) => {
      if (data?.token) {
        Toast.show({
          text1: "Loading essential data...",
          type: "success",
        });
        const tokenStoredInCookie = await storeTokenInAsynStorage(data.token);
        if (!tokenStoredInCookie) throw new Error("Auth Token was not stored.");
        const profileData = await useGetCurrentLoggedInProfile();
        if (!profileData) {
          Toast.show({ text1: "Profile fetch failed", type: "error" });
          return;
        }
        const didStoreUserInfo = mainStore.login({ userAccount: profileData });
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
  };
};

async function storeTokenInAsynStorage(token: string) {
  await AsyncStorage.setItem("tknToken", token);
  const storedToken = await AsyncStorage.getItem("tknToken");
  return storedToken === token;
}
