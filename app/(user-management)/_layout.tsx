import React from "react";
import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";

const AuthLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: "Login",
          headerShown: true,
          contentStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => { router.back(); }}>
              <ChevronLeft color={"#A23A91"} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Forgot Password",
          headerShown: true,
          contentStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => { router.back(); }}>
              <ChevronLeft color={"#A23A91"} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="password-verification-sent"
        options={{
          title: "Password Verification",
          headerShown: true,
          contentStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => { router.back(); }}>
              <ChevronLeft color={"#A23A91"} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
};

export default AuthLayout;