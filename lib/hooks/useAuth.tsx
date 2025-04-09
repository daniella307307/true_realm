import { AxiosError } from 'axios';
import { useMemo, useState, useEffect } from 'react';
import { ILoginDetails, ILoginResponse, IResponseError, User } from '~/types';
import { useMainStore } from '../store/main';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  useGetCurrentLoggedInProfile,
  userLogin,
  userLogout,
} from '~/services/user';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthenticationStatus } from '~/utils/axios';
import { Alert } from 'react-native';

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

  const isLoggedIn = useMemo(async () => {
    const token = await AsyncStorage.getItem('tknToken');
    const loggedIn = !!(user && token);
    setAuthenticationStatus(loggedIn);
    return loggedIn;
  }, [user]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedIn = await isLoggedIn;
      console.log('is loggedIn: ', loggedIn);
      setAuthChecked(true);
    };

    checkLoginStatus();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('tknToken');
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
      console.error('Auth status check failed:', error);
      setAuthenticationStatus(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = () => {
    if (mainStore.logout()) {
      queryClient.clear();
      queryClient.invalidateQueries();
      AsyncStorage.removeItem('tknToken');
      setAuthenticationStatus(false);
      router.push('/(user-management)/login');
    }
    onLogout?.();
    console.log('🚀 file: useAuth.tsx, fn: logout , line 14');
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
      const token = await AsyncStorage.getItem('tknToken');
      if (token) {
        mainStore.logout();
        setAuthenticationStatus(false);
      }
      Toast.show({
        text1: 'Logging in...',
        type: 'success',
        position: 'bottom',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 30,
      });
    },
    onError: (error) => {
      console.log('🚀 file: useAuth.tsx, fn: onError , line 123', error);

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

      console.log('Detailed error:', errorDetails);
      Alert.alert(errorDetails);

      Toast.show({
        text1: errorDetails,
        text2: errorDetails,
        type: 'error',
        position: 'bottom',
        visibilityTime: 6000, // Longer time to read the error details
        autoHide: true,
        topOffset: 30,
      });
      setIsLoggingIn(false);
      setIsLoading(false);
    },
    onSuccess: async (data) => {
      if (data?.token) {
        Toast.show({
          text1: 'Loading essential data...',
          type: 'success',
        });
        const tokenStoredInCookie = await storeTokenInAsynStorage(data.token);
        if (!tokenStoredInCookie) throw new Error('Auth Token was not stored.');

        // Set auth status to true as soon as token is stored
        setAuthenticationStatus(true);

        const profileData = await useGetCurrentLoggedInProfile();
        if (!profileData) {
          Toast.show({ text1: 'Profile fetch failed', type: 'error' });
          setAuthenticationStatus(false);
          return;
        }
        const didStoreUserInfo = mainStore.login({ userAccount: profileData });
        if (didStoreUserInfo) {
          Toast.show({
            text1: 'Login successful',
            type: 'success',
            position: 'bottom',
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
          text1: 'Login failed. Please check your credentials',
          type: 'error',
          position: 'bottom',
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 30,
        });
        setIsLoggingIn(false);
        setIsLoading(false);
        setAuthenticationStatus(false);
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
    authChecked, // New property to track if auth has been checked
  };
};

export async function storeTokenInAsynStorage(token: string) {
  await AsyncStorage.setItem('tknToken', token);
  const storedToken = await AsyncStorage.getItem('tknToken');
  return storedToken === token;
}
