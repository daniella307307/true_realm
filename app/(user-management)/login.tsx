import React, { useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "~/components/Logo";
import { Text } from "~/components/ui/text";
import { Eye, EyeOff } from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomInput from "~/components/ui/input";
import { router } from "expo-router";
import { Modal, TouchableWithoutFeedback } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { ILoginDetails, loginSchema } from "~/types";
import { useAuth } from "~/lib/hooks/useAuth";

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { login, isLoggingIn } = useAuth({
    onLogin: (authUser) => {
      if (authUser.id !== undefined) {
        router.push("/(home)/home");
      } else {
        console.log("No token found");
        return;
      }
    },
  });

  const { control, handleSubmit } = useForm<ILoginDetails>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible((prev) => !prev);
  };

  const onSubmit = (data: ILoginDetails) => {
    console.log("Form Data:", data);
    login(data);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 justify-center items-center flex-col gap-y-12 p-8 bg-background">
      <Logo size={96} />
      <View className="w-full">
        <View>
          <Text className="mb-2 text-lg font-medium text-[#050F2B]">
            {t("Login.email")}
          </Text>
          <Controller
            control={control}
            name="email"
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <>
                <View
                  className={`flex flex-row items-center w-full border ${
                    error ? "border-primary" : "border-border"
                  } rounded-lg`}
                >
                  <TextInput
                    className="w-5/6 px-4 py-5 rounded-lg dark:text-white dark:bg-[#1E1E1E]"
                    placeholder={t("Login.emailPlaceholder")}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    accessibilityLabel={t("Login.email")}
                  />
                </View>
                {error && (
                  <Text className="text-red-500 mt-2">{error.message}</Text>
                )}
              </>
            )}
          />
        </View>

        <View className="mt-4">
          <Text className="mb-2 text-lg font-medium text-[#050F2B]">
            {t("Login.password")}
          </Text>
          <View>
            <Controller
              control={control}
              name="password"
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error },
              }) => (
                <>
                  <View
                    className={`flex flex-row items-center w-full border ${
                      error ? "border-primary" : "border-border"
                    } rounded-lg`}
                  >
                    <TextInput
                      className="w-5/6 px-4 py-5 rounded-lg dark:text-white dark:bg-[#1E1E1E]"
                      placeholder={t("Login.passwordPlaceholder")}
                      secureTextEntry={!passwordVisible}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel={t("Login.password")}
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      className="flex items-center justify-center ml-2"
                      accessibilityLabel={
                        passwordVisible
                          ? t("Login.Hide password")
                          : t("Login.Show password")
                      }
                    >
                      {passwordVisible ? (
                        <Eye width={24} height={24} stroke="#797979" />
                      ) : (
                        <EyeOff width={24} height={24} stroke="#797979" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {error && (
                    <Text className="text-red-500 mt-2">{error.message}</Text>
                  )}
                </>
              )}
            />
          </View>
        </View>

        <View>
          <Button
            className="my-6"
            variant="default"
            size="default"
            isLoading={isLoggingIn}
            onPress={handleSubmit(onSubmit)}
          >
            <Text className="text-white font-semibold">{t("Login.login")}</Text>
          </Button>
          <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text className="text-accent text-center">
              {t("Login.forgotPassword")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLanguageModalVisible(true)}
            className="mt-4"
          >
            <Text className="text-accent text-center">
              {t("Login.Select Language")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        transparent={true}
        visible={languageModalVisible}
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setLanguageModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black opacity-50" />
        </TouchableWithoutFeedback>

        <View className="bg-white p-6 rounded-lg w-full">
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
    </SafeAreaView>
  );
}
