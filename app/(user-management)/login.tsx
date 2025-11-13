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
import { Eye, EyeOff, WifiOff } from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ILoginDetails, loginSchema } from "~/types";
import { useAuth } from "~/lib/hooks/useAuth";
import Toast from "react-native-toast-message";
import { useAppData } from "~/providers/AppProvider";
import { useNetworkStatus } from "~/services/network";
import { checkNetworkConnection } from "~/utils/networkHelpers";

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(true);

  // Access app data context for centralized data management
  const { refreshAllData, isRefreshing } = useAppData();

  // Get network status
  const { isConnected } = useNetworkStatus();

  // Check network on component mount
  useEffect(() => {
    const checkNetwork = async () => {
      const networkAvailable = await checkNetworkConnection();
      setIsNetworkAvailable(networkAvailable);

      if (!networkAvailable) {
        Toast.show({
          type: "error",
          text1: t("Login.networkError"),
          text2: t("Login.checkConnection"),
          position: "top",
          visibilityTime: 5000,
        });
      }
    };

    checkNetwork();
  }, [isConnected]);

  // Ensure splash screen is hidden when login screen is shown
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
        setSplashHidden(true);
        // console.log("App loaded - Login screen displayed");
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
          text1: t("Login.syncingData", "Syncing data..."),
          position: "top",
          autoHide: false,
        });

        // Use the centralized data refresh function
        await refreshAllData();

        console.log("Data sync completed");
        Toast.hide();
        Toast.show({
          type: "success",
          text1: t("Login.welcome", "Welcome"),
          text2: t("Login.loginSuccess", "Login successful"),
          position: "bottom",
        });

        // Navigation is handled in useAuth based on is_password_changed
        // No navigation here to avoid conflicts
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

  const onSubmit = async (data: ILoginDetails) => {
    // Check network before attempting login
    const networkAvailable = await checkNetworkConnection();
    if (!networkAvailable) {
      setIsNetworkAvailable(false);
      Toast.show({
        type: "error",
        text1: t("Login.networkError"),
        text2: t("Login.checkConnection"),
        position: "top",
        visibilityTime: 5000,
      });
      return;
    }

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

  const retryConnection = async () => {
    const networkAvailable = await checkNetworkConnection();
    setIsNetworkAvailable(networkAvailable);

    if (networkAvailable) {
      Toast.show({
        type: "success",
        text1: t("Login.networkRestored"),
        position: "top",
        visibilityTime: 3000,
      });
    } else {
      Toast.show({
        type: "error",
        text1: t("Login.networkError"),
        text2: t("Login.checkConnection"),
        position: "top",
        visibilityTime: 5000,
      });
    }
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
      <Logo size={100}/>
      {/* Show offline warning if network is not available */}
      {!isNetworkAvailable && (
        <View className="bg-red-100 p-4 rounded-lg w-full flex-col items-center justify-between">
          <View className="flex-row items-center">
            <WifiOff width={24} height={24} stroke="#EF4444" />
            <Text className="ml-2 text-red-600 font-medium">
              {t("Login.offline")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={retryConnection}
            className="bg-red-600 px-3 py-1 rounded-md"
          >
            <Text className="text-white">
              {t("Login.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
                    className={`flex flex-row h-16 items-center w-full border ${error ? "border-primary" : "border-border"
                      } rounded-lg overflow-hidden`}
                  >
                    <TextInput
                      className="flex-1 px-4  placeholder:text-muted-foreground dark:text-foreground dark:placeholder:text-muted-foreground"
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
                    className={`flex flex-row h-16 items-center w-full border ${error ? "border-primary" : "border-border"
                      } rounded-lg overflow-hidden`}
                  >
                    <TextInput
                      className="flex-1 px-4  placeholder:text-muted-foreground dark:text-foreground dark:placeholder:text-muted-foreground"
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
              disabled={isLoggingIn || isRefreshing || !isNetworkAvailable}
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
          <View className="flex-1 justify-center items-center bg-black/50">
            <TouchableWithoutFeedback>
              <View className="mx-4 bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-gray-100">
                {/* Header */}
                <View className="mb-6">
                  <Text className="text-2xl font-bold text-center text-gray-900">
                    {t("Login.Select Language")}
                  </Text>
                  <Text className="text-sm text-gray-500 text-center mt-2">
                    {t("Login.choose_language")}
                  </Text>
                </View>

                {/* Language Options */}
                <View className="gap-3">
                  <TouchableOpacity
                    onPress={() => changeLanguage("en-US")}
                    className="border-2 border-blue-100 py-4 px-5 rounded-xl active:bg-blue-100 active:border-blue-200 flex-row items-center justify-between"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                     
                      <Text className="text-gray-900 text-lg font-semibold">
                        English
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => changeLanguage("rw-RW")}
                    className="border-2 border-orange-100 py-4 px-5 rounded-xl active:bg-orange-100 active:border-orange-200 flex-row items-center justify-between"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      
                      <Text className="text-gray-900 text-lg font-semibold">
                        Kinyarwanda
                      </Text>
                    </View>
                    
                  </TouchableOpacity>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setLanguageModalVisible(false)}
                  className="mt-6 py-3 bg-red-100 rounded-xl active:bg-gray-200"
                  activeOpacity={0.7}
                >
                  <Text className="text-center text-gray-700 font-semibold text-base">
                    {t("Close")}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}