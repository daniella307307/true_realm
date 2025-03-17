import React, { useState } from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { t } from "i18next";
import { useAuth } from "~/lib/hooks/useAuth";

const CELL_COUNT = 4;

const VerificationCode: React.FC = () => {
  const router = useRouter();
  const [isLoading, setLoading] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { next } = useLocalSearchParams();
  const ref = useBlurOnFulfill({ value: code, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });
  const { user } = useAuth({});
  console.log("User. Telephone:", user?.telephone);


  const handleCodeSubmit = async () => {
    setLoading(true);
    try {
      if (code.length !== CELL_COUNT) {
        setError("Please enter a 4-digit code.");
        return;
      }
      console.log("Submitted code:", code);
      // Toast.show({
      //   type: "success",
      //   text1: "Success",
      //   text2: "Code verified successfully.",
      // }); 
      const last4Digits = user?.telephone?.slice(-4);
      if (code !== last4Digits) {
        setError("Invalid code. Please enter the last 4 digits of your phone number.");
        throw new Error("Invalid code");
      }
      
      if (next) {
        router.push(next as Href); // Redirect to the intended page after verification
      } else {
        router.push("/"); // Default fallback route
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Invalid code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 h-screen bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-quicksandBold text-xl">{t("PinPage.title")}</Text>
        <Text className="font-quicksandMedium text-slate-600 mb-6">
          {t("PinPage.description")}
        </Text>

        <View className="mb-6">
          <CodeField
            ref={ref}
            {...props}
            value={code}
            onChangeText={(text) => {
              setError(null);
              setCode(text);
            }}
            cellCount={CELL_COUNT}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            renderCell={({ index, symbol, isFocused }) => (
              <View
                key={index}
                onLayout={getCellOnLayoutHandler(index)}
                className={`w-12 h-12 border flex-row items-center justify-center rounded-xl ${
                  isFocused ? "border-primary" : "border-slate-500"
                }`}
              >
                <Text className="text-xl">
                  {symbol || (isFocused ? <Cursor /> : null)}
                </Text>
              </View>
            )}
          />
          {error && <Text className="text-red-500 text-xs pt-4">{error}</Text>}
        </View>

        <Button
          onPress={handleCodeSubmit}
          isLoading={isLoading}
          disabled={code.length !== CELL_COUNT || isLoading}
        >
          <Text>{t("PinPage.verify")}</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VerificationCode;
