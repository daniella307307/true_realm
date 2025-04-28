import { View, TextInput, Switch, TouchableOpacity } from "react-native";

import { Controller, useForm, useWatch, useFormContext } from "react-hook-form";
import Dropdown from "./ui/select";
import { Text } from "./ui/text";
import { useMemo, useEffect, useState } from "react";
import { getDaysInMonth } from "date-fns";
import { cn } from "~/lib/utils";
import { getLocalizedTitle } from "~/utils/form-utils";
import { DynamicFieldProps } from "~/types/form-types";
import { Eye, EyeOff } from "lucide-react-native";

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
          }`}
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

const ConfirmPasswordComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => {
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <View className="mb-4">
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
              {field.validate?.required && (
                <Text className="text-primary"> *</Text>
              )}
            </Text>
            <TextInput
              className={`w-full px-4 py-4 border rounded-lg ${
                error ? "border-primary" : "border-[#E4E4E7]"
              }`}
              value={value}
              onChangeText={(text) => {
                onChange(text);
              }}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              className="absolute right-3 top-3"
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text className="text-gray-500">
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#050F2B" />
                ) : (
                  <Eye size={20} color="#050F2B" />
                )}
              </Text>
            </TouchableOpacity>
            {error && (
              <Text className="text-red-500 mt-2">
                {error.message || "This field is required"}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
};

const PasswordComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View className="mb-4">
      <Controller
        control={control}
        name={field.key}
        rules={{
          required: field.validate?.required
            ? field.validate.customMessage || "This field is required"
            : false,
        }}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <>
            <Text className="mb-2 text-md font-medium text-[#050F2B]">
              {getLocalizedTitle(field.title, language)}
              {field.validate?.required && (
                <Text className="text-primary"> *</Text>
              )}
            </Text>
            <View className="relative mb-4">
              <TextInput
                className={`w-full px-4 py-4 border rounded-lg ${
                  error ? "border-primary" : "border-[#E4E4E7]"
                }`}
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                className="absolute right-3 top-3"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text className="text-gray-500">
                  {showPassword ? (
                    <EyeOff size={20} color="#050F2B" />
                  ) : (
                    <Eye size={20} color="#050F2B" />
                  )}
                </Text>
              </TouchableOpacity>
            </View>
            {error && (
              <Text className="text-red-500 mt-2 mb-2">
                {error.message || "This field is required"}
              </Text>
            )}
          </>
        )}
      />
    </View>
  );
};

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
          }`}
          value={value}
          onChangeText={onChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
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
}) => {
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
        const selectedValues = value ? value.split(",").filter(Boolean) : [];

        // Enhanced logging for debugging
        // console.log(`Checkbox values for ${field.key}:`, {
        //   values: selectedValues,
        //   fieldLabel: getLocalizedTitle(field.title, language),
        //   dependentFields: field.conditional
        //     ? {
        //         when: field.conditional.when,
        //         eq: field.conditional.eq,
        //         shouldShow:
        //           field.conditional.eq === "!"
        //             ? !selectedValues.includes(field.conditional.when)
        //             : selectedValues.includes(field.conditional.when),
        //       }
        //     : null,
        // });

        const handleToggle = (optionValue: string) => {
          let newValues: string[];
          if (selectedValues.includes(optionValue)) {
            newValues = selectedValues.filter((v: any) => v !== optionValue);
          } else {
            newValues = [...selectedValues, optionValue];
          }
          const newValueString = newValues.join(",");

          onChange(newValueString);
        };

        return (
          <View className="mb-4">
            <Text className="mb-2 text-md font-medium text-[#050F2B]">
              {getLocalizedTitle(field.title, language)}
              {field.validate?.required && (
                <Text className="text-primary"> *</Text>
              )}
            </Text>
            <View className="flex flex-col flex-wrap mt-4">
              {field.values ? (
                field.values.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    className="flex flex-row items-center mr-4 mb-4"
                    onPress={() => handleToggle(option.value)}
                  >
                    <View
                      className={`w-5 h-5 border-2 border-[#A23A91] justify-center items-center
                      ${
                        selectedValues.includes(option.value)
                          ? "bg-[#A23A91]"
                          : "bg-white"
                      }`}
                    >
                      {selectedValues.includes(option.value) && (
                        <Text className="text-white text-xs">✓</Text>
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
                    onPress={() => handleToggle("yes")}
                  >
                    <View
                      className={`w-5 h-5 border-2 border-[#A23A91] justify-center items-center
                      ${
                        selectedValues.includes("yes")
                          ? "bg-[#A23A91]"
                          : "bg-white"
                      }`}
                    >
                      {selectedValues.includes("yes") && (
                        <Text className="text-white text-xs">✓</Text>
                      )}
                    </View>
                    <Text className="ml-2 text-md">Yes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex flex-row items-center mr-4 mb-4"
                    onPress={() => handleToggle("no")}
                  >
                    <View
                      className={`w-5 h-5 border-2 border-[#A23A91] justify-center items-center
                      ${
                        selectedValues.includes("no")
                          ? "bg-[#A23A91]"
                          : "bg-white"
                      }`}
                    >
                      {selectedValues.includes("no") && (
                        <Text className="text-white text-xs">✓</Text>
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
        );
      }}
    />
  );
};

const DayInputComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  language = "en-US",
}) => {
  try {
    // console.log("DayInputComponent initializing for field:", {
    //   key: field.key,
    //   type: field.type,
    //   title: field.title,
    //   fieldsProperty: field.fields,
    //   language
    // });

    // Ensure field.fields exists, even if it's not provided
    const fields = field.fields || {
      day: { required: false },
      month: { required: false },
      year: { required: false },
    };

    const dayValue = useWatch({ control, name: `${field.key}.day` });
    const monthValue = useWatch({ control, name: `${field.key}.month` });
    const yearValue = useWatch({ control, name: `${field.key}.year` });

    // Generate year options (1999 to current year)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1950 }, (_, i) => ({
      value: (currentYear - i).toString(),
      label: (currentYear - i).toString(),
    }));

    // Month options
    const months = [
      { value: "01", label: "January" },
      { value: "02", label: "February" },
      { value: "03", label: "March" },
      { value: "04", label: "April" },
      { value: "05", label: "May" },
      { value: "06", label: "June" },
      { value: "07", label: "July" },
      { value: "08", label: "August" },
      { value: "09", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ];

    // Calculate days based on selected month and year
    const daysInMonth = useMemo(() => {
      if (!monthValue || !yearValue) return 31;
      return getDaysInMonth(
        new Date(parseInt(yearValue), parseInt(monthValue) - 1)
      );
    }, [monthValue, yearValue]);

    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      value: (i + 1).toString().padStart(2, "0"),
      label: (i + 1).toString(),
    }));

    // Format the final value as YYYY-MM-DD
    const { setValue } = useForm();
    useEffect(() => {
      if (dayValue && monthValue && yearValue) {
        const formattedDay = dayValue.padStart(2, "0");
        const formattedMonth = monthValue.padStart(2, "0");
        const formattedDate = `${yearValue}-${formattedMonth}-${formattedDay}`;
        console.log("Formatted date in DayInputComponent:", formattedDate);
        setValue(field.key, formattedDate);
      }
    }, [dayValue, monthValue, yearValue, field.key, setValue]);

    // console.log("DayInputComponent rendering UI for:", field.key);

    // I want to print the selected values
    return (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {fields.day?.required && <Text className="text-primary"> *</Text>}
        </Text>

        <View className="flex flex-row justify-between gap-2">
          {/* Year Dropdown */}
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Year</Text>
            <Controller
              control={control}
              name={`${field.key}.year`}
              rules={{
                required: fields.year?.required ? "Year is required" : false,
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <View>
                  <View
                    className={cn(
                      "border rounded-lg",
                      error ? "border-primary" : "border-[#E4E4E7]"
                    )}
                  >
                    <Dropdown
                      data={years}
                      onChange={(item) => {
                        onChange(item.value);
                        setValue(`${field.key}.day`, "");
                      }}
                      placeholder="Select Year"
                    />
                  </View>
                  {error && (
                    <Text className="text-red-500 mt-1 text-xs">
                      {error.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>

          {/* Month Dropdown */}
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Month</Text>
            <Controller
              control={control}
              name={`${field.key}.month`}
              rules={{
                required: fields.month?.required ? "Month is required" : false,
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <View>
                  <View
                    className={cn(
                      "border rounded-lg",
                      error ? "border-primary" : "border-[#E4E4E7]"
                    )}
                  >
                    <Dropdown
                      data={months}
                      onChange={(item) => {
                        onChange(item.value);
                        setValue(`${field.key}.day`, "");
                      }}
                      placeholder="Select Month"
                    />
                  </View>
                  {error && (
                    <Text className="text-red-500 mt-1 text-xs">
                      {error.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>

          {/* Day Dropdown */}
          <View className="flex-1">
            <Text className="text-sm text-gray-600 mb-1">Day</Text>
            <Controller
              control={control}
              name={`${field.key}.day`}
              rules={{
                required: fields.day?.required ? "Day is required" : false,
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <View>
                  <View
                    className={cn(
                      "border rounded-lg",
                      error ? "border-primary" : "border-[#E4E4E7]"
                    )}
                  >
                    <Dropdown
                      data={days}
                      onChange={(item) => onChange(item.value)}
                      placeholder="Select Day"
                    />
                  </View>
                  {error && (
                    <Text className="text-red-500 mt-1 text-xs">
                      {error.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </View>
    );
  } catch (error) {
    console.error("Error in DayInputComponent:", error);
    // Provide a fallback UI in case of errors
    return (
      <View className="mb-4 p-4 border border-red-300 bg-red-50 rounded-lg">
        <Text className="text-red-600 font-bold">
          Error rendering date input for field: {field.key}
        </Text>
        <Text className="text-red-500 mt-2">
          Please try refreshing the form or contact support.
        </Text>
      </View>
    );
  }
};

const TimeInputComponent: React.FC<DynamicFieldProps> = ({
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
      pattern: {
        value: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        message: "Invalid time format (HH:MM)",
      },
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
          }`}
          value={value}
          onChangeText={(text) => {
            // Format the input as HH:MM
            const formattedText = text
              .replace(/[^0-9]/g, "")
              .replace(/^(\d{2})(\d)/, "$1:$2")
              .substring(0, 5);
            onChange(formattedText);
          }}
          keyboardType="numeric"
          maxLength={5}
          placeholder="HH:MM"
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

export {
  TextFieldComponent,
  TextAreaComponent,
  RadioBoxComponent,
  SelectBoxComponent,
  SwitchComponent,
  CheckBoxComponent,
  DayInputComponent,
  TimeInputComponent,
  PasswordComponent,
  ConfirmPasswordComponent,
};
