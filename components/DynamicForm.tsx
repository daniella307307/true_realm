import React, { useState } from "react";
import { View, Text, TextInput, Switch, ScrollView } from "react-native";
import { Controller, useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { IFormElement } from "~/types";

const TextArea: React.FC<{ field: IFormElement; control: any }> = ({
  field,
  control,
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.element_properties.validate.required,
      pattern: field.element_properties.validate.pattern
        ? new RegExp(field.element_properties.validate.pattern)
        : undefined,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {field.label}
        </Text>
        <TextInput
          className={`w-full px-4 py-4 border rounded-lg ${
            error ? "border-primary" : "border-[#E4E4E7]"
          } dark:text-white bg-white dark:bg-[#1E1E1E]`}
          placeholder={field.element_properties.placeholder}
          value={value}
          onChangeText={onChange}
          multiline
          numberOfLines={4}
        />
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || field.element_properties.validate.customMessage}
          </Text>
        )}
      </View>
    )}
  />
);

const NumberInput: React.FC<{ field: IFormElement; control: any }> = ({
  field,
  control,
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.element_properties.validate.required,
      pattern: field.element_properties.validate.pattern
        ? new RegExp(field.element_properties.validate.pattern)
        : undefined,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {field.label}
        </Text>
        <TextInput
          className={`w-full px-4 py-4 border rounded-lg ${
            error ? "border-primary" : "border-[#E4E4E7]"
          } dark:text-white bg-white dark:bg-[#1E1E1E]`}
          placeholder={field.element_properties.placeholder}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
        />
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || field.element_properties.validate.customMessage}
          </Text>
        )}
      </View>
    )}
  />
);

const TextField: React.FC<{ field: IFormElement; control: any }> = ({
  field,
  control,
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.element_properties.validate.required,
      pattern: field.element_properties.validate.pattern
        ? new RegExp(field.element_properties.validate.pattern)
        : undefined,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {field.label}
        </Text>
        <TextInput
          className={`w-full px-4 py-4 border rounded-lg ${
            error ? "border-primary" : "border-[#E4E4E7]"
          } dark:text-white bg-white dark:bg-[#1E1E1E]`}
          placeholder={field.element_properties.placeholder}
          value={value}
          onChangeText={onChange}
        />
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || field.element_properties.validate.customMessage}
          </Text>
        )}
      </View>
    )}
  />
);

const SelectBox: React.FC<{ field: IFormElement; control: any }> = ({
  field,
  control,
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={{
      required: field.element_properties.validate.required,
      pattern: field.element_properties.validate.pattern
        ? new RegExp(field.element_properties.validate.pattern)
        : undefined,
    }}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4 relative">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {field.label}
        </Text>
        <Select
          value={value}
          onValueChange={onChange}
          className="w-full h-14 rounded-lg"
        >
          <SelectTrigger className="w-full h-full outline-none border-none bg-white">
            <SelectValue
              className="text-[#18181B] text-md"
              placeholder={
                field.element_properties.placeholder || "Select an option"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {field.element_properties.values?.map((option) => (
              <SelectItem
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </SelectContent>
        </Select>
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || field.element_properties.validate.customMessage}
          </Text>
        )}
      </View>
    )}
  />
);

const SwitchField: React.FC<{ field: IFormElement; control: any }> = ({
  field,
  control,
}) => (
  <Controller
    control={control}
    name={field.key}
    render={({ field: { onChange, value } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {field.label}
        </Text>
        <Switch value={value} onValueChange={onChange} />
      </View>
    )}
  />
);

const AddressField: React.FC<{ field: IFormElement; control: any }> = ({
  field,
  control,
}) => (
  <View>
    <Text className="mb-2 text-lg font-semibold text-[#050F2B]">
      {field.label}
    </Text>
    {/* {field.element_properties?.components?.map((subField: IFormElement) => (
      <DynamicField key={subField.key} field={subField} control={control} />
    ))} */}
  </View>
);

const DynamicField: React.FC<{ field: IFormElement; control: any }> = ({
  field,
  control,
}) => {
  switch (field.type) {
    case "textfield":
      return <TextField field={field} control={control} />;
    case "textarea":
      return <TextArea field={field} control={control} />;
    case "number":
      return <NumberInput field={field} control={control} />;
    case "selectboxes":
      return <SelectBox field={field} control={control} />;
    case "switch":
      return <SwitchField field={field} control={control} />;
    case "address":
      return <AddressField field={field} control={control} />;
    default:
      return null;
  }
};

const DynamicForm: React.FC<{ fields: IFormElement[]; wholeComponent?: boolean }> = ({
  fields,
  wholeComponent = false,
}) => {
  const { control, handleSubmit } = useForm();
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

  return (
    <ScrollView className="bg-background mt-4">
      {!wholeComponent && (
        <View className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <View
            className="bg-primary h-2.5 rounded-full"
            style={{ width: `${((currentPage + 1) / fields.length) * 100}%` }}
          />
        </View>
      )}

      {wholeComponent
        ? fields.map((field) => (
            <DynamicField key={field.key} field={field} control={control} />
          ))
        : <DynamicField key={fields[currentPage].key} field={fields[currentPage]} control={control} />}

      {!wholeComponent && (
        <View className="flex flex-row justify-between mt-4">
          <Button
            onPress={handlePrevious}
            disabled={currentPage === 0}
            className={`${currentPage === 0 ? "opacity-50" : ""}`}
          >
            <Text className="text-white dark:text-black font-semibold">Previous</Text>
          </Button>
          {currentPage < fields.length - 1 ? (
            <Button onPress={handleNext}>
              <Text className="text-white dark:text-black font-semibold">Next</Text>
            </Button>
          ) : (
            <Button onPress={handleSubmit(onSubmit)}>
              <Text className="text-white dark:text-black font-semibold">Submit</Text>
            </Button>
          )}
        </View>
      )}

      {wholeComponent && (
        <Button onPress={handleSubmit(onSubmit)} className="mt-4">
          <Text className="text-white dark:text-black font-semibold">Submit</Text>
        </Button>
      )}
    </ScrollView>
  );
};

export default DynamicForm;