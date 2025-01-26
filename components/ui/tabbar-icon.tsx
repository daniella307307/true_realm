import React, { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ViewStyle } from "react-native";
import {
  Entypo,
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";

type IoniconsProps = {
  family: "Ionicons";
  name: ComponentProps<typeof Ionicons>["name"];
};

type FontAwesomeProps = {
  family: "FontAwesome6";
  name: ComponentProps<typeof FontAwesome6>["name"];
};

type EntypoProps = {
  family: "Entypo";
  name: ComponentProps<typeof Entypo>["name"];
};

type MaterialCommunityIconsProps = {
  family: "MaterialCommunityIcons";
  name: ComponentProps<typeof MaterialCommunityIcons>["name"];
};

type OcticonsProps = {
  family: "Octicons";
  name: ComponentProps<typeof Octicons>["name"];
};

type MaterialIcons = {
  family: "MaterialIcons";
  name: ComponentProps<typeof MaterialIcons>["name"];
};

type TabBarIconProps = (
  | IoniconsProps
  | FontAwesomeProps
  | EntypoProps
  | MaterialCommunityIconsProps
  | OcticonsProps
  | MaterialIcons
) & {
  color?: string;
  size?: number;
  style?: ViewStyle;
};

export function TabBarIcon({
  family,
  name,
  color,
  size = 28,
  style,
  ...rest
}: TabBarIconProps) {
  let IconComponent;
  switch (family) {
    case "Ionicons":
      IconComponent = Ionicons;
      break;
    case "FontAwesome6":
      IconComponent = FontAwesome6;
      break;
    case "Entypo":
      IconComponent = Entypo;
      break;
    case "MaterialCommunityIcons":
      IconComponent = MaterialCommunityIcons;
      break;
    case "Octicons":
      IconComponent = Octicons;
      break;
    case "MaterialIcons":
      IconComponent = MaterialIcons;
      break;

    default:
      IconComponent = Ionicons;
  }
  return (
    <IconComponent
      name={name as any}
      size={size}
      color={color ? color : "black"}
      style={[{ marginBottom: -3 }, style]}
      {...rest}
    />
  );
}
