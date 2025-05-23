import { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "~/components/Logo";
import { Text } from "~/components/ui/text";
import { Eye, EyeOff } from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "~/lib/hooks/useAuth";
import Toast from "react-native-toast-message";
import { checkNetworkConnection } from "~/utils/networkHelpers";
import { z } from "zod";
import { t } from "i18next";
import HeaderNavigation from "~/components/ui/header";

const updatePasswordSchema = z
  .object({
    password: z.string().min(6, t("UpdatePassword.passwordMinLength")),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t("UpdatePassword.passwordMismatch"),
    path: ["confirmPassword"],
  });

type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordScreen() {
  const { t } = useTranslation();
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(true);
  const { updatePasswordAuth, isUpdatingPassword } = useAuth({});

  // Redirect if no identifier is provided
  useEffect(() => {
    if (!identifier) {
      Toast.show({
        type: "error",
        text1: t("UpdatePassword.error"),
        text2: t("UpdatePassword.missingIdentifier"),
        position: "top",
        visibilityTime: 5000,
      });
      router.replace("/(user-management)/login");
    }
  }, [identifier]);

  // Check network on component mount
  useEffect(() => {
    const checkNetwork = async () => {
      const networkAvailable = await checkNetworkConnection();
      setIsNetworkAvailable(networkAvailable);

      if (!networkAvailable) {
        Toast.show({
          type: "error",
          text1: t("UpdatePassword.networkError"),
          text2: t("UpdatePassword.checkConnection"),
          position: "top",
          visibilityTime: 5000,
        });
      }
    };

    checkNetwork();
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordForm>({
    resolver: zodResolver(updatePasswordSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible((prev) => !prev);
  };

  const onSubmit = async (data: UpdatePasswordForm) => {
    // Check network before attempting update
    const networkAvailable = await checkNetworkConnection();
    if (!networkAvailable) {
      setIsNetworkAvailable(false);
      Toast.show({
        type: "error",
        text1: t("UpdatePassword.networkError"),
        text2: t("UpdatePassword.checkConnection"),
        position: "top",
        visibilityTime: 5000,
      });
      return;
    }

    if (!identifier) {
      Toast.show({
        type: "error",
        text1: t("UpdatePassword.error"),
        text2: t("UpdatePassword.missingIdentifier"),
        position: "top",
        visibilityTime: 5000,
      });
      return;
    }

    updatePasswordAuth({ password: data.password, identifier });
  };

  return (
    <SafeAreaView className="flex-1 justify-center items-center flex-col gap-y-12 p-8 bg-background">
      <HeaderNavigation
        showLeft={false}
        showRight={false}
        showLogo={true}
        logoSize={32}
      />
      <View>
        <Text className="text-2xl font-bold text-center">
          {t("UpdatePassword.title")}
        </Text>
        <Text className="text-sm text-center text-gray-500">
          {t("UpdatePassword.subtitle")}
        </Text>
      </View>

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
              {t("UpdatePassword.newPassword")}
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
                      placeholder={t("UpdatePassword.newPasswordPlaceholder")}
                      secureTextEntry={!passwordVisible}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel={t(
                        "UpdatePassword.newPassword"
                      )}
                      editable={!isUpdatingPassword}
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      className="px-4 h-full justify-center"
                      accessibilityLabel={
                        passwordVisible
                          ? t("UpdatePassword.hidePassword")
                          : t("UpdatePassword.showPassword")
                      }
                      disabled={isUpdatingPassword}
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

          <View className="mt-4">
            <Text className="mb-2 text-lg font-medium text-[#050F2B]">
              {t("UpdatePassword.confirmPassword")}
            </Text>
            <Controller
              control={control}
              name="confirmPassword"
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
                      placeholder={t(
                        "UpdatePassword.confirmPasswordPlaceholder"
                      )}
                      secureTextEntry={!confirmPasswordVisible}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel={t(
                        "UpdatePassword.confirmPassword"
                      )}
                      editable={!isUpdatingPassword}
                    />
                    <TouchableOpacity
                      onPress={toggleConfirmPasswordVisibility}
                      className="px-4 h-full justify-center"
                      accessibilityLabel={
                        confirmPasswordVisible
                          ? t("UpdatePassword.hidePassword")
                          : t("UpdatePassword.showPassword")
                      }
                      disabled={isUpdatingPassword}
                    >
                      {confirmPasswordVisible ? (
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
              isLoading={isUpdatingPassword}
              onPress={handleSubmit(onSubmit)}
              disabled={isUpdatingPassword || !isNetworkAvailable}
            >
              <Text className="text-white font-semibold">
                {isUpdatingPassword
                  ? t("UpdatePassword.updating")
                  : t("UpdatePassword.update")}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
