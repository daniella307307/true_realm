import { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SplashScreen } from "expo-router";
import Logo from "~/components/Logo";
import { Text } from "~/components/ui/text";
import { Eye, EyeOff } from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ILoginDetails, loginSchema } from "~/types";
import { useAuth } from "~/lib/hooks/useAuth";
import Toast from "react-native-toast-message";
import { useAppData } from "~/providers/AppProvider";

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  
  // Access app data context for centralized data management
  const { refreshAllData, isRefreshing } = useAppData();

  // Ensure splash screen is hidden when login screen is shown
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
        setSplashHidden(true);
        console.log("App loaded - Login screen displayed");
      } catch (error) {
        // Splash might already be hidden, ignore error
        setSplashHidden(true);
      }
    };
    
    hideSplash();
  }, []);

  const { login, isLoggingIn } = useAuth({
    onLogin: async (authUser) => {
      if (authUser.id === undefined) {
        console.log("Authentication failed: No user ID found");
        Toast.show({
          type: "error",
          text1: t("Login.error"),
          text2: t("Login.authFailed"),
          position: "top",
        });
        return;
      }

      try {
        console.log("Authentication successful, starting data sync");
        Toast.show({
          type: "info",
          text1: t("Login.syncingData"),
          position: "top",
          autoHide: false,
        });
        
        // Use the centralized data refresh function
        await refreshAllData();
        
        console.log("Data sync completed, navigating to home");
        Toast.hide();
        Toast.show({
          type: "success",
          text1: t("Login.welcome"),
          text2: t("Login.loginSuccess"),
          position: "top",
        });
        
        // Navigate to home after successful sync
        router.replace("/(home)/home");
      } catch (error) {
        console.error("Data sync failed:", error);
        Toast.show({
          type: "error",
          text1: t("Login.syncFailed"),
          text2: t("Login.tryAgain"),
          position: "top",
        });
      }
    },
  });

  const { control, handleSubmit, formState: { errors } } = useForm<ILoginDetails>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible((prev) => !prev);
  };

  const onSubmit = (data: ILoginDetails) => {
    console.log("Login attempt with:", data.identifier);
    login(data);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
    
    Toast.show({
      type: "success",
      text1: t("Login.languageChanged"),
      position: "top",
      visibilityTime: 2000,
    });
  };

  // Display loading state if splash hasn't been hidden yet
  if (!splashHidden) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#A23A91" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 justify-center items-center flex-col gap-y-12 p-8 bg-background">
      <Logo size={96} />
      <KeyboardAvoidingView 
        className="w-full" 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
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
                    } rounded-lg overflow-hidden`}
                  >
                    <TextInput
                      className="flex-1 px-4"
                      placeholder={t("Login.emailOrPhonePlaceholder")}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel={t("Login.emailOrPhone")}
                      keyboardType="default"
                      autoCapitalize="none"
                      editable={!isLoggingIn && !isRefreshing}
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
                    } rounded-lg overflow-hidden`}
                  >
                    <TextInput
                      className="flex-1 px-4"
                      placeholder={t("Login.passwordPlaceholder")}
                      secureTextEntry={!passwordVisible}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel={t("Login.password")}
                      editable={!isLoggingIn && !isRefreshing}
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      className="px-4 h-full justify-center"
                      accessibilityLabel={
                        passwordVisible
                          ? t("Login.Hide password")
                          : t("Login.Show password")
                      }
                      disabled={isLoggingIn || isRefreshing}
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

          <View>
            <Button
              className="my-6"
              variant="default"
              size="default"
              isLoading={isLoggingIn || isRefreshing}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoggingIn || isRefreshing}
            >
              <Text className="text-white font-semibold">
                {isLoggingIn 
                  ? t("Login.loggingIn") 
                  : isRefreshing 
                    ? t("Login.syncingData") 
                    : t("Login.login")}
              </Text>
            </Button>
            
            <TouchableOpacity 
              onPress={() => router.push("/forgot-password")}
              disabled={isLoggingIn || isRefreshing}
            >
              <Text className={`text-accent text-center ${(isLoggingIn || isRefreshing) ? "opacity-50" : ""}`}>
                {t("Login.forgotPassword")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguageModalVisible(true)}
              className="mt-4"
              disabled={isLoggingIn || isRefreshing}
            >
              <Text className={`text-accent text-center ${(isLoggingIn || isRefreshing) ? "opacity-50" : ""}`}>
                {t("Login.Select Language")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Selection Modal */}
      <Modal
        transparent={true}
        visible={languageModalVisible}
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setLanguageModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50" />
        </TouchableWithoutFeedback>

        <View className="absolute top-1/3 left-4 right-4 bg-white p-6 rounded-lg max-w-md mx-auto shadow-lg">
          <Text className="text-lg mb-4 text-center font-bold">
            {t("Login.Select Language")}
          </Text>

          <View className="space-y-4">
            <TouchableOpacity 
              onPress={() => changeLanguage("en-US")}
              className="bg-slate-50 py-3 rounded-lg active:bg-slate-100"
            >
              <Text className="text-center text-lg font-semibold">
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeLanguage("rw-RW")}
              className="bg-slate-50 py-3 rounded-lg active:bg-slate-100"
            >
              <Text className="text-center text-lg font-semibold">
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