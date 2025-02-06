import { View, TouchableOpacity, Modal, TouchableWithoutFeedback } from "react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "./text";
import { router } from "expo-router";
import { useAuth } from "~/lib/hooks/useAuth";
import { Picker } from "@react-native-picker/picker";
import Slider from "@react-native-community/slider";
import { useFontSize } from "~/providers/FontSizeContext";

const CustomDrawerContent = () => {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth({});
  const { fontSize, setFontSize } = useFontSize();

  // State for modals
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [fontSizeModalVisible, setFontSizeModalVisible] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
  };

  return (
    <View className="flex-1 pt-16">
      {/* Account Settings */}
      <TouchableOpacity
        className="p-4 border-b border-gray-200"
        onPress={() => router.push("/(settings)/")}
      >
        <Text className="text-lg">{t("SettingsPage.account")}</Text>
      </TouchableOpacity>

      {/* Change Language */}
      <TouchableOpacity
        className="p-4 border-b border-gray-200"
        onPress={() => setLanguageModalVisible(true)}
      >
        <Text className="text-lg">{t("SettingsPage.change_language")}</Text>
      </TouchableOpacity>

      {/* Change Font Size */}
      <TouchableOpacity
        className="p-4 border-b border-gray-200"
        onPress={() => setFontSizeModalVisible(true)}
      >
        <Text className="text-lg">{t("SettingsPage.change_font_size")}</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity className="p-4 border-b border-gray-200" onPress={() => logout()}>
        <Text className="text-lg text-red-500">{t("Logout")}</Text>
      </TouchableOpacity>

      {/* Language Modal */}
      <Modal transparent visible={languageModalVisible} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setLanguageModalVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black/50" />
        </TouchableWithoutFeedback>

        <View className="bg-white p-6 rounded-t-lg w-full absolute bottom-0">
          <Text className="text-lg mb-4">{t("Login.Select Language")}</Text>
          <Picker selectedValue={i18n.language} onValueChange={changeLanguage}>
            <Picker.Item label="English" value="en-US" />
            <Picker.Item label="Kinyarwanda" value="rw-RW" />
          </Picker>
          <TouchableOpacity onPress={() => setLanguageModalVisible(false)} className="mt-4">
            <Text className="text-center text-accent">{t("SettingsPage.close")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Font Size Modal */}
      <Modal transparent visible={fontSizeModalVisible} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setFontSizeModalVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black/50" />
        </TouchableWithoutFeedback>

        <View className="bg-white p-6 rounded-t-lg w-full absolute bottom-0">
          <Text className="text-lg mb-4">{t("SettingsPage.change_font_size")}</Text>
          <Slider
            value={fontSize}
            onValueChange={setFontSize}
            minimumValue={12}
            maximumValue={24}
            step={1}
            minimumTrackTintColor="#A23A91"
            maximumTrackTintColor="#ddd"
          />
          <Text className="text-center mt-2">{t("SettingsPage.preview_text")}</Text>
          <TouchableOpacity onPress={() => setFontSizeModalVisible(false)} className="mt-4">
            <Text className="text-center text-accent">{t("SettingsPage.close")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default CustomDrawerContent;
