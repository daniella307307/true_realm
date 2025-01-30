import { View, DimensionValue } from "react-native";
import React from "react";

const Skeleton = ({ width, height, className }: {
    width: DimensionValue;
    height: DimensionValue;
    className?: string;
}) => {
  return (
    <View
      className={`bg-gray-300 dark:bg-gray-700 rounded-md ${className}`}
      style={{ width, height }}
    />
  );
};

export default Skeleton;
