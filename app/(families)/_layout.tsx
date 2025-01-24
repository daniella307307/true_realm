import React from "react";
import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";

const FamilyFormsLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: {
          borderWidth: 0,
          borderEndEndRadius: 0,
          borderEndWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          borderBottomWidth: 0,
        },
        title: "Family Forms",
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => {
              router.push("/(user-management)/login");
            }}
          >
            <ChevronLeft color={"#A23A91"} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
        }}
      />
    </Stack>
  );
};

export default FamilyFormsLayout;
