import { View, DimensionValue } from "react-native";
import React from "react";

const Skeleton = ({
  width,
  height,
  className,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  className?: string;
}) => {
  return (
    <View
      style={{ width, height }}
      className={`${className} p-4 border flex-row items-center mb-4 border-gray-200 rounded-xl bg-gray-200 animate-pulse`}
    >
      <View className="w-6 h-6 bg-gray-400 rounded-full" />
      <View className="ml-4 flex-1">
        <View className="w-3/4 h-4 bg-gray-400 rounded-md mb-2" />
        <View className="w-1/2 h-3 bg-gray-300 rounded-md" />
      </View>
    </View>
  );
};

export default Skeleton;
