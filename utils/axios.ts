import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';

const env = process.env['EXPO_PUBLIC_API_ENV'] || 'development';
export const BASE_URL = process.env['EXPO_PUBLIC_API_URL'];
console.log('The base url: ', BASE_URL);

const baseInstance = axios.create({
  baseURL: BASE_URL + '/api',
});

function baseRequestInterceptor(config: InternalAxiosRequestConfig) {
  const token = AsyncStorage.getItem('tknToken');

  if (!config.url?.includes('/login')) {
    config.headers['Authorization'] = token ? `Bearer ${token}` : undefined;
  }
  return config;
}
function baseRequestSuccessResponseInterceptor(response: AxiosResponse) {
  return response;
}

function baseRequestErrorResponseInterceptor(error: AxiosError) {
  const status = error.response?.status;
  const url = error.request.responseURL;

  if (status === 401) {
    // if this is not a login request or chart request
    if (!url?.includes('/login') && !url?.includes('chart')) {
      AsyncStorage.removeItem('tknToken');
      router.push('/(user-management)/login');
    }
  }
  return Promise.reject(error);
}

baseInstance.interceptors.request.use(baseRequestInterceptor);

baseInstance.interceptors.response.use(baseRequestSuccessResponseInterceptor, baseRequestErrorResponseInterceptor);

export { baseInstance };
