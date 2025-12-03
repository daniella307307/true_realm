// ~/utils/settingsActions.ts
import { Alert, Linking } from 'react-native';
import { COLORS } from '~/constants/colors';

export const SettingsActions = {
  editProfile: () => {
    Alert.alert(
      "Edit Profile",
      "Profile editing feature will be available in the next update.",
      [{ text: "OK" }]
    );
  },

  viewLocation: (locationName: string) => {
    Alert.alert(
      "Location Details",
      `Your registered location: ${locationName}`,
      [{ text: "OK" }]
    );
  },

  viewIncentives: (incentives: string[]) => {
    const incentiveList = incentives.map((inc, i) => `${i + 1}. ${inc}`).join('\n');
    Alert.alert(
      "Your Rewards & Incentives",
      incentiveList,
      [{ text: "Close" }]
    );
  },

  contactSupport: () => {
    Alert.alert(
      "Contact Support",
      "How can we help you?",
      [
        { text: "Email Support", onPress: () => Linking.openURL('mailto:support@example.com') },
        { text: "Call Support", onPress: () => Linking.openURL('tel:+1234567890') },
        { text: "Cancel", style: "cancel" }
      ]
    );
  },

  privacyPolicy: () => {
    Linking.openURL('https://example.com/privacy-policy').catch(() => {
      Alert.alert("Error", "Unable to open privacy policy");
    });
  },

  termsOfService: () => {
    Linking.openURL('https://example.com/terms').catch(() => {
      Alert.alert("Error", "Unable to open terms of service");
    });
  },

  logout: (onConfirm: () => void) => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: onConfirm, style: "destructive" }
      ]
    );
  }
};