import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "~/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PasswordVerificationSent() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 justify-center items-center flex-col gap-y-12 p-8 bg-background">
      <View>
        <Text className="mb-2 text-xl text-center font-medium text-[#050F2B]">
          {t("PasswordVerification.description")}
        </Text>
        <Text className="text-[#6E7191] text-center">
          {t("PasswordVerification.didNotReceive")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
