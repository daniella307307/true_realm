import React from "react";
import { Stack } from "expo-router";

const ProjectModuleLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[projectId]" />
    </Stack>
  );
};

export default ProjectModuleLayout;
