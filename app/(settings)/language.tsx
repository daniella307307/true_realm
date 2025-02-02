import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import React, { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';

const LanguageScreen = () => {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
  };

  return (
    <View className="flex-1 bg-background p-4">
      <TouchableOpacity
        onPress={() => setLanguageModalVisible(true)}
        className="mt-4"
      >
        <Text className="text-accent text-center">
          {t("Login.Select Language")}
        </Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={languageModalVisible}
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLanguageModalVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black/50" />
        </TouchableWithoutFeedback>

        <View className="bg-white p-6 rounded-t-lg w-full absolute bottom-0">
          <Text className="text-lg mb-4">{t("Login.Select Language")}</Text>
          <Picker selectedValue={i18n.language} onValueChange={changeLanguage}>
            <Picker.Item label="English" value="en-US" />
            <Picker.Item label="Kinyarwanda" value="rw-RW" />
          </Picker>
          <TouchableOpacity
            onPress={() => setLanguageModalVisible(false)}
            className="mt-4"
          >
            <Text className="text-center text-accent">{t("Close")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default LanguageScreen;