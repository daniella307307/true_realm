import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const env = process.env['EXPO_PUBLIC_API_ENV'] || 'development';
export const BASE_URL = process.env['EXPO_PUBLIC_API_URL'];
console.log('The base url: ', BASE_URL);

// Create a flag to track authentication status
let isAuthenticated = false;

// Function to update authentication status - call this from useAuth
export const setAuthenticationStatus = (status: boolean) => {
  isAuthenticated = status;
  console.log('Authentication status updated:', isAuthenticated);
};

// Define routes that don't require authentication
const publicRoutes = [
  '/login',
  '/user/reset-password',
  '/user/verify-code'
];

const baseInstance = axios.create({
  baseURL: BASE_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

baseInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Check if the current route is public (doesn't require auth)
      const isPublicRoute = publicRoutes.some(route => 
        config.url?.endsWith(route)
      );
      
      // Set auth header if token exists
      const token = await AsyncStorage.getItem('tknToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        isAuthenticated = true;
      } else {
        isAuthenticated = false;
      }
      
      // Only proceed with request if authenticated or it's a public route
      if (!isAuthenticated && !isPublicRoute) {
        console.log('Preventing API call to protected route when not authenticated:', config.url);
        // Return a rejected promise to prevent the request
        return Promise.reject(new Error('User not authenticated'));
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
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('tknToken');
      isAuthenticated = false;
    }
    return Promise.reject(error);
  }
);

export { baseInstance };