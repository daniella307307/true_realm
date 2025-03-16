import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormField } from "~/types";
import { Text } from "./text";
import DateTimePicker, {
  DateType,
  useDefaultStyles,
} from "react-native-ui-datepicker";

interface DateTimePickerProps {
  field: FormField;
  control: any;
  language?: string;
}

const getLocalizedTitle = (
  title: { en: string; kn: string; default: string },
  locale = "en-US"
): string => {
  const language = locale.startsWith("rw") ? "kn" : "en";
  return title[language as keyof typeof title] || title.default;
};

const DateTimePickerComponent: React.FC<DateTimePickerProps> = ({
  field,
  control,
  language = "en-US",
}) => {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const defaultStyles = useDefaultStyles();

  const formatDateTime = (value: Date | null | undefined): string => {
    if (!value) return "";

    if (field.type === "datetime") {
      return value.toLocaleDateString(language);
    } else if (field.type === "time") {
      return value.toLocaleTimeString(language, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return value.toLocaleString(language);
    }
  };

  // Custom styles for the date picker
  const customStyles = {
    ...defaultStyles,
    today: {
      ...defaultStyles.today,
      color: "#A23A91",
    },
    selected: {
      ...defaultStyles.selected,
      backgroundColor: "#A23A91",
    },
  };

  return (
    <Controller
      control={control}
      name={field.key}
      rules={{
        required: field.validate?.required
          ? field.validate.customMessage || "This field is required"
          : false,
      }}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const dateValue = value ? new Date(value) : undefined;

        const onDateTimeChange = (date: DateType) => {
          if (date) {
            onChange(date);
            setShowPicker(false);
          }
        };

        const togglePicker = () => {
          setShowPicker(!showPicker);
        };

        return (
          <View className="mb-4">
            <Text className="mb-2 text-md font-medium text-[#050F2B]">
              {getLocalizedTitle(field.title, language)}
              {field.validate?.required && (
                <Text className="text-primary"> *</Text>
              )}
            </Text>

            <TouchableOpacity
              onPress={togglePicker}
              className={`w-full px-4 py-4 border rounded-lg flex flex-row justify-between items-center ${
                error ? "border-primary" : "border-[#E4E4E7]"
              } bg-white dark:bg-[#1E1E1E]`}
            >
              <Text className="text-[#18181B] dark:text-white">
                {dateValue
                  ? formatDateTime(dateValue)
                  : t("DateTimePicker.selectDateTime", "Select a date/time")}
              </Text>
              <Text className="text-primary">▼</Text>
            </TouchableOpacity>

            {showPicker && (
              <View className="mt-2 border rounded-lg border-[#E4E4E7] overflow-hidden">
                <DateTimePicker
                  mode={"range"}
                  date={dateValue}
                  onChange={({ startDate }) => onDateTimeChange(startDate)}
                  styles={customStyles}
                />
              </View>
            )}

            {error && (
              <Text className="text-red-500 mt-2">
                {error.message || "This field is required"}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
};

export default DateTimePickerComponent;