import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

const SettingsScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const settingsOptions = [
    {
      title: t("Account"),
      route: '/(settings)/account',
    },
    {
      title: t('Language'),
      route: '/(settings)/language',
    },
    {
      title: t('Font size'),
      route: '/(settings)/fontsize',
    },
  ];

  return (
    <View className="flex-1 bg-background p-4">
      {settingsOptions.map((option, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => router.push(option.route as Href)}
          className="flex-row justify-between items-center p-4 border-b-2 border-gray-100 rounded-lg mb-3"
        >
          <Text className="text-lg font-medium">{option.title}</Text>
          <Text className="text-gray-400">›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default SettingsScreen;