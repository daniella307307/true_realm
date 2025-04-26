import { View, DimensionValue } from "react-native";
import React from "react";

export const Skeleton = ({
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

export const SimpleSkeletonItem = () => (
  <View className="p-4 border mb-4 rounded-xl border-gray-200 bg-gray-100">
    <View className="flex flex-row items-center">
      <View className="w-6 h-6 bg-gray-200 rounded" />
      <View className="h-5 ml-4 bg-gray-200 rounded w-3/4" />
    </View>
    <View className="flex flex-col mt-2">
      <View className="h-4 bg-gray-200 rounded w-1/3 mt-2" />
      <View className="h-4 bg-gray-200 rounded w-2/3 mt-2" />
    </View>
  </View>
);