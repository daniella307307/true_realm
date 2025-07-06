import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { INotifications } from '~/types';

// Configure notification behavior
Notifications.setNotificationHandler({
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
      title: notification.survey?.name || 'New Notification',
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