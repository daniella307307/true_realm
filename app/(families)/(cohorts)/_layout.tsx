import React from "react";
import { Stack } from "expo-router";

const CohortIndexLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[cohortId]" />
    </Stack>
  );
};

export default CohortIndexLayout;
