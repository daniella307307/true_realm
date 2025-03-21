import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  TextInput,
  Switch,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
import { useTranslation } from "react-i18next";
import { FormField } from "~/types";
import i18n from "i18next";
import DateTimePickerComponent from "./ui/date-time-picker";
import IzuCodeSelector from "./ui/code-selector";
import { useAuth } from "~/lib/hooks/useAuth";
import { Pencil } from "lucide-react-native";

interface DynamicFieldProps {
  field: FormField;
  control: any;
  language?: string;
  type?: string;
}

const getLocalizedTitle = (
  title: { en: string; kn: string; default: string },
  locale = "en-US"
): string => {
  // Convert locale to the language code used in your title object
  const language = locale.startsWith("rw") ? "kn" : "en";
  return title[language as keyof typeof title] || title.default;
};
const TextFieldComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
  type = "text",
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
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {field.validate?.required && <Text className="text-primary"> *</Text>}
        </Text>
        <Select
          value={value}
          onValueChange={onChange}
          className="w-full h-14 rounded-lg"
        >
          <SelectTrigger
            className={`w-full h-full outline-none border ${
              error ? "border-primary" : "border-[#E4E4E7]"
            } bg-white`}
          >
            <SelectValue
              className="text-[#18181B] text-md"
              placeholder="Select an option"
            />
          </SelectTrigger>
          <SelectContent>
            {field?.data?.values?.map((option, index) => (
              <SelectItem
                key={option.value + index}
                value={option.value}
                label={
                  typeof option.label === "object"
                    ? getLocalizedTitle(option.label, language)
                    : option.label || ""
                }
              />
            ))}
          </SelectContent>
        </Select>
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

  if (field.key === "izucode" || field.key === "izu_id") {
    return (
      <IzuCodeSelector field={field} control={control} language={language} />
    );
  }

  if (
    field.key === "district" ||
    field.key === "sector" ||
    field.key === "cell" ||
    field.key === "village"
  ) {
    if (user?.located) {
      const locationKey = field.key as keyof typeof user.located;
      setTimeout(() => {
        control._setValue(field.key, user.located[locationKey], {
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
  onEditField?: (fieldKey: string) => void; // New prop for handling edit action
}

const AnswerPreview: React.FC<AnswerPreviewProps> = ({
  fields,
  formData,
  language = "en-US",
  onBack,
  onSubmit,
  timeSpent,
  onEditField,
}) => {
  const { t } = useTranslation();

  const getDisplayValue = (field: any, value: any) => {
    if (value === undefined || value === null) return "-";

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

      {fields.map((field) => (
        <View
          key={field.key}
          className="mb-6 px-4 py-4 bg-white rounded-lg border border-[#E4E4E7]"
        >
          <View className="flex flex-row justify-between items-center mb-2">
            <Text className="font-medium text-[#050F2B] w-10/12 bg-red-400">
              {getLocalizedTitle(field.title, language)}
              {field.validate?.required && (
                <Text className="text-primary"> *</Text>
              )}
            </Text>

            {/* Edit icon button */}
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
        <Button onPress={onBack} className="bg-gray-500">
          <Text className="text-white font-semibold">
            {t("FormElementPage.back", "Back")}
          </Text>
        </Button>
        <Button onPress={onSubmit}>
          <Text className="text-white dark:text-black font-semibold">
            {t("FormElementPage.finalSubmit", "Submit")}
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
};

interface DynamicFormProps {
  fields: FormField[];
  wholeComponent?: boolean;
  language?: string;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  wholeComponent = false,
  language,
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

  // Add this state to track which field is being edited
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);

  // Timer state
  const [timeSpent, setTimeSpent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // First, define visibleFields
  const visibleFields = fields.filter((field) => {
    if (field.visibleIf) {
      // Add your visibility condition logic here
      return true;
    }

    // Do not show fields with key=district, sector, cell, village
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

  // Then create fieldIndexMap after visibleFields is defined
  const fieldIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    visibleFields.forEach((field, index) => {
      map[field.key] = index;
    });
    return map;
  }, [visibleFields]);

  // Initialize timer when component mounts
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      setTimeSpent(elapsedSeconds);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Update the language when i18n changes
  useEffect(() => {
    if (!language) {
      // Only update if language prop is not explicitly provided
      setCurrentLanguage(i18nInstance.language);
    }
  }, [i18nInstance.language, language]);

  // Final form submission
  const onSubmit = (data: any) => {
    // Add timeSpent to form data
    const dataWithTime = {
      ...data,
      timeSpent: timeSpent,
      timeSpentFormatted: formatTime(timeSpent),
    };

    console.log("Form Data:", dataWithTime);

    // In preview mode, this is the final submission
    if (showPreview) {
      // Handle the final form submission
      console.log("Final submission:", dataWithTime);
      // Add your form submission logic here
      // For example, send data to your API
    } else {
      // Show preview before final submission
      setFormData(dataWithTime);
      setShowPreview(true);
    }
  };

  const validateAndProceed = async () => {
    // Get the current field's key
    const currentField = visibleFields[currentPage];
    console.log("Validating field:", currentField.label);

    // Validate just this field
    const isValid = await trigger(currentField.key);

    if (isValid) {
      setValidationError(false);
      // Only increment if we're not already at the last page
      if (currentPage < visibleFields.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    } else {
      setValidationError(true);
      // Show validation error for 2 seconds
      setTimeout(() => setValidationError(false), 2000);
    }
  };

  // Also update the handleNext function:
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

  // Handle validation before showing preview
  const handlePreview = async () => {
    // For single-page view, validate the current field
    if (!wholeComponent) {
      const currentField = visibleFields[currentPage];
      const isValid = await trigger(currentField.key);

      if (isValid) {
        handleSubmit(onSubmit)();
      } else {
        setValidationError(true);
        setTimeout(() => setValidationError(false), 2000);
      }
    } else {
      // For whole component view, validate all fields
      const isValid = await trigger();

      if (isValid) {
        handleSubmit(onSubmit)();
      } else {
        setValidationError(true);
        setTimeout(() => setValidationError(false), 2000);
      }
    }
  };

  // New function to handle editing a specific field
  const handleEditField = (fieldKey: string) => {
    setEditingFieldKey(fieldKey);
    setShowPreview(false);

    // Set the current page to the field's index if not in wholeComponent mode
    if (!wholeComponent && fieldKey in fieldIndexMap) {
      setCurrentPage(fieldIndexMap[fieldKey]);
    }
  };

  // If we're showing the preview, render that instead of the form
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
      />
    );
  }

  return (
    <View className="bg-background mt-4">
      {/* Timer display at the top */}
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
  );
};

export default DynamicForm;
