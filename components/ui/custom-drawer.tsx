import { View, TouchableOpacity } from "react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Text } from "./text";
import { router } from "expo-router";
import { useAuth } from "~/lib/hooks/useAuth";

const CustomDrawerContent = () => {
  const { t } = useTranslation();
  const { logout } = useAuth({});

  return (
    <View className="flex-1 pt-16">
      <TouchableOpacity
        className="p-4 border-b border-gray-200"
        onPress={() => router.push("/(settings)/account")}
      >
        <Text className="text-lg">{t("Account")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="p-4 border-b border-gray-200"
        onPress={() => router.push("/(settings)/language")}
      >
        <Text className="text-lg">{t("Change Language")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="p-4 border-b border-gray-200"
        onPress={() => router.push("/(settings)/fontsize")}
      >
        <Text className="text-lg">{t("Change Font Size")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="p-4 border-b border-gray-200"
        onPress={() => logout()}
      >
        <Text className="text-lg text-red-500">{t("Logout")}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CustomDrawerContent;
