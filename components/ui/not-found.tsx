import React from "react";
import { View, SafeAreaView } from "react-native";
import { Button } from "./button";
import { Text } from "./text";
import { Href, router } from "expo-router";
export const NotFound = ({
  title,
  description,
  redirectTo,
}: {
  title: string;
  description: string;
  redirectTo?: () => void;
}) => {
  return (
    <SafeAreaView className="flex-1 justify-center items-center">
      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl font-bold">{title}</Text>
        <Text className="text-gray-500 text-center pt-2">{description}</Text>
        <Button
          onPress={() =>
            redirectTo
              ? redirectTo()
              : router.push("/(home)/home")
          }
        >
          <Text>Go to home</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
};
