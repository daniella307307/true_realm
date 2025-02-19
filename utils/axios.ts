import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const env = process.env['EXPO_PUBLIC_API_ENV'] || 'development';
export const BASE_URL = process.env['EXPO_PUBLIC_API_URL'];
console.log('The base url: ', BASE_URL);

const baseInstance = axios.create({
  baseURL: BASE_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

baseInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('tknToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

baseInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    console.log('The error:', error.response?.data);
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('tknToken'); // Ensure token is cleared
    }
    return Promise.reject(error);
  }
);

export { baseInstance };
