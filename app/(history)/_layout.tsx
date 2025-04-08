import React from "react";
import { Stack } from "expo-router";

const HistoryPageLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="history" />
    </Stack>
  );
};

export default HistoryPageLayout;
