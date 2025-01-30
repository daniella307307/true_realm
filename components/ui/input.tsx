import * as React from 'react';
import { Controller, Control } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import { Text } from './text';

const CustomInput = ({ control, name, placeholder, secureTextEntry = false, keyboardType = "default", accessibilityLabel }: { control: Control<any>; name: string; placeholder?: string; secureTextEntry?: boolean; keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "number-pad" | "decimal-pad" | "ascii-capable" | "numbers-and-punctuation" | "url" | "name-phone-pad" | "twitter" | "web-search" | "visible-password"; accessibilityLabel?: string }) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View className="mb-4">
          <TextInput
            className={`w-full px-4 py-5 border rounded-lg ${
              error ? "border-primary" : "border-gray-200"
            } dark:text-white bg-white dark:bg-[#1E1E1E]`}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            onBlur={onBlur}
            onChangeText={(text) => onChange(text.toLowerCase())}
            value={value}
            accessibilityLabel={accessibilityLabel}
          />
          {error && <Text className="text-red-500 mt-2">{error.message}</Text>}
        </View>
      )}
    />
  );
};

export default CustomInput;