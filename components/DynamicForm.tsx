import React from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
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

interface ValidationRules {
  required?: boolean;
  customMessage?: string;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
}

export interface IForm {
    id: string;
    title: string;
    name: string;
    description: string;
    path: string;
    type: string;
    display: string;
    tags: string[];
    owner: string;
    components: FormField[];
}

export interface FormField {
  label: string;
  type: string;
  key: string;
  placeholder?: string;
  defaultValue?: any;
  validate?: ValidationRules;
  options?: { label: string; value: string }[];
  components?: FormField[]; // For nested components like Address
}

const TextField: React.FC<{ field: FormField; control: any }> = ({
  field,
  control,
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={field.validate}
    render={({ field: { onChange, value }, fieldState: { error } }) => (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {field.label}
        </Text>
        <TextInput
          className={`w-full px-4 py-4 border rounded-lg ${
            error ? "border-primary" : "border-[#E4E4E7]"
          } dark:text-white bg-white dark:bg-[#1E1E1E]`}
          placeholder={field.placeholder}
          value={value}
          onChangeText={onChange}
        />
        {error && (
          <Text className="text-red-500 mt-2">
            {error.message || field.validate?.customMessage}
          </Text>
        )}
      </View>
    )}
  />
);

const SelectBox: React.FC<{ field: FormField; control: any }> = ({
  field,
  control,
}) => (
  <Controller
    control={control}
    name={field.key}
    rules={field.validate}
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
              placeholder={field.placeholder || "Select an option"}
            />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
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
            {error.message || field.validate?.customMessage}
          </Text>
        )}
      </View>
    )}
  />
);

const SwitchField: React.FC<{ field: FormField; control: any }> = ({
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

const AddressField: React.FC<{ field: FormField; control: any }> = ({
  field,
  control,
}) => (
  <View>
    <Text className="mb-2 text-lg font-semibold text-[#050F2B]">
      {field.label}
    </Text>
    {field.components?.map((subField) => (
      <DynamicField key={subField.key} field={subField} control={control} />
    ))}
  </View>
);

const DynamicField: React.FC<{ field: FormField; control: any }> = ({
  field,
  control,
}) => {
  switch (field.type) {
    case "textfield":
      return <TextField field={field} control={control} />;
    case "select":
      return <SelectBox field={field} control={control} />;
    case "switch":
      return <SwitchField field={field} control={control} />;
    case "address":
      return <AddressField field={field} control={control} />;
    default:
      return null;
  }
};

const DynamicForm: React.FC<{ fields: FormField[] }> = ({ fields }) => {
  const { control, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    console.log("Form Data:", data);
  };

  return (
    <ScrollView className="p-8 bg-background">
      {fields.map((field) => (
        <DynamicField key={field.key} field={field} control={control} />
      ))}
      <Button onPress={handleSubmit(onSubmit)}>
        <Text className="text-white dark:text-black font-semibold">Submit</Text>
      </Button>
    </ScrollView>
  );
};

export default DynamicForm;
