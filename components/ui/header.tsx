import React, { useCallback } from "react";
import { View, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
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

  // More robust handling of back function
  const handleBackPress = useCallback(() => {
    try {
      console.log("Back button pressed");
      backFunction()
    } catch (error) {
      console.error("Error in back button handler:", error);
      // Fallback
      try {
        router.back();
      } catch (fallbackError) {
        console.error("Fallback navigation failed:", fallbackError);
      }
    }
  }, []);

  // More robust handling of drawer open
  const handleDrawerOpen = useCallback(() => {
    try {
      Alert.alert("Menu button pressed");
      console.log("Opening drawer");
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (error) {
      console.error("Error opening drawer:", error);
    }
  }, [navigation]);

  return (
    <View className={`flex-row items-center justify-center ${className}`}>
      {showLeft ? (
        <TouchableOpacity
          onPress={handleBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={{
            width: size * 2,
            height: size * 2,
            borderRadius: 999,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Feather
            name="chevron-left"
            size={size}
            color={themeColor}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handleDrawerOpen}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={{
            width: size * 2,
            height: size * 2,
            borderRadius: 999,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Feather
            name="menu"
            size={size}
            color={themeColor}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default HeaderNavigation;