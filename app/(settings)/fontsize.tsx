import { View } from "react-native";
import React from "react";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { useFontSize } from "~/providers/FontSizeContext";
import { Text } from "~/components/ui/text";

const FontSizeScreen = () => {
  const { t } = useTranslation();
  const { fontSize, setFontSize } = useFontSize();

  return (
    <View className="flex-1 bg-background p-4">
      <View className="bg-white p-4 rounded-lg shadow-sm">
        <Text className="text-lg font-semibold mb-4">
          {t("Settings.AdjustFontSize")}
        </Text>
        <Slider
          value={fontSize}
          onValueChange={setFontSize} // Update global font size
          minimumValue={12}
          maximumValue={24}
          step={1}
          minimumTrackTintColor="#A23A91"
          maximumTrackTintColor="#ddd"
        />
        <Text className="text-center mt-2">{t("Settings.PreviewText")}</Text>
      </View>
    </View>
  );
};

export default FontSizeScreen;
