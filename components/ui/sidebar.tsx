import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

const DrawerSidebar = ({ onClose }: { onClose: () => void }) => {
  const translateX = new Animated.Value(screenWidth);

  // Animate drawer appearance
  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      className="
      bg-slate-100 mr-0 absolute right-0 w-[70vw] h-screen p-10 z-50
      "
    >
      {/* Close Button */}
      <TouchableOpacity onPress={onClose} style={{ alignSelf: "flex-end" }}>
        <Feather name="x" size={24} color="black" />
      </TouchableOpacity>

      {/* Drawer Items */}
      <View className="mt-6">
        <TouchableOpacity className="py-3">
          <Text className="text-lg font-semibold">👤 Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity className="py-3">
          <Text className="text-lg font-semibold">🌍 Language</Text>
        </TouchableOpacity>
        <TouchableOpacity className="py-3">
          <Text className="text-lg font-semibold">🔡 Font Size</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default DrawerSidebar;
