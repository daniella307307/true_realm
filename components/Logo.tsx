import { View, Image } from "react-native";
import React from "react";
import { Text } from "./ui/text";

const Logo = ({ className }: { className?: string }) => {
  return (
    <View className={`flex items-center ${className}`}>
      <Image
        source={require("../assets/images/logo.png")}
        className="h-32 w-32 object-cover"
      />
      <Text className="font-semibold text-black text-xl">Sugira Muryango</Text>
    </View>
  );
};

export default Logo;
