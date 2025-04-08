import { Stack } from "expo-router";

const PageAuthLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="pin-auth"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default PageAuthLayout;
