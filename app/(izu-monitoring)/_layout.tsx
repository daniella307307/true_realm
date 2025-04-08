import React from "react";
import { Stack } from "expo-router";

const IzuMonitoringLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="izu-monitoring" />
    </Stack>
  );
};

export default IzuMonitoringLayout;
