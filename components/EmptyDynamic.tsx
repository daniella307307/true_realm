import React from "react";
import { Image, View } from "react-native";
import { Text } from "~/components/ui/text";

const EmptyDynamicComponent = ({ message = "Empty for now", size = 64 }) => {
  return (
    <View className="flex items-center justify-center p-6">
      <Image
        source={require("../assets/images/empty_sync.png")}
        style={{ height: size, width: size }}
        className="object-cover"
      />
      <Text className="text-lg text-gray-500 mt-4">{message}</Text>
    </View>
  );
};

export default EmptyDynamicComponent;
