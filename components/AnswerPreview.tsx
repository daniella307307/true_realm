import { FormField } from "~/types";
import { FlowState } from "~/types/form-types";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { formatTime, getLocalizedTitle } from "~/utils/form-utils";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Pencil } from "lucide-react-native";
import { Button } from "./ui/button";

interface AnswerPreviewProps {
  fields: FormField[];
  formData: Record<string, any>;
  language?: string;
  onBack: () => void;
  onSubmit: () => void;
  timeSpent: number;
  onEditField?: (fieldKey: string) => void;
  flowState: FlowState;
  resetSubmitting?: (callback: () => void) => void;
}

export const AnswerPreview: React.FC<AnswerPreviewProps> = ({
  fields,
  formData,
  language = "en-US",
  onBack,
  onSubmit,
  timeSpent,
  onEditField,
  flowState,
  resetSubmitting,
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state

  // console.log("Answer Preview Log:");
  const getDisplayValue = (field: any, value: any) => {
    // Your existing getDisplayValue function
    if (value === undefined || value === null || value === "") return "-";

    // Handle flow state values
    if (field.key === "izucode" || field.key === "izu_id") {
      return flowState?.selectedValues?.izus?.user_code || "-";
    }
    if (field.key === "cohort") {
      return flowState?.selectedValues?.cohorts?.cohort || "-";
    }
    if (field.key === "family") {
      return flowState?.selectedValues?.families?.hh_id || "-";
    }
    if (field.key === "province") {
      return (
        flowState?.selectedValues?.locations?.province?.province_name || "-"
      );
    }
    if (field.key === "district") {
      return (
        flowState?.selectedValues?.locations?.district?.district_name || "-"
      );
    }
    if (field.key === "sector") {
      return flowState?.selectedValues?.locations?.sector?.sector_name || "-";
    }
    if (field.key === "cell") {
      return flowState?.selectedValues?.locations?.cell?.cell_name || "-";
    }
    if (field.key === "village") {
      return flowState?.selectedValues?.locations?.village?.village_name || "-";
    }

    switch (field.type) {
      case "switch":
        return value ? "Yes" : "No";

      case "radio":
      case "select":
        if (field.values) {
          const option = field.values.find((opt: any) => opt.value === value);
          if (option) {
            return typeof option.label === "object"
              ? getLocalizedTitle(option.label, language)
              : String(option.label || value);
          }
        }
        if (field.data?.values) {
          const option = field.data.values.find(
            (opt: any) => opt.value === value
          );
          if (option) {
            return typeof option.label === "object"
              ? getLocalizedTitle(option.label, language)
              : String(option.label || value);
          }
        }
        return String(value);

      case "day":
        if (value) {
          const day = value.day?.padStart(2, "0") || "00";
          const month = value.month?.padStart(2, "0") || "00";
          const year = value.year || "0000";
          return `${day}/${month}/${year}`;
        }
        return "-";

      case "time":
        if (value) {
          return value;
        }
        return "-";

      case "datetime":
      case "date":
        if (value) {
          const date = new Date(value);
          if (field.type === "date" || field.dateType === "date") {
            return date.toLocaleDateString(language);
          }
          return date.toLocaleString(language);
        }
        return "-";

      case "checkbox":
        if (field.values) {
          const selectedValues = field.values
            .filter((option: any) => value.includes(option.value))
            .map((option: any) =>
              typeof option.label === "object"
                ? getLocalizedTitle(option.label, language)
                : option.label
            );
          return selectedValues.join(", ");
        }
        return String(value);
      default:
        return String(value);
    }
  };

  // Handle submission with loading state
  const handleSubmit = () => {
    if (isSubmitting) return; // Prevent multiple submissions

    // Set loading state immediately
    setIsSubmitting(true);

    // Register the callback first to ensure it's available when needed
    if (resetSubmitting) {
      resetSubmitting(() => setIsSubmitting(false));
    }

    // Use setTimeout to ensure the callback registration happens before submission
    setTimeout(() => {
      onSubmit();

      // Fallback reset in case the callback isn't called
      if (!resetSubmitting) {
        setTimeout(() => setIsSubmitting(false), 10000); // 10-second timeout
      }
    }, 10);
  };

  return (
    <ScrollView className="bg-background mt-4 px-4">
      <Text className="text-center text-xl font-bold mb-6 text-[#050F2B]">
        {t("FormElementPage.previewTitle", "Review Your Answers")}
      </Text>

      <View className="mb-6 px-4 py-4 bg-white rounded-lg border border-[#E4E4E7]">
        <Text className="font-medium text-[#050F2B] mb-2">
          {t("FormElementPage.timeSpent", "Time Spent")}
        </Text>
        <Text className="text-[#52525B]">{formatTime(timeSpent)}</Text>
      </View>

      {/* Flow State Values */}
      {flowState?.selectedValues && (
        <View className="mb-6 px-4 py-4 bg-white rounded-lg border border-[#E4E4E7]">
          <Text className="font-medium text-[#050F2B] mb-4">
            {t("FormElementPage.flowStateValues", "Core Values")}
          </Text>

          {/* IZU */}
          {flowState.selectedValues.izus?.user_code && (
            <View className="mb-4">
              <View className="flex flex-row justify-between items-center mb-2">
                <Text className="font-medium text-[#050F2B]">
                  {t("FormElementPage.izu", "IZU")}
                </Text>
                <TouchableOpacity
                  onPress={() => onEditField && onEditField("izucode")}
                  className="p-2"
                >
                  <Pencil size={18} color="#6366F1" />
                </TouchableOpacity>
              </View>
              <Text className="text-[#52525B]">
                {flowState.selectedValues.izus.user_code}
              </Text>
            </View>
          )}

          {/* Cohort */}
          {flowState.selectedValues.cohorts?.cohort && (
            <View className="mb-4">
              <View className="flex flex-row justify-between items-center mb-2">
                <Text className="font-medium text-[#050F2B]">
                  {t("FormElementPage.cohort", "Cohort")}
                </Text>
                <TouchableOpacity
                  onPress={() => onEditField && onEditField("cohorts")}
                  className="p-2"
                >
                  <Pencil size={18} color="#6366F1" />
                </TouchableOpacity>
              </View>
              <Text className="text-[#52525B]">
                {flowState.selectedValues.cohorts.cohort}
              </Text>
            </View>
          )}

          {/* Family */}
          {flowState.selectedValues.families?.hh_id && (
            <View className="mb-4">
              <View className="flex flex-row justify-between items-center mb-2">
                <Text className="font-medium text-[#050F2B]">
                  {t("FormElementPage.family", "Family")}
                </Text>
                <TouchableOpacity
                  onPress={() => onEditField && onEditField("family")}
                  className="p-2"
                >
                  <Pencil size={18} color="#6366F1" />
                </TouchableOpacity>
              </View>
              <Text className="text-[#52525B]">
                {flowState.selectedValues.families.hh_id}
              </Text>
            </View>
          )}

          {/* Location */}
          {flowState.selectedValues.locations?.province && (
            <View className="mb-4">
              <View className="flex flex-row justify-between items-center mb-2">
                <Text className="font-medium text-[#050F2B]">
                  {t("FormElementPage.location", "Location")}
                </Text>
                <TouchableOpacity
                  onPress={() => onEditField && onEditField("province")}
                  className="p-2"
                >
                  <Pencil size={18} color="#6366F1" />
                </TouchableOpacity>
              </View>
              <Text className="text-[#52525B]">
                {[
                  flowState.selectedValues.locations.province?.province_name,
                  flowState.selectedValues.locations.district?.district_name,
                  flowState.selectedValues.locations.sector?.sector_name,
                  flowState.selectedValues.locations.cell?.cell_name,
                  flowState.selectedValues.locations.village?.village_name,
                ]
                  .filter(Boolean)
                  .join(" > ")}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Form Fields */}
      {fields.map((field) => (
        <View
          key={field.key}
          className="mb-6 px-4 py-4 bg-white rounded-lg border border-[#E4E4E7]"
        >
          <View className="flex flex-row justify-between items-center mb-2">
            <Text className="font-medium text-[#050F2B] w-10/12">
              {getLocalizedTitle(field.title, language)}
              {field.validate?.required && (
                <Text className="text-primary"> *</Text>
              )}
            </Text>

            <TouchableOpacity
              onPress={() => onEditField && onEditField(field.key)}
              className="p-2"
              accessibilityLabel={`Edit ${getLocalizedTitle(
                field.title,
                language
              )}`}
            >
              <Pencil size={18} color="#6366F1" />
            </TouchableOpacity>
          </View>

          <Text className="text-[#52525B]">
            {getDisplayValue(field, formData[field.key])}
          </Text>
        </View>
      ))}

      <View className="flex flex-row justify-between mt-6 mb-10">
        <Button
          onPress={onBack}
          className="bg-gray-500"
          disabled={isSubmitting}
        >
          <Text className="text-white font-semibold">
            {t("FormElementPage.back", "Back")}
          </Text>
        </Button>
        <Button
          onPress={handleSubmit}
          disabled={isSubmitting}
          className={isSubmitting ? "bg-gray-500" : "bg-primary"}
        >
          {isSubmitting ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="text-white font-semibold ml-2">
                Submitting...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold">Submit</Text>
          )}
        </Button>
      </View>
    </ScrollView>
  );
};
