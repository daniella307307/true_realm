import React, { useState } from "react";
import { View, TextInput, Switch, ScrollView, TouchableOpacity } from "react-native";
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
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.input,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
        </Text>
        <TextInput
          className={`w-full px-4 py-4 border rounded-lg ${
            error ? "border-primary" : "border-[#E4E4E7]"
          } dark:text-white bg-white dark:bg-[#1E1E1E]`}
          value={value}
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
      required: field.input,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
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
      required: field.input,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
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
      required: field.input,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
        </Text>
        <Select
          value={value}
          onValueChange={onChange}
          className="w-full h-14 rounded-lg"
        >
          <SelectTrigger className="w-full h-full outline-none border-none bg-white">
            <SelectValue
              className="text-[#18181B] text-md"
              placeholder="Select an option"
            />
          </SelectTrigger>
          <SelectContent>
            {field.values?.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                label={
                  option.title
                    ? getLocalizedTitle(option.title, language)
                    : option.label
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
    render={({ field: { onChange, value } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
        </Text>
        <Switch value={value} onValueChange={onChange} />
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
  const { control, handleSubmit } = useForm();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);

  const onSubmit = (data: any) => {
    console.log("Form Data:", data);
  };

  const handleNext = () => {
    if (currentPage < fields.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
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
            <Button onPress={handleSubmit(onSubmit)}>
              <Text className="text-white dark:text-black font-semibold">
                {t("FormElementPage.submit")}
              </Text>
            </Button>
          )}
        </View>
      )}

      {wholeComponent && (
        <Button onPress={handleSubmit(onSubmit)} className="mt-4">
          <Text className="text-white dark:text-black font-semibold">
            {t("FormElementPage.submit")}
          </Text>
        </Button>
      )}
    </ScrollView>
  );
};

export default DynamicForm;
