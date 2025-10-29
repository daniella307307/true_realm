import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Text } from "./ui/text";

const Logo = ({
  className = "",
  size = 48, // bigger by default
  horizontal = false,
}: {
  className?: string;
  size?: number;
  horizontal?: boolean;
}) => {
  return (
    <View
      className={`flex ${
        horizontal ? "flex-row items-center" : "flex-col items-center"
      } ${className}`}
    >
      <Image
        source={require("../assets/images/logo-header.png")}
        style={
          horizontal
            ? [styles.horizontalLogo, { height: size * 1.5 }] // slightly taller for banners
            : [styles.squareLogo, { width: size, height: size }]
        }
        contentFit={horizontal ? "cover" : "contain"}
      />

      {/* Optional text under vertical logo */}
      {/* {!horizontal && (
        <Text className="font-semibold text-black text-xl mt-2">
          Sugira Muryango
        </Text>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  squareLogo: {
    aspectRatio: 1, // keeps logo proportional
  },
  horizontalLogo: {
    width: "100%", // stretches across container
  },
});

export default Logo;
