import {
  View,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import { Controller, useForm, useWatch } from "react-hook-form";
import Dropdown from "./ui/select";
import { Text } from "./ui/text";
import { useMemo, useEffect, useState } from "react";
import { getDaysInMonth } from "date-fns";
import { cn } from "~/lib/utils";
import { getLocalizedTitle } from "~/utils/form-utils";
import { DynamicFieldProps } from "~/types/form-types";
import { Eye, EyeOff } from "lucide-react-native";
import { t } from "i18next";
import i18n from "~/utils/i18n";

// Helper function to get localized error message
const getLocalizedError = (field: any, defaultKey: string, params?: any) => {
  const currentLanguage = i18n.language;
  
  if (currentLanguage === "rw-RW" && field.errorLabel) {
    return field.errorLabel;
  }
  
  if (field.validate?.customMessage) {
    return field.validate.customMessage;
  }
  
  return t(defaultKey, params);
};

const TextFieldComponent: React.FC<DynamicFieldProps> = ({
  field,
  control,
  type,
  language = "en-US",
}) => {
  // Log fields with required validation
  useEffect(() => {
    if (field.validate?.required) {
      console.log("Required field:", {
        key: field.key,
        type: field.type || type,
        title: field.title,
        errorLabel: field.errorLabel,
        validate: field.validate,
        customMessage: field.validate.customMessage,
      });
    }
  }, [field, type]);

  return (
    <Controller
      control={control}
      name={field.key}
      rules={{
        required: field.validate?.required
          ? {
              value: true,
              message: getLocalizedError(field, "validation.fieldRequired"),
            }
          : false,
        ...(field.type === "number" || type === "number"
          ? {
              validate: {
                number: (value) => {
                  if (!value) return true; // Skip validation if empty (handled by required)

                  // Remove any non-digit characters
                  const numStr = value.toString().replace(/\D/g, "");

                  // For exact length requirements (when min equals max)
                  if (field.validate?.min !== undefined && field.validate?.max !== undefined && field.validate.min === field.validate.max) {
                    if (numStr.length !== field.validate.min) {
                      return getLocalizedError(field, "validation.exactDigits", { count: field.validate.min });
                    }
                  } else {
                    // For min/max range validation
                    if (field.validate?.min !== undefined && numStr.length < field.validate.min) {
                      return getLocalizedError(field, "validation.minDigits", { count: field.validate.min });
                    }
                    if (field.validate?.max !== undefined && numStr.length > field.validate.max) {
                      return getLocalizedError(field, "validation.maxDigits", { count: field.validate.max });
                    }
                  }

                  return true;
                },
              },
            }
          : {}),
      }}
      render={({
        field: { onChange, value, onBlur },
        fieldState: { error },
      }) => {
        return (
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
              value={value?.toString()}
              keyboardType={
                field.type === "number" || 
                type === "number" || 
                field.type === "phonenumber" || 
                field.type === "phoneNumber" || 
                type === "phonenumber" || 
                type === "phoneNumber" 
                  ? "numeric" 
                  : "default"
              }
              maxLength={field.validate?.max || undefined}
              onBlur={onBlur}
              onChangeText={(text) => {
                // Only allow digits for number-related fields
                if (field.type === "number" || 
                    type === "number" || 
                    field.type === "phonenumber" || 
                    field.type === "phoneNumber" || 
                    type === "phonenumber" || 
                    type === "phoneNumber") {
                  const numbersOnly = text.replace(/\D/g, "");
                  // Only update if we haven't reached max length or if we're removing characters
                  if (numbersOnly.length <= (field.validate?.max || Infinity)) {
                    onChange(numbersOnly);
                  }
                } else {
                  onChange(text);
                }
              }}
            />
            {(error || (field.type === "number" && value && field.validate?.min && value.toString().length < field.validate.min)) && (
              <Text className="text-red-500 mt-2">
                {error?.message || getLocalizedError(field, "validation.minDigits", { count: field.validate?.min })}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
};

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
            ? getLocalizedError(field, "validation.fieldRequired")
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
                {error.message || t("validation.fieldRequired")}
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
            ? getLocalizedError(field, "validation.fieldRequired")
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
                {error.message || t("validation.fieldRequired")}
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
        ? {
            value: true,
            message: getLocalizedError(field, "validation.fieldRequired"),
          }
        : false,
      ...(field.validate?.minLength
        ? {
            minLength: {
              value: field.validate.minLength,
              message: getLocalizedError(field, "validation.minLength", { count: field.validate.minLength }),
            },
          }
        : {}),
      ...(field.validate?.maxLength
        ? {
            maxLength: {
              value: field.validate.maxLength,
              message: getLocalizedError(field, "validation.maxLength", { count: field.validate.maxLength }),
            },
          }
        : {}),
      validate: {
        ...(field.validate?.minWords && {
          minWords: (value) =>
            !value ||
            value.trim().split(/\s+/).filter(Boolean).length >=
              (field.validate?.minWords || 0) ||
            getLocalizedError(field, "validation.minWords", { count: field.validate?.minWords }),
        }),
        ...(field.validate?.maxWords && {
          maxWords: (value) =>
            !value ||
            value.trim().split(/\s+/).filter(Boolean).length <=
              (field.validate?.maxWords || Infinity) ||
            getLocalizedError(field, "validation.maxWords", { count: field.validate?.maxWords }),
        }),
      },
    }}
    render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => (
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
          onBlur={onBlur}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {error && <Text className="text-red-500 mt-2">{error.message}</Text>}
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
        ? getLocalizedError(field, "validation.fieldRequired")
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
                    {getLocalizedTitle(
                      {
                        en: String(option.label || option.title || ""),
                        kn: String(
                          option.kn || option.label || option.title || ""
                        ),
                        default: String(option.label || option.title || ""),
                      },
                      language
                    )}
                  </Text>
                </TouchableOpacity>
              ))
            : null}
        </View>
        {error && (
          <Text className="text-red-500 mt-2">{error.message}</Text>
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
        ? getLocalizedError(field, "validation.fieldRequired")
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
            {error.message || t("validation.fieldRequired")}
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
        ? getLocalizedError(field, "validation.fieldRequired")
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
            {error.message || t("validation.fieldRequired")}
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
          ? getLocalizedError(field, "validation.fieldRequired")
          : false,
      }}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const selectedValues = value ? value.split(",").filter(Boolean) : [];

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
                      {getLocalizedTitle(
                        {
                          en: String(option.label || option.title || ""),
                          kn: String(
                            option.kn || option.label || option.title || ""
                          ),
                          default: String(option.label || option.title || ""),
                        },
                        language
                      )}
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
                {error.message || t("validation.fieldRequired")}
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
    // Ensure field.fields exists, even if it's not provided
    const fields = field.fields || {
      day: { required: false },
      month: { required: false },
      year: { required: false },
    };

    const dayValue = useWatch({ control, name: `${field.key}.day` });
    const monthValue = useWatch({ control, name: `${field.key}.month` });
    const yearValue = useWatch({ control, name: `${field.key}.year` });

    // Parse maxDate and minDate from field props
    const maxDate = field.maxDate ? new Date(field.maxDate) : null;
    const minDate = field.minDate ? new Date(field.minDate) : null;

    // Generate year options based on min and max dates
    const currentYear = new Date().getFullYear();
    const minYear = minDate ? minDate.getFullYear() : 1950;
    const maxYear = maxDate ? maxDate.getFullYear() : currentYear;
    
    const years = Array.from(
      { length: maxYear - minYear + 1 }, 
      (_, i) => ({
        value: (minYear + i).toString(),
        label: (minYear + i).toString(),
      })
    ).reverse(); // Reverse to show most recent years first

    // Month options
    const months = [
      { value: "01", label: t("Months.january") },
      { value: "02", label: t("Months.february") },
      { value: "03", label: t("Months.march") },
      { value: "04", label: t("Months.april") },
      { value: "05", label: t("Months.may") },
      { value: "06", label: t("Months.june") },
      { value: "07", label: t("Months.july") },
      { value: "08", label: t("Months.august") },
      { value: "09", label: t("Months.september") },
      { value: "10", label: t("Months.october") },
      { value: "11", label: t("Months.november") },
      { value: "12", label: t("Months.december") },
    ];

    // Filter months based on selected year and min/max dates
    const filteredMonths = months.filter(month => {
      if (!yearValue) return true;
      const selectedYear = parseInt(yearValue);
      const monthNum = parseInt(month.value);

      if (minDate && selectedYear === minDate.getFullYear()) {
        if (monthNum < minDate.getMonth() + 1) return false;
      }

      if (maxDate && selectedYear === maxDate.getFullYear()) {
        if (monthNum > maxDate.getMonth() + 1) return false;
      }

      return true;
    });

    // Calculate days based on selected month and year
    const daysInMonth = useMemo(() => {
      if (!monthValue || !yearValue) return 31;
      return getDaysInMonth(
        new Date(parseInt(yearValue), parseInt(monthValue) - 1)
      );
    }, [monthValue, yearValue]);

    // Generate and filter days based on min/max dates
    const days = useMemo(() => {
      const allDays = Array.from({ length: daysInMonth }, (_, i) => ({
        value: (i + 1).toString().padStart(2, "0"),
        label: (i + 1).toString(),
      }));

      if (!yearValue || !monthValue) return allDays;

      // Ensure minDate is before maxDate
      let effectiveMinDate = minDate;
      let effectiveMaxDate = maxDate;
      if (minDate && maxDate && minDate > maxDate) {
        effectiveMinDate = maxDate;
        effectiveMaxDate = minDate;
      }

      return allDays.filter(day => {
        const currentDate = new Date(
          parseInt(yearValue),
          parseInt(monthValue) - 1,
          parseInt(day.value)
        );

        // Set time to noon to avoid timezone issues
        currentDate.setHours(12, 0, 0, 0);
        if (effectiveMinDate) effectiveMinDate.setHours(12, 0, 0, 0);
        if (effectiveMaxDate) effectiveMaxDate.setHours(12, 0, 0, 0);

        if (effectiveMinDate && currentDate < effectiveMinDate) return false;
        if (effectiveMaxDate && currentDate > effectiveMaxDate) return false;

        return true;
      });
    }, [daysInMonth, yearValue, monthValue, minDate, maxDate]);

    const { setValue } = useForm();

    useEffect(() => {
      // Reset day value if it's no longer valid for the selected month/year
      if (dayValue && days.every(d => d.value !== dayValue)) {
        setValue(`${field.key}.day`, "");
      }
    }, [days, dayValue, field.key, setValue]);

    return (
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          {getLocalizedTitle(field.title, language)}
          {field.validate?.required && <Text className="text-primary"> *</Text>}
        </Text>

        <View className="flex flex-row justify-between gap-2 mb-4">
          {/* Year Dropdown */}
          <View className="flex-1 mb-2" style={{ zIndex: 3000 }}>
            <Text className="text-sm text-gray-600 mb-1">Year</Text>
            <Controller
              control={control}
              name={`${field.key}.year`}
              rules={{
                required: fields.year?.required
                  ? getLocalizedError(field, "validation.fieldRequired")
                  : false,
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
                        setValue(`${field.key}.month`, "");
                      }}
                      placeholder="Select Year"
                      className="bg-white"
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
          <View className="flex-1 mb-2" style={{ zIndex: 2000 }}>
            <Text className="text-sm text-gray-600 mb-1">Month</Text>
            <Controller
              control={control}
              name={`${field.key}.month`}
              rules={{
                required: fields.month?.required
                  ? getLocalizedError(field, "validation.fieldRequired")
                  : false,
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
                      data={filteredMonths}
                      onChange={(item) => {
                        onChange(item.value);
                        setValue(`${field.key}.day`, "");
                      }}
                      placeholder="Select Month"
                      className="bg-white"
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
          <View className="flex-1 mb-2" style={{ zIndex: 1000 }}>
            <Text className="text-sm text-gray-600 mb-1">Day</Text>
            <Controller
              control={control}
              name={`${field.key}.day`}
              rules={{
                required: fields.day?.required
                  ? getLocalizedError(field, "DayInputComponent.dayRequired")
                  : false,
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <View>
                  <View
                    className={cn(
                      "border rounded-lg bg-white",
                      error ? "border-primary" : "border-[#E4E4E7]"
                    )}
                  >
                    <Dropdown
                      data={days}
                      onChange={(item) => onChange(item.value)}
                      placeholder="Select Day"
                      className="bg-white"
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
      <ScrollView className="mb-4">
        <View className="p-4 border border-red-300 bg-red-50 rounded-lg">
          <Text className="text-red-600 font-bold">
            Error rendering date input for field: {field.key}
          </Text>
          <Text className="text-red-500 mt-2">
            Please try refreshing the form or contact support.
          </Text>
        </View>
      </ScrollView>
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
        ? {
            value: true,
            message: getLocalizedError(field, "validation.fieldRequired"),
          }
        : false,
      pattern: {
        value: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        message: getLocalizedError(field, "validation.invalidTimeFormat"),
      },
    }}
    render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => (
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
          onBlur={onBlur}
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
        {error && <Text className="text-red-500 mt-2">{error.message}</Text>}
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
