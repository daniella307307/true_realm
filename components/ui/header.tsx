import React, { useCallback } from "react";
import { View, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation, useRouter } from "expo-router";
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
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const themeColor = NAV_THEME[colorScheme]?.primary ?? "#A23A91";

  // More robust handling of back function
  const handleBackPress = useCallback(() => {
    try {
      console.log("Back button pressed");
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // If we can't go back, try the router
        try {
          backFunction();
        } catch (error) {
          console.error("Error in back function:", error);
          // Last resort: try to navigate to a safe screen
          router.replace("/");
        }
      }
    } catch (error) {
      console.error("Error in back button handler:", error);
      // Fallback to home screen
      router.replace("/");
    }
  }, [navigation, backFunction, router]);

  // More robust handling of drawer open
  const handleDrawerOpen = useCallback(() => {
    try {
      console.log("Opening drawer");
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (error) {
      console.error("Error opening drawer:", error);
    }
  }, [navigation, router]);

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