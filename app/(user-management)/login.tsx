import React, { useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Logo from "~/components/Logo";
import { Text } from "~/components/ui/text";
import { Eye, EyeOff } from "lucide-react-native";
import { Button } from "~/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomInput from "~/components/ui/input";
import { router } from "expo-router";

const schema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .nonempty("Email is required"),
  password: z
    .string()
    .nonempty("Password is required")
    .min(5, "Password should contain at least 5 characters")
    .regex(/[A-Z]/, "Password should contain at least one uppercase letter")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password should contain at least one symbol"
    )
    .regex(/[0-9]/, "Password should contain at least one digit"),
});

export default function LoginScreen() {
  const { t } = useTranslation();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    control,
    handleSubmit,
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible((prev) => !prev);
  };

  const onSubmit = (data: any) => {
    console.log("Form Data:", data);
    // Handle form submission logic here
  };

  return (
    <SafeAreaView className="flex-1 justify-center items-center flex-col gap-y-12 p-8 bg-background">
      <Logo />
      <View className="w-full">
        <View>
          <Text className="mb-2 text-lg font-medium text-[#050F2B]">
            {t("Email Address")}
          </Text>
          <CustomInput
            control={control}
            name="email"
            placeholder={t("Input email address")}
            keyboardType="email-address"
            accessibilityLabel={t("Email Address")}
          />
        </View>

        <View>
          <Text className="mb-2 text-lg font-medium text-[#050F2B]">
            {t("Password")}
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
                    className={`flex flex-row ems-center w-full border ${
                      error ? "border-primary" : "border-border"
                    } rounded-lg`}
                  >
                    <TextInput
                      className={`w-5/6 px-4 py-5 rounded-lg dark:text-white dark:bg-[#1E1E1E]`}
                      placeholder={t("Input password")}
                      secureTextEntry={passwordVisible ? false : true}
                      keyboardType={
                        passwordVisible ? "visible-password" : "default"
                      }
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel={"Password"}
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      className="flex items-center justify-center ml-2"
                      accessibilityLabel={
                        passwordVisible
                          ? t("Hide password")
                          : t("Show password")
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
            onPress={handleSubmit(onSubmit)}
          >
            <Text className="text-white font-semibold">{t("Login")}</Text>
          </Button>
          <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text className="text-accent text-center">
              {t("Forgot Password?")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
