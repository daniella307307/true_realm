import React from "react";
import { Stack } from "expo-router";

const MonitoringLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(modules)/[moduleId]" />
      <Stack.Screen name="(forms)/[modId]" />
      <Stack.Screen name="(form-element)/[formId]" />
    </Stack>
  );
};

export default MonitoringLayout; 