import React from "react";
import { Stack } from "expo-router";

const FormElementLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[formId]" />
    </Stack>
  );
};

export default FormElementLayout; 