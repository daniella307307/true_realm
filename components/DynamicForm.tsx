import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  TextInput,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import Dropdown from "./ui/select";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
import { useTranslation } from "react-i18next";
import { FormField, IFormSubmissionDetail } from "~/types";
import DateTimePickerComponent from "./ui/date-time-picker";
import { useAuth } from "~/lib/hooks/useAuth";
import { Pencil } from "lucide-react-native";
import { SurveySubmission } from "~/models/surveys/survey-submission";
import { baseInstance } from "~/utils/axios";
import i18n from "~/utils/i18n";
import { FlowState } from "./FormFlowManager";
import { saveSurveySubmission } from "~/services/survey-submission";
import { router } from "expo-router";
import { RealmContext } from "~/providers/RealContextProvider";

const { useRealm, useQuery } = RealmContext;

interface DynamicFieldProps {
  field: FormField;
  control: any;
  language?: string;
  type?: string;
}

export const getLocalizedTitle = (
  title: { en: string; kn: string; default: string },
  locale = i18n.language
): string => {
  // Convert locale to the language code used in your title object
  const language = locale.startsWith("rw") ? "kn" : "en";
  return title[language as keyof typeof title] || title.default;
};

const TextFieldComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.validate?.required
        ? field.validate.customMessage || "This field is required"
        : false,
      ...(field.type === "phoneNumber" && {
        pattern: {
          value: /^\d{10}$/,
          message: "Phone number must be exactly 10 digits",
        },
      }),
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {field.validate?.required && <Text className="text-primary"> *</Text>}
        </Text>
        <TextInput
          className={`w-full px-4 py-4 border rounded-lg ${
            error ? "border-primary" : "border-[#E4E4E7]"
          } dark:text-white bg-white dark:bg-[#1E1E1E]`}
          value={value}
          keyboardType={
            field.type === "phoneNumber" || field.type === "number"
              ? "numeric"
              : "default"
          }
          maxLength={
            field.type === "phoneNumber"
              ? 10
              : field.type === "number"
              ? 125
              : undefined
          }
          onChangeText={(text) => {
            if (field.type === "phoneNumber") {
              // Only allow digits for phone numbers
              const numbersOnly = text.replace(/[^0-9]/g, "");
              onChange(numbersOnly);
            } else {
              onChange(text);
            }
          }}
        />
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || "This field is required"}
          </Text>
        )}
      </View>
    )}
  />
);

const TextAreaComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.validate?.required
        ? field.validate.customMessage || "This field is required"
        : false,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {field.validate?.required && <Text className="text-primary"> *</Text>}
        </Text>
        <TextInput
          className={`w-full px-4 h-44 border rounded-lg ${
            error ? "border-primary" : "border-[#E4E4E7]"
          } dark:text-white bg-white dark:bg-[#1E1E1E]`}
          value={value}
          onChangeText={onChange}
          multiline
          numberOfLines={4}
        />
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || "This field is required"}
          </Text>
        )}
      </View>
    )}
  />
);

const RadioBoxComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.validate?.required
        ? field.validate.customMessage || "This field is required"
        : false,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {field.validate?.required && <Text className="text-primary"> *</Text>}
        </Text>
        <View className="flex flex-col flex-wrap mt-4">
          {field.values
            ? field.values.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className="flex flex-row items-center mr-4 mb-4"
                  onPress={() => onChange(option.value)}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 border-primary justify-center items-center
                  ${value === option.value ? "bg-primary" : "bg-white"}`}
                  >
                    {value === option.value && (
                      <View className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </View>
                  <Text className="ml-2 text-md">
                    {option.title
                      ? getLocalizedTitle(option.title, language)
                      : option.label}
                  </Text>
                </TouchableOpacity>
              ))
            : null}
        </View>
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || "This field is required"}
          </Text>
        )}
      </View>
    )}
  />
);

const SelectBoxComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.validate?.required
        ? field.validate.customMessage || "This field is required"
        : false,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4 relative">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {field.validate?.required && <Text className="text-primary"> *</Text>}
        </Text>
        <Dropdown
          data={
            field?.data?.values?.map((option) => ({
              value: option.value,
              label: option.label,
            })) || []
          }
          onChange={(item) => onChange(item.value)}
          placeholder="Select an option"
        />
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || "This field is required"}
          </Text>
        )}
      </View>
    )}
  />
);

const SwitchComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.validate?.required
        ? field.validate.customMessage || "This field is required"
        : false,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {field.validate?.required && <Text className="text-primary"> *</Text>}
        </Text>
        <Switch value={value} onValueChange={onChange} />
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || "This field is required"}
          </Text>
        )}
      </View>
    )}
  />
);

const CheckBoxComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.validate?.required
        ? field.validate.customMessage || "This field is required"
        : false,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {field.validate?.required && <Text className="text-primary"> *</Text>}
        </Text>
        <View className="flex flex-col flex-wrap mt-4">
          {field.values ? (
            field.values.map((option) => (
              <TouchableOpacity
                key={option.value}
                className="flex flex-row items-center mr-4 mb-4"
                onPress={() => onChange(option.value)}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 border-primary justify-center items-center
            ${value === option.value ? "bg-primary" : "bg-white"}`}
                >
                  {value === option.value && (
                    <View className="w-3 h-3 rounded-full bg-primary" />
                  )}
                </View>
                <Text className="ml-2 text-md">
                  {option.title
                    ? getLocalizedTitle(option.title, language)
                    : option.label}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <>
              <TouchableOpacity
                className="flex flex-row items-center mr-4 mb-4"
                onPress={() => onChange("yes")}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 border-primary justify-center items-center
            ${value === "yes" ? "bg-primary" : "bg-white"}`}
                >
                  {value === "yes" && (
                    <View className="w-3 h-3 rounded-full bg-primary" />
                  )}
                </View>
                <Text className="ml-2 text-md">Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex flex-row items-center mr-4 mb-4"
                onPress={() => onChange("no")}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 border-primary justify-center items-center
            ${value === "no" ? "bg-primary" : "bg-white"}`}
                >
                  {value === "no" && (
                    <View className="w-3 h-3 rounded-full bg-primary" />
                  )}
                </View>
                <Text className="ml-2 text-md">No</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || "This field is required"}
          </Text>
        )}
      </View>
    )}
  />
);

const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language,
}) => {
  const { user } = useAuth({});

  // Check if field should be visible based on conditional logic
  const shouldShowField = () => {
    if (!field.conditional) return true;
    // Add your conditional logic here based on the field.conditional properties
    return field.conditional.show;
  };

  if (!shouldShowField()) return null;

  if (
    field.key === "district" ||
    field.key === "sector" ||
    field.key === "cell" ||
    field.key === "village"
  ) {
    if (user?.location) {
      const locationKey = field.key as keyof typeof user.location;
      setTimeout(() => {
        control._setValue(field.key, user.location[locationKey], {
          shouldValidate: true,
        });
      }, 0);
    }
    return null;
  }

  switch (field.type) {
    case "textfield":
      return (
        <TextFieldComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "number":
      return (
        <TextFieldComponent
          field={field}
          type="number"
          control={control}
          language={language}
        />
      );
    case "phoneNumber":
      return (
        <TextFieldComponent
          field={field}
          type="phoneNumber"
          control={control}
          language={language}
        />
      );
    case "select":
      return (
        <SelectBoxComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "switch":
      return (
        <SwitchComponent field={field} control={control} language={language} />
      );
    case "checkbox":
    case "selectboxes":
      return (
        <CheckBoxComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "textarea":
      return (
        <TextAreaComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "radio":
      return (
        <RadioBoxComponent
          field={field}
          control={control}
          language={language}
        />
      );
    case "datetime":
    case "date":
    case "time":
      return (
        <DateTimePickerComponent
          field={field}
          control={control}
          language={language}
        />
      );
   
    default:
      return null;
  }
};

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

interface AnswerPreviewProps {
  fields: FormField[];
  formData: Record<string, any>;
  language?: string;
  onBack: () => void;
  onSubmit: () => void;
  timeSpent: number;
  onEditField?: (fieldKey: string) => void;
  flowState: FlowState;
}

const AnswerPreview: React.FC<AnswerPreviewProps> = ({
  fields,
  formData,
  language = "en-US",
  onBack,
  onSubmit,
  timeSpent,
  onEditField,
  flowState,
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state

  const getDisplayValue = (field: any, value: any) => {
    // Your existing getDisplayValue function
    if (value === undefined || value === null) return "-";

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

      case "datetime":
      case "date":
      case "time":
        if (value) {
          const date = new Date(value);
          if (field.type === "date" || field.dateType === "date") {
            return date.toLocaleDateString(language);
          } else if (field.type === "time" || field.dateType === "time") {
            return date.toLocaleTimeString(language, {
              hour: "2-digit",
              minute: "2-digit",
            });
          } else {
            return date.toLocaleString(language);
          }
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
    setIsSubmitting(true);
    onSubmit();
  };

  return (
    <ScrollView className="bg-background mt-4">
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
          className={isSubmitting ? "bg-primary opacity-70" : "bg-primary"}
        >
          {isSubmitting ? (
            <View className="flex flex-row items-center">
              {/* You could add a loading spinner here if available */}
              <Text className="text-white dark:text-black font-semibold">
                {t("FormElementPage.submitting", "Submitting...")}
              </Text>
            </View>
          ) : (
            <Text className="text-white dark:text-black font-semibold">
              {t("FormElementPage.finalSubmit", "Submit")}
            </Text>
          )}
        </Button>
      </View>
    </ScrollView>
  );
};

interface DynamicFormProps {
  fields: FormField[];
  wholeComponent?: boolean;
  language?: string;
  flowState: FlowState;
  formSubmissionMandatoryFields: IFormSubmissionDetail;
  timeSpent: number;
  onEditFlowState: (step: string) => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  wholeComponent = false,
  flowState,
  formSubmissionMandatoryFields,
  language,
  timeSpent,
  onEditFlowState,
}) => {
  const { control, handleSubmit, getValues, trigger, formState, setValue } =
    useForm({
      mode: "onChange", // This enables real-time validation as fields change
    });
  const { t, i18n: i18nInstance } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({});
  const [validationError, setValidationError] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(
    language || i18nInstance.language
  );
  const [submitting, setSubmitting] = useState(false);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const realm = useRealm(); // Move useRealm to component level

  const visibleFields = fields.filter((field) => {
    if (field.visibleIf) {
      return true;
    }

    // Hide izucode fields since we handle them in flow state
    if (field.key === "izucode" || field.key === "izu_id") {
      return false;
    }

    if (
      field.key === "district" ||
      field.key === "sector" ||
      field.key === "cell" ||
      field.key === "village"
    ) {
      return false;
    }

    return field.key !== "submit"; // Filter out fields with key='submit'
  });

  const fieldIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    visibleFields.forEach((field, index) => {
      map[field.key] = index;
    });
    return map;
  }, [visibleFields]);

  useEffect(() => {
    if (!language) {
      setCurrentLanguage(i18nInstance.language);
    }
  }, [i18nInstance.language, language]);

  const onSubmit = async (data: any) => {
    if (submitting) return; // Prevent multiple submissions

    // Only process final submission when actually submitting (not when previewing)
    if (showPreview) {
      setSubmitting(true);

      try {
        const projectId = formSubmissionMandatoryFields.project_id || 0;
        const sourceModuleId = formSubmissionMandatoryFields.source_module_id || 0;
        const surveyId = formSubmissionMandatoryFields.id || 0;
        const familyId = flowState?.selectedValues?.families?.hh_id || null;

        // Check for existing submission before proceeding
        const existingSubmission = realm.objects<SurveySubmission>('SurveySubmission').filtered(
          'project_id == $0 AND source_module_id == $1 AND survey_id == $2 AND family == $3',
          projectId,
          sourceModuleId,
          surveyId,
          familyId
        );

        if (existingSubmission.length > 0) {
          Alert.alert(
            t("SubmissionExists.title", "Submission Already Exists"),
            t("SubmissionExists.message", "A submission for this form and family already exists."),
            [{ text: t("Common.ok", "OK") }]
          );
          setSubmitting(false); // Reset submitting state
          return; // Stop the submission process
        }

        console.log("Final submission:", data);

        const dataWithTime = {
          ...data,
          table_name: formSubmissionMandatoryFields.table_name,
          project_module_id:
            formSubmissionMandatoryFields.project_module_id || 0,
          source_module_id: formSubmissionMandatoryFields.source_module_id || 0,
          project_id: formSubmissionMandatoryFields.project_id || 0,
          survey_id: formSubmissionMandatoryFields.id || 0,
          post_data: formSubmissionMandatoryFields.post_data,
          userId: formSubmissionMandatoryFields.userId || 0,
          province: flowState?.selectedValues?.locations?.province?.id
            ? Number(flowState.selectedValues.locations.province.id)
            : 0,
          district: flowState?.selectedValues?.locations?.district?.id
            ? Number(flowState.selectedValues.locations.district.id)
            : 0,
          sector: flowState?.selectedValues?.locations?.sector?.id
            ? Number(flowState.selectedValues.locations.sector.id)
            : 0,
          cell: flowState?.selectedValues?.locations?.cell?.id
            ? Number(flowState.selectedValues.locations.cell.id)
            : 0,
          village: flowState?.selectedValues?.locations?.village?.id
            ? Number(flowState.selectedValues.locations.village.id)
            : 0,
          family: familyId,
          izucode: flowState?.selectedValues?.izus?.user_code || null,
          cohort: flowState?.selectedValues?.cohorts?.id
            ? Number(flowState.selectedValues.cohorts.id)
            : 0,
          language: currentLanguage,
          timeSpentFormatted: formatTime(timeSpent),
        };

        dataWithTime.post_data = "/sendVisitData";
        console.log("dataWithTime", dataWithTime);
        console.log("API URL:", dataWithTime.post_data);

        const result = await saveSurveySubmission(realm, dataWithTime, fields);
        console.log("Save result:", result);

        // Show success alert and navigate
        Alert.alert(
          "Submission Successful",
          "Your form has been submitted successfully.",
          [
            {
              text: "OK",
              onPress: () => router.push("/(history)/history"),
            },
          ]
        );
      } catch (error) {
        console.error("Error saving survey submission:", error);
        // Show error message to user
        Alert.alert(
          "Submission Error",
          "There was an error submitting your form. Please try again.",
          [{ text: "OK" }]
        );
      } finally {
        // This ensures submitting state is reset whether success or failure
        setSubmitting(false);
      }
    } else {
      // This is just for preview, set form data and show preview
      setFormData(data);
      setShowPreview(true);
    }
  };

  const validateAndProceed = async () => {
    const currentField = visibleFields[currentPage];
    const isValid = await trigger(currentField.key);
    if (isValid) {
      setValidationError(false);
      if (currentPage < visibleFields.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    } else {
      setValidationError(true);
      setTimeout(() => setValidationError(false), 2000);
    }
  };

  const handleNext = () => {
    if (currentPage < visibleFields.length - 1) {
      validateAndProceed();
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      setValidationError(false);
    }
  };

  const handleBackFromPreview = () => {
    setShowPreview(false);
  };

  const handlePreview = async () => {
    let isValid = false;

    if (!wholeComponent) {
      const currentField = visibleFields[currentPage];
      isValid = await trigger(currentField.key);
      console.log("isValid", isValid);
    } else {
      isValid = await trigger();
    }

    if (isValid) {
      // Get the current form values
      const values = getValues();
      setFormData(values);
      setShowPreview(true);
    } else {
      setValidationError(true);
      setTimeout(() => setValidationError(false), 2000);
    }
  };

  const handleEditField = (fieldKey: string) => {
    setEditingFieldKey(fieldKey);
    setShowPreview(false);

    // Handle flow state fields
    if (fieldKey === "izucode" || fieldKey === "izu_id") {
      onEditFlowState("izus");
    } else if (fieldKey === "cohort") {
      onEditFlowState("cohorts");
    } else if (fieldKey === "family") {
      onEditFlowState("families");
    } else if (
      ["province", "district", "sector", "cell", "village"].includes(fieldKey)
    ) {
      onEditFlowState("locations");
    } else if (!wholeComponent && fieldKey in fieldIndexMap) {
      setCurrentPage(fieldIndexMap[fieldKey]);
    }
  };

  if (showPreview) {
    return (
      <AnswerPreview
        fields={visibleFields}
        formData={formData}
        language={currentLanguage}
        onBack={handleBackFromPreview}
        onSubmit={handleSubmit(onSubmit)}
        timeSpent={timeSpent}
        onEditField={handleEditField}
        flowState={flowState}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="bg-background">
        <View className="mt-4 p-4">
          <View className="mb-4 p-3 bg-white rounded-lg flex flex-row justify-end items-center">
            <Text className="text-primary font-semibold">
              {formatTime(timeSpent)}
            </Text>
          </View>

          {!wholeComponent && (
            <>
              <Text className="text-center mb-2 text-md font-medium text-[#050F2B]">
                Page {currentPage + 1} of {visibleFields.length}
              </Text>
              <View className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <View
                  className="bg-primary h-2.5 rounded-full"
                  style={{
                    width: `${((currentPage + 1) / visibleFields.length) * 100}%`,
                  }}
                />
              </View>
            </>
          )}

          {validationError && (
            <View className="mb-4 p-3 bg-red-100 rounded-lg">
              <Text className="text-red-500 text-center">
                {t(
                  "FormElementPage.validation",
                  "Please complete all required fields before proceeding"
                )}
              </Text>
            </View>
          )}

          {wholeComponent ? (
            visibleFields.map((field) => (
              <DynamicField
                key={field.key}
                field={field}
                control={control}
                language={currentLanguage}
              />
            ))
          ) : (
            <DynamicField
              key={visibleFields[currentPage].key}
              field={visibleFields[currentPage]}
              control={control}
              language={currentLanguage}
            />
          )}

          {!wholeComponent && (
            <View className="flex flex-row justify-between mt-4">
              <Button
                onPress={handlePrevious}
                disabled={currentPage === 0}
                className={`${currentPage === 0 ? "opacity-50" : ""}`}
              >
                <Text className="text-white dark:text-black font-semibold">
                  {t("FormElementPage.previous")}
                </Text>
              </Button>
              {currentPage < visibleFields.length - 1 ? (
                <Button onPress={handleNext}>
                  <Text className="text-white dark:text-black font-semibold">
                    {t("FormElementPage.next")}
                  </Text>
                </Button>
              ) : (
                <Button onPress={handlePreview}>
                  <Text className="text-white dark:text-black font-semibold">
                    {t("FormElementPage.preview", "Preview")}
                  </Text>
                </Button>
              )}
            </View>
          )}

          {wholeComponent && (
            <Button onPress={handlePreview} className="mt-4">
              <Text className="text-white dark:text-black font-semibold">
                {t("FormElementPage.preview", "Preview")}
              </Text>
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default DynamicForm;
