import React from "react";
import { Stack } from "expo-router";

const StatisticsLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="score-details" />
      <Stack.Screen name="monitoring-detail" />
    </Stack>
  );
};

export default StatisticsLayout;
