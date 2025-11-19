import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Animated,
  TouchableOpacity,
  Dimensions,
  BackHandler,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { useAuth } from "~/lib/hooks/useAuth";
import Slider from "@react-native-community/slider";
import { useFontSize } from "~/providers/FontSizeContext";
import { Text } from "./text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSQLite } from "~/providers/RealContextProvider";
import { IExistingForm } from "~/types";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.7;

interface CustomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomDrawer: React.FC<CustomDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth({});
  const { fontSize, setFontSize } = useFontSize();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const { query } = useSQLite();
  // State for modals
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [fontSizeModalVisible, setFontSizeModalVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  useEffect(() => {
    const backAction = () => {
      if (isOpen) {
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [isOpen, onClose]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    AsyncStorage.setItem("language", lang);
    setLanguageModalVisible(false);
  };
  
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "black",
                opacity: backdropOpacity,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View className="flex-1 pt-16">
            <TouchableOpacity
              className="p-4 border-b border-gray-200"
              onPress={() => {
                router.push("/(home)/home");
                onClose();
              }}
            >
              <Text className="text-lg">{t("SettingsPage.home")}</Text>
            </TouchableOpacity>
            {/* Account Settings */}
            <TouchableOpacity
              className="p-4 border-b border-gray-200"
              onPress={() => {
                router.push("/(settings)/");
                onClose();
              }}
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
            <TouchableOpacity
              className="p-4 border-b border-gray-200"
              onPress={() => {
                router.push("/(settings)/sync");
                onClose();
              }}
            >
              <Text className="text-lg">{t("SettingsPage.sync")}</Text>
            </TouchableOpacity>
            {/* Change Font Size */}
            {/* <TouchableOpacity
              className="p-4 border-b border-gray-200"
              onPress={() => setFontSizeModalVisible(true)}
            >
              <Text className="text-lg">
                {t("SettingsPage.change_font_size")}
              </Text>
            </TouchableOpacity> */}

            {/* Logout */}
            <TouchableOpacity
              className="p-4 border-b border-gray-200"
              onPress={()=>{
                logout()
                onClose()
              }
              }
            >
              <Text className="text-lg text-orange-500">{t("SettingsPage.logout")}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Language Modal */}
        <Modal transparent visible={languageModalVisible} animationType="slide">
          <TouchableWithoutFeedback
            onPress={() => setLanguageModalVisible(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50" />
          </TouchableWithoutFeedback>

          <View className="bg-white p-6 rounded-lg w-full max-w-md">
            <Text className="text-lg mb-4 text-center">
              {t("Login.Select Language")}
            </Text>

            <View className="space-y-4">
              <TouchableOpacity onPress={() => changeLanguage("en-US")}>
                <Text className="text-center text-lg font-semibold bg-slate-50 py-3 rounded-lg">
                  English
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-4"
                onPress={() => changeLanguage("rw-RW")}
              >
                <Text className="text-center text-lg font-semibold bg-slate-50 py-3 rounded-lg">
                  Kinyarwanda
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setLanguageModalVisible(false)}
              className="mt-6"
            >
              <Text className="text-center text-accent font-semibold">
                {t("Close")}
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Font Size Modal */}
        <Modal transparent visible={fontSizeModalVisible}>
          <TouchableWithoutFeedback
            onPress={() => setFontSizeModalVisible(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50" />
          </TouchableWithoutFeedback>

          <View className="bg-white p-6 rounded-t-lg w-full absolute bottom-0">
            <Text className="text-lg mb-4">
              {t("SettingsPage.change_font_size")}
            </Text>
            <Slider
              value={fontSize}
              onValueChange={setFontSize}
              minimumValue={12}
              maximumValue={24}
              step={1}
              minimumTrackTintColor="#A23A91"
              maximumTrackTintColor="#ddd"
            />
            <Text className="text-center mt-2">
              {t("SettingsPage.preview_text")}
            </Text>
            <TouchableOpacity
              onPress={() => setFontSizeModalVisible(false)}
              className="mt-4"
            >
              <Text className="text-center text-accent">
                {t("SettingsPage.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    left: 0,
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default CustomDrawer;

