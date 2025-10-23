import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { INotifications } from '~/types';
import NetInfo from "@react-native-community/netinfo";
import { baseInstance } from '~/utils/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Configure notification behavior
Notifications.setNotificationHandler({
  // @ts-ignore
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export async function registerForPushNotificationsAsync() {
  let token;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PROJECT_ID,
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

// Show local notification
export async function showNotification(notification: INotifications) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.survey?.name_kin || notification.survey?.name || 'New Notification',
      body: notification.comment || '',
      data: { 
        id: notification.id,
        survey_result_id: notification.survey_result?.id,
        project_module_id: notification.form_data?.project_module_id,
        survey_id: notification.form_data?.survey_id,
      },
    },
    trigger: null, // null means show immediately
  });
}

// Show multiple notifications
export async function showMultipleNotifications(notifications: INotifications[]) {
  for (const notification of notifications) {
    if (notification.status !== 'resolved') {
      await showNotification(notification);
    }
  }
} 

Notifications.setNotificationHandler({
  // @ts-ignore
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Retry registration when network comes back online
export async function retryPushTokenRegistration() {
  try {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('[Push Token] Still offline, skipping retry');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PROJECT_ID,
    });

    await registerTokenWithBackend(tokenData.data);
  } catch (error) {
    console.log('[Push Token] Retry failed:', error);
  }
}


async function registerTokenWithBackend(expoPushToken: string): Promise<void> {
  try {
    // Check network connectivity first
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('[Push Token] Offline - will register when online');
      return;
    }

    
    const authToken = await AsyncStorage.getItem('authToken');
    
    if (!authToken) {
      console.log('[Push Token] No auth token available');
      return;
    }

    const response = await baseInstance.post(`/push-tokens`, {
      body: JSON.stringify({
        token: expoPushToken,
        platform: Platform.OS,
        device_name: Platform.select({
          ios: 'iOS Device',
          android: 'Android Device',
          default: 'Unknown Device',
        }),
      }),
      signal: AbortSignal.timeout(10000), 
    });

    if (!response.status) {
      throw new Error(`Server responded with ${response.status}`);
    }

    await response.data;
    console.log('[Push Token]  Successfully registered with backend');
  } catch (error) {
    if (error instanceof Error) {
      console.log('[Push Token]  Registration failed:', error.message);
    }
    // Don't throw - allow app to continue without push notifications
  }
}




