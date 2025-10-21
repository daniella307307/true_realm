import React, { useCallback } from "react";
import { View, TouchableOpacity, Text, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useNavigation, useRouter } from "expo-router";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import Logo from "~/components/Logo";
import { useDrawer } from "~/providers/DrawerProvider";
import { useProtectedNavigation } from "~/utils/navigation";
// import { useGetNotifications } from "~/services/notifications";

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
  showNotification = true,
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
  showNotification?: boolean;
}) => {
  const navigation = useNavigation();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const themeColor = NAV_THEME[colorScheme]?.primary ?? "#A23A91";
  const { toggleDrawer } = useDrawer();
  const { goBack } = useProtectedNavigation();
  
  // Get notifications to show count
  // const { notifications } = useGetNotifications();
  // const unreadCount = notifications.filter(n => n.status !== 'resolved').length;
  
  return (
    <View
      className={` ${
        Platform.OS === "ios" ? "mt-0" : "mt-10"
      } flex-row items-center px-6 justify-between ${className}`}
    >
      <View style={{ width: size * 2 }}>
        {showLeft && (
          <TouchableOpacity
            onPress={goBack}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={{
              width: size * 2,
              height: size * 2,
              borderRadius: 999,
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Feather name="chevron-left" size={size} color={themeColor} />
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-1 items-center flex-row justify-center">
        {showLogo ? (
          <Logo horizontal size={logoSize} />
        ) : title ? (
          <Text className="text-lg font-semibold" style={{ color: themeColor }}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={{ width: size * 2 }} className="flex-row items-center justify-end">
        {/* {showNotification && (
          <TouchableOpacity
            onPress={() => router.push('/(notifications)')}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={{
              width: size * 2,
              height: size * 2,
              borderRadius: 999,
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              justifyContent: "center",
              alignItems: "center",
              marginRight: showRight ? 8 : 0,
            }}
          >
            <Feather name="bell" size={size - 2} color={themeColor} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  backgroundColor: 'red',
                  borderRadius: 10,
                  minWidth: 16,
                  minHeight: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 2,
                }}
              >
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )} */}
        
        {showRight && (
          <TouchableOpacity
            onPress={toggleDrawer}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={{
              width: size * 2,
              height: size * 2,
              borderRadius: 999,
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Feather name={rightIcon} size={size} color={themeColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default HeaderNavigation;
