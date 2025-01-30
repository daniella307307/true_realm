import { AxiosError } from "axios";
import { useMemo, useState, useEffect } from "react";
import {
  ILoginDetails,
  ILoginResponse,
  IResponseError,
} from "~/types";
import { useMainStore } from "../store/main";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { userLogin, userLogout } from "~/services/user";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthOptions = {
  onLogin?: (data: ILoginResponse) => void;
  onLogout?: () => void;
};

export const useAuth = ({ onLogin, onLogout }: AuthOptions) => {
  const queryClient = useQueryClient();
  const mainStore = useMainStore();
  const user = useMemo(() => mainStore.user!, [mainStore.user]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggedIn = useMemo(() => !!user, [user]);

  useEffect(() => {
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
          position: "bottom",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 30,
        });

        // 1. store token in cookie storage
        const tokenStoredInCookie = await storeTokenInAsynStorage(data.token);

        if (!tokenStoredInCookie)
          throw new Error("Auth Token was not stored in cookie.");

        // 2. fetch the information of the logged in user
        const authUser = data;

        // if not authUser, return null
        if (!authUser) {
          Toast.show({
            text1: "An error occurred",
            text2: "Please try again",
            type: "error",
            position: "bottom",
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 30,
          });
          setIsLoggingIn(false);
          setIsLoading(false);
          return;
        }

        // 3. Now that we have the user's information, we save them in a persisted state
        const didStoreUserInfo = mainStore.login({ userAccount: authUser! });

        // 4. If the user's information was saved successfully, we call the onLogin callback
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
          onLogin?.(authUser!);
        }
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