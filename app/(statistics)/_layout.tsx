import React from "react";
import { Stack } from "expo-router";

const StatisticsLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="statistics" />
    </Stack>
  );
};

export default StatisticsLayout;
