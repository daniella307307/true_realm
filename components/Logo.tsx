import { View, Image } from "react-native";
import React from "react";
import { Text } from "./ui/text";

const Logo = ({
  className = "",
  size = 32,
  horizontal = false,
}: {
  className?: string;
  size?: number;
  horizontal?: boolean;
}) => {
  return (
    <View
      className={`flex ${horizontal ? "flex-row items-center" : "flex-col items-center"} ${className}`}
    >
      <Image
        source={require("../assets/images/logo.png")}
        style={{ height: size, width: size }}
        className="object-cover"
      />
      {!horizontal && (
        <Text className="font-semibold text-black text-xl mt-2">
          Sugira Muryango
        </Text>
      )}
    </View>
  );
};

export default Logo;
