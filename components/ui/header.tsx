import React, { useCallback } from "react";
import { View, TouchableOpacity, Text, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation, useRouter } from "expo-router";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import { DrawerActions } from "@react-navigation/native";
import Logo from "~/components/Logo";

type FeatherIconName = keyof typeof Feather.glyphMap;

const HeaderNavigation = ({
  showLeft = true,
  showRight = false,
  backFunction = () => router.back(),
  rightFunction = () => {},
  size = 24,
  className = "",
  rightIcon = "menu" as FeatherIconName,
  title = "",
  showLogo = false,
  logoSize = 32,
}: {
  showLeft?: boolean;
  showRight?: boolean;
  backFunction?: () => void;
  rightFunction?: () => void;
  size?: number;
  className?: string;
  rightIcon?: FeatherIconName;
  title?: string;
  showLogo?: boolean;
  logoSize?: number;
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

  // More robust handling of right button press
  const handleRightPress = useCallback(() => {
    try {
      if (rightIcon === "menu") {
        navigation.dispatch(DrawerActions.openDrawer());
      } else {
        rightFunction();
      }
    } catch (error) {
      console.error("Error in right button handler:", error);
    }
  }, [navigation, rightFunction, rightIcon]);

  return (
    <View className={` ${Platform.OS === "ios" ? "mt-0" : "mt-10"} flex-row items-center px-6 justify-between ${className}`}>
      <View style={{ width: size * 2 }}>
        {showLeft && (
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
        )}
      </View>

      <View className="flex-1 items-center">
        {showLogo ? (
          <Logo horizontal size={logoSize} />
        ) : title ? (
          <Text 
            className="text-lg font-semibold"
            style={{ color: themeColor }}
          >
            {title}
          </Text>
        ) : null}
      </View>

      <View style={{ width: size * 2 }}>
        {showRight && (
          <TouchableOpacity
            onPress={handleRightPress}
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
              name={rightIcon}
              size={size}
              color={themeColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default HeaderNavigation;