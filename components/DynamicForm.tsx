import React, { useState } from "react";
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

interface DynamicFieldProps {
  field: FormField;
  control: any;
  language?: string;
  type?: string;
}

const getLocalizedTitle = (
  title: { en: string; kn: string; default: string },
  language = "en"
): string => {
  return title[language as keyof typeof title] || title.default;
};

const TextFieldComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en",
  type = "text",
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
          className={`w-full px-4 py-4 border rounded-lg ${
            error ? "border-primary" : "border-[#E4E4E7]"
          } dark:text-white bg-white dark:bg-[#1E1E1E]`}
          value={value}
          keyboardType={field.type === "number" ? "numeric" : "default"}
          maxLength={field.type === "number" ? 125 : undefined}
          onChangeText={onChange}
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
  language = "en",
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
  language = "en",
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
                  ${value === option.value ? "bg-red-500" : "bg-white"}`}
                  >
                    {value === option.value && (
                      <View className="w-3 h-3 rounded-full bg-white" />
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
  language = "en",
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
            {field?.data?.values?.map((option) => (
              <SelectItem
                key={option.value}
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
  language = "en",
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

const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language,
}) => {
  // Check if field should be visible based on conditional logic
  const shouldShowField = () => {
    if (!field.conditional) return true;
    // Add your conditional logic here based on the field.conditional properties
    return field.conditional.show;
  };

  if (!shouldShowField()) return null;

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
    default:
      return null;
  }
};

// Answer Preview Component
interface AnswerPreviewProps {
  fields: FormField[];
  formData: Record<string, any>;
  language?: string;
  onBack: () => void;
  onSubmit: () => void;
}

const AnswerPreview: React.FC<AnswerPreviewProps> = ({
  fields,
  formData,
  language = "en",
  onBack,
  onSubmit,
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

      default:
        return String(value);
    }
  };

  return (
    <ScrollView className="bg-background mt-4">
      <Text className="text-center text-xl font-bold mb-6 text-[#050F2B]">
        {t("FormElementPage.previewTitle", "Review Your Answers")}
      </Text>

      {fields.map((field) => (
        <View
          key={field.key}
          className="mb-6 px-4 py-4 bg-white rounded-lg border border-[#E4E4E7]"
        >
          <Text className="font-medium text-[#050F2B] mb-2">
            {getLocalizedTitle(field.title, language)}
            {field.validate?.required && (
              <Text className="text-primary"> *</Text>
            )}
          </Text>
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
  language = "en",
}) => {
  const { control, handleSubmit, getValues, trigger, formState } = useForm({
    mode: "onChange", // This enables real-time validation as fields change
  });
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({});
  const [validationError, setValidationError] = useState(false);

  // Final form submission
  const onSubmit = (data: any) => {
    console.log("Form Data:", data);
    // In preview mode, this is the final submission
    if (showPreview) {
      // Handle the final form submission
      console.log("Final submission:", data);
      // Add your form submission logic here
      // For example, send data to your API
    } else {
      // Show preview before final submission
      setFormData(data);
      setShowPreview(true);
    }
  };

  // Function to validate the current page before moving to the next
  const validateAndProceed = async () => {
    // Get the current field's key
    const currentField = visibleFields[currentPage];

    // Validate just this field
    const isValid = await trigger(currentField.key);

    if (isValid) {
      setValidationError(false);
      setCurrentPage(currentPage + 1);
    } else {
      setValidationError(true);
      // Show validation error for 2 seconds
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

  // Filter out fields based on dependencies and visibility conditions
  const visibleFields = fields.filter((field) => {
    if (field.dependsOn) {
      // Add your dependency logic here
      return true;
    }
    if (field.visibleIf) {
      // Add your visibility condition logic here
      return true;
    }
    return true;
  });

  // If we're showing the preview, render that instead of the form
  if (showPreview) {
    return (
      <AnswerPreview
        fields={visibleFields}
        formData={formData}
        language={language}
        onBack={handleBackFromPreview}
        onSubmit={handleSubmit(onSubmit)}
      />
    );
  }

  return (
    <ScrollView className="bg-background mt-4">
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
            language={language}
          />
        ))
      ) : (
        <DynamicField
          key={visibleFields[currentPage].key}
          field={visibleFields[currentPage]}
          control={control}
          language={language}
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
    </ScrollView>
  );
};

export default DynamicForm;
