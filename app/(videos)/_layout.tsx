import { Stack } from "expo-router";

const VideoLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="video" />
      <Stack.Screen name="[vidId]" />
    </Stack>
  );
};

export default VideoLayout;
