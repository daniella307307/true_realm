import React, { useState } from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { useTranslation } from "react-i18next";
import HeaderNavigation from "~/components/ui/header";
import { useMutation } from "@tanstack/react-query";
import {
  useGetCurrentLoggedInProfile,
  verifyPasswordReset,
} from "~/services/user";
import { storeTokenInAsynStorage, useAuth } from "~/lib/hooks/useAuth";
import { setAuthenticationStatus } from "~/utils/axios";
import { useMainStore } from "~/lib/store/main";

const CELL_COUNT = 4;

const maskEmail = (email: string | undefined | string[]): string => {
  if (typeof email !== "string" || !email) {
    return "your email";
  }
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "your email";
  const maskedLocalPart =
    localPart.length > 3
      ? `${localPart.substring(0, 3)}****`
      : `${localPart}****`;

  return `${maskedLocalPart}@${domain}`;
};

const PasswordVerificationScreen: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { email } = useLocalSearchParams<{ email: string }>();
  const mainStore = useMainStore();
  const [, setIsLoggingIn] = useState<boolean>(false);
  const { login } = useAuth({
    onLogin: async (authUser) => {
      if (authUser.id !== undefined) {
        setIsLoggingIn(true);
        setLoading(true);
      }
    },
  });
  const ref = useBlurOnFulfill({ value: code, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });

  const verificationMutation = useMutation({
    mutationFn: ({ identifier, code }: { identifier: string; code: string }) =>
      verifyPasswordReset(identifier, code),
    onSuccess: async (data) => {
      if (data?.token) {
        Toast.show({
          text1: "Loading essential data...",
          type: "success",
        });
        const tokenStoredInCookie = await storeTokenInAsynStorage(data.token);
        if (!tokenStoredInCookie) throw new Error("Auth Token was not stored.");

        setAuthenticationStatus(true);

        const profileData = await useGetCurrentLoggedInProfile();
        if (!profileData) {
          Toast.show({ text1: "Profile fetch failed", type: "error" });
          setAuthenticationStatus(false);
          return;
        }
        const didStoreUserInfo = mainStore.login({ userAccount: profileData });
        if (didStoreUserInfo) {
          Toast.show({
            text1: "Login successful",
            type: "success",
            position: "bottom",
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 30,
          });
          setIsLoggingIn(false);
          setLoading(false);
        }
        router.push("/(home)/home")
      }
    },
    onError: (error) => {
      console.log("🚀 file: useAuth.tsx, fn: onError , line 123", error);

      // Create a detailed error string for debugging
      const errorDetails = JSON.stringify(
        {
          message: error.message,
          response: (error as any)?.response?.data,
          status: (error as any)?.response?.status,
        },
        null,
        2
      );

      console.log("Detailed error:", errorDetails);

      Toast.show({
        // text1: 'Login Error [DEV]',
        // text2: `${error.response?.status || ''}: ${JSON.stringify(error.response?.data) || error.message || 'Unknown error'}`,
        text1: errorDetails,
        text2: errorDetails,
        type: "error",
        position: "bottom",
        visibilityTime: 6000, // Longer time to read the error details
        autoHide: true,
        topOffset: 30,
      });
      setIsLoggingIn(false);
      setLoading(false);
    },
  });

  const handleCodeSubmit = async () => {
    setError(null);

    if (code.length !== CELL_COUNT) {
      setError(
        t(
          "PasswordVerification.invalidCodeLength",
          "Please enter a 4-digit code."
        )
      );
      return;
    }

    if (!email) {
      setError(
        t("PasswordVerification.emailMissing", "Email address not found.")
      );
      return;
    }

    verificationMutation.mutate({
      identifier: email,
      code,
    });
  };
  return (
    <SafeAreaView className="flex-1 h-screen bg-white">
      <HeaderNavigation
        title={t("PasswordVerification.headerTitle", "Verify Code")}
        showLeft={true}
        showRight={false}
      />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-quicksandBold text-xl">
          {t("PasswordVerification.title", "Enter Verification Code")}
        </Text>
        <Text className="font-quicksandMedium text-slate-600 mb-6">
          {t(
            "PasswordVerification.description",
            "Enter the 4-digit code sent to {email}",
            { email: maskEmail(email) }
          )}
        </Text>

        <View className="mb-6">
          <CodeField
            ref={ref}
            {...props}
            value={code}
            onChangeText={(text) => {
              setError(null); // Clear error on change
              setCode(text);
            }}
            cellCount={CELL_COUNT}
            keyboardType="number-pad"
            textContentType="oneTimeCode" // Helps with autofill
            renderCell={({ index, symbol, isFocused }) => (
              <View
                key={index}
                onLayout={getCellOnLayoutHandler(index)}
                className={`w-16 h-16 border flex-row items-center justify-center rounded-xl ${
                  error
                    ? "border-red-500"
                    : isFocused
                    ? "border-primary"
                    : "border-slate-400"
                }`}
              >
                <Text className="text-2xl font-semibold">
                  {symbol || (isFocused ? <Cursor /> : null)}
                </Text>
              </View>
            )}
            rootStyle={{ justifyContent: "space-between" }}
          />
          {error && <Text className="text-red-500 text-xs pt-4">{error}</Text>}
        </View>

        <Button
          onPress={handleCodeSubmit}
          isLoading={isLoading}
          disabled={code.length !== CELL_COUNT || isLoading}
        >
          <Text>{t("PasswordVerification.verify", "Verify")}</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PasswordVerificationScreen;
