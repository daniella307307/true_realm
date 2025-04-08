import React from "react";
import { Stack } from "expo-router";

const CommunityLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="community" />
      <Stack.Screen name="add-post" />
      <Stack.Screen name="[postId]" />
    </Stack>
  );
};

export default CommunityLayout;
