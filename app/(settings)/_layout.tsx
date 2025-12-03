import React from "react";
import { Stack } from "expo-router";

const SettingsLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sync" />
      <Stack.Screen 
        name="edit-profile"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
};

export default SettingsLayout;