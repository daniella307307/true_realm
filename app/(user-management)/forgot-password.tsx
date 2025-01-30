import React from "react";
import { View, TouchableOpacity, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "~/components/Logo";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomInput from "~/components/ui/input";
import { router } from "expo-router";

const schema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .nonempty("Email is required"),
});

export default function ForgotScreen() {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = (data: any) => {
    console.log("Form Data:", data);
    // Handle form submission logic here
  };

  return (
    <SafeAreaView className="flex-1 justify-between items-center flex-col gap-y-12 p-8 bg-background">
      <View className="w-full flex-col items-center h-full justify-ceter gap-y-8">
        <Logo className="mt-14" />
        <View>
          <Text className="mb-2 text-xl text-center font-medium text-[#050F2B]">
            {t("ForgotPassword.title")}
          </Text>
          <Text className="text-[#6E7191] text-center">
            {t(
              "ForgotPassword.description"
            )}
          </Text>
        </View>

        <View className="w-full">
          <View className="mt-4">
            <Text className="mb-2 text-lg font-medium text-[#050F2B]">
              {t("ForgotPassword.email")}
            </Text>
            <CustomInput
              control={control}
              name="email"
              placeholder={t("ForgotPassword.emailPlaceholder")}
              keyboardType="email-address"
              accessibilityLabel={t("ForgotPassword.email")}
            />
          </View>

          <View>
            <Button
              variant="default"
              size="default"
              onPress={() => router.push("/password-verification-sent")}
            >
              <Text className="text-white font-semibold">{t("ForgotPassword.send")}</Text>
            </Button>
          </View>
        </View>
      </View>
      <TouchableOpacity className="absolue bottom-10">
        <View className="text-center flex-row justify-center items-center">
          <Text> {t("ForgotPassword.rememberPassword")}</Text>
          <Pressable onPress={() => router.push("/login")}>
            <Text className="text-primary font-semibold ml-1">
              {t("ForgotPassword.backToLogin")}
            </Text>
          </Pressable>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
