import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ChevronLeft } from "lucide-react-native";
import { router, useNavigation } from "expo-router";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import { DrawerActions } from "@react-navigation/native";

const HeaderNavigation = ({
  showLeft = true,
  backFunction = () => router.back(),
  size = 24,
  className = "",
}) => {
  const navigation = useNavigation();
  const { colorScheme } = useColorScheme();
  const themeColor = NAV_THEME[colorScheme]?.primary ?? "#A23A91";

  const handleDrawerOpen = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View className={`flex-row items-center justify-center ${className}`}>
      {showLeft ? (
        <TouchableOpacity
          onPress={backFunction}
          className="h-16 w-16 rounded-full items-center justify-center"
        >
          <ChevronLeft color={themeColor} size={size} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handleDrawerOpen}
          className="h-16 w-16 rounded-full items-center justify-center"
        >
          <Feather
            name="menu"
            size={size}
            color={themeColor}
            style={{ marginRight: 12 }}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default HeaderNavigation;
