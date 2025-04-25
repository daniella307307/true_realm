import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "./text";
import { getLocalizedTitle } from "~/utils/form-utils";
import i18n from "~/utils/i18n";

interface FormNavigationProps {
  onBack: () => void;
  onNext: () => void;
  isNextDisabled?: boolean;
  showBack?: boolean;
}

const FormNavigation: React.FC<FormNavigationProps> = ({
  onBack,
  onNext,
  isNextDisabled = false,
  showBack = true,
}) => {
  const language = i18n.language;

  return (
    <View className="h-24 border-t border-gray-200 bg-white">
      <View className="flex-1 flex-row justify-between gap-4 p-4">
        {showBack && (
          <TouchableOpacity
            onPress={onBack}
            className="flex-1 py-4 rounded-lg bg-gray-200"
          >
            <Text className="text-center text-gray-700 font-medium">
              {getLocalizedTitle(
                { en: "Previous", kn: "Gusubira inyuma", default: "Previous" },
                language
              )}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onNext}
          disabled={isNextDisabled}
          className={`flex-1 py-4 rounded-lg ${
            isNextDisabled ? "bg-gray-300" : "bg-primary"
          }`}
        >
          <Text className="text-center text-white font-medium">
            {getLocalizedTitle(
              { en: "Next", kn: "Komeza", default: "Next" },
              language
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FormNavigation; 