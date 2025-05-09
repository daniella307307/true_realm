import React from "react";
import { Stack } from "expo-router";

const FormsLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[modId]" />
    </Stack>
  );
};

export default FormsLayout; 