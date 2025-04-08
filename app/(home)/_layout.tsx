import React from "react";
import { Stack } from "expo-router";

const HomeScreenLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
    </Stack>
  );
};

export default HomeScreenLayout;
