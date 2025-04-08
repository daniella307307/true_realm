import React from "react";
import { Stack } from "expo-router";

const ProjectPageLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="project" />
    </Stack>
  );
};

export default ProjectPageLayout;
