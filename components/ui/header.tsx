import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ChevronLeft } from "lucide-react-native";
import { router, useNavigation } from "expo-router";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import { DrawerActions } from "@react-navigation/native";
import { Button } from "react-native-paper";

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
        <Button
          onPress={backFunction}
          className="h-16 w-16 rounded-full items-center justify-center"
          icon={"chevron-left"}
          children={undefined}
        />
      ) : (
        <Button
            onPress={handleDrawerOpen}
            className="h-16 w-16 rounded-full items-center justify-center"
            icon={"menu"} children={undefined}        />
      )}
    </View>
  );
};

export default HeaderNavigation;
