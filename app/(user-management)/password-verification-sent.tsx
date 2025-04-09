import React, { useState } from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { useTranslation } from "react-i18next"; // Changed from i18next
import HeaderNavigation from "~/components/ui/header";
import { useMutation } from "@tanstack/react-query";
import { verifyPasswordReset } from "~/services/user";
import { IResponseError } from "~/types";
import { AxiosError } from "axios";

const CELL_COUNT = 4;

// Function to partially hide email
const maskEmail = (email: string | undefined | string[]): string => {
  if (typeof email !== "string" || !email) {
    return "your email";
  }
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "your email"; // Handle invalid email format

  const maskedLocalPart =
    localPart.length > 3
      ? `${localPart.substring(0, 3)}****`
      : `${localPart}****`;

  return `${maskedLocalPart}@${domain}`;
};

const PasswordVerificationScreen: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setLoading] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { email } = useLocalSearchParams<{ email: string }>(); // Get email param

  const ref = useBlurOnFulfill({ value: code, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });

  const verificationMutation = useMutation({
    mutationFn: ({ identifier, code }: { identifier: string; code: string }) =>
      verifyPasswordReset(identifier, code),
    onSuccess: (data) => {
      Toast.show({
        type: "success",
        text1: t("Success"),
        text2: t(
          "PasswordVerification.successMessage",
          "Code verified successfully!"
        ),
      });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const errorMessage =
        error.response?.data?.message ||
        t("PasswordVerification.apiError", "Invalid code. Please try again.");
      setError(errorMessage);
      Toast.show({
        type: "error",
        text1: t("Error"),
        text2: errorMessage,
      });
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
                  // Increased size slightly
                  error
                    ? "border-red-500"
                    : isFocused
                    ? "border-primary"
                    : "border-slate-400" // Highlight error, focus, or default
                }`}
              >
                <Text className="text-2xl font-semibold">
                  {symbol || (isFocused ? <Cursor /> : null)}
                </Text>
              </View>
            )}
            // Style the container for the code fields
            rootStyle={{ justifyContent: "space-between" }} // Add space between cells
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
