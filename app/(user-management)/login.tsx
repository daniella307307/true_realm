import { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "~/components/Logo";
import { Text } from "~/components/ui/text";
import { Eye, EyeOff } from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Modal, TouchableWithoutFeedback } from "react-native";
import { ILoginDetails, loginSchema } from "~/types";
import { useAuth } from "~/lib/hooks/useAuth";
import { useGetAllProjects } from "~/services/project";
import { useGetAllModules } from "~/services/project";
import { useGetForms } from "~/services/formElements";
import { useGetStakeholders } from "~/services/stakeholders";
import { useGetIzus } from "~/services/izus";
import { useGetFamilies } from "~/services/families";
import { useGetPosts } from "~/services/posts";

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize all refresh functions
  const { refresh } = useGetAllProjects(true);
  const { refresh: refreshForms } = useGetForms(true);
  const { refresh: refreshStakeholders } = useGetStakeholders(true);
  const { refresh: refreshIzus } = useGetIzus(true);
  const { refresh: refreshFamilies } = useGetFamilies(true);
  const { refresh: refreshPosts } = useGetPosts(true);

  const syncData = async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      console.log("Syncing data...");
      await Promise.all([
        refresh(),
        refreshForms(),
        refreshStakeholders(), 
        refreshIzus(),
        refreshFamilies(),
        refreshPosts()
      ]);
      console.log("Data synced successfully");
      return true;
    } catch (error) {
      console.error('Error syncing data:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const { login, isLoggingIn } = useAuth({
    onLogin: async (authUser) => {
      if (authUser.id === undefined) {
        console.log("No token found");
        return;
      }

      // Start syncing data after successful authentication
      const syncSuccess = await syncData();
      
      // Only navigate to home if sync was successful
      if (syncSuccess) {
        router.push("/(home)/home");
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
      <KeyboardAvoidingView className="w-full" behavior="padding">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View>
            <Text className="mb-2 text-lg font-medium text-[#050F2B]">
              {t("Login.emailOrPhone")}
            </Text>
            <Controller
              control={control}
              name="identifier"
              render={({
                field: { onChange, onBlur, value },
                fieldState: { error },
              }) => (
                <>
                  <View
                    className={`flex flex-row h-16 items-center w-full border ${
                      error ? "border-primary" : "border-border"
                    } rounded-lg`}
                  >
                    <TextInput
                      className="px-4 rounded-lg"
                      placeholder={t("Login.emailOrPhonePlaceholder")}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel={t("Login.emailOrPhone")}
                      keyboardType="default"
                      autoCapitalize="none"
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
                      className={`flex flex-row h-16 items-center w-full border ${
                        error ? "border-primary" : "border-border"
                      } rounded-lg`}
                    >
                      <TextInput
                        className="w-5/6 px-4 rounded-lg"
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
              <Text className="text-white font-semibold">
                {t("Login.login")}
              </Text>
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
        </ScrollView>
      </KeyboardAvoidingView>

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
    </SafeAreaView>
  );
}
