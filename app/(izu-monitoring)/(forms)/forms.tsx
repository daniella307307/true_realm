import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router, Href } from 'expo-router';
import CustomInput from '~/components/ui/input';
import { TabBarIcon } from '~/components/ui/tabbar-icon';

const staticForms = [
  {
    id: 1,
    name: "General Questions",
    description: "Basic information gathering questions",
    data: [
      {
        id: 1,
        form_id: 1,
        key: "fullName",
        type: "textfield",
        label: "Full Name",
        element_properties: {
          label: "Full Name",
          labelPosition: "top",
          placeholder: "Enter your full name",
          validate: {
            required: true
          }
        }
      }
    ]
  },
  {
    id: 2,
    name: "Special Questions",
    description: "Detailed assessment questions",
    data: [
      {
        id: 2,
        form_id: 2,
        key: "specialCase",
        type: "textarea",
        label: "Special Case Description",
        element_properties: {
          label: "Special Case",
          labelPosition: "top",
          validate: {
            required: true,
            minLength: 10
          }
        }
      }
    ]
  },
  {
    id: 3,
    name: "Closing Questions",
    description: "Final feedback and completion questions",
    data: [
      {
        id: 3,
        form_id: 3,
        key: "feedback",
        type: "radio",
        label: "Overall Experience",
        element_properties: {
          label: "Rate your experience",
          labelPosition: "top",
          values: [
            { label: "Excellent", value: "excellent" },
            { label: "Good", value: "good" },
            { label: "Fair", value: "fair" }
          ]
        }
      }
    ]
  }
];

const IZUForms = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const { control } = useForm({
    defaultValues: {
      searchQuery: ''
    }
  });

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 p-4 bg-white">
      <CustomInput
        control={control}
        name="searchQuery"
        placeholder={t("Search for forms")}
        keyboardType="default"
        accessibilityLabel={t("search_forms")}
      />

      {isLoading ? (
        <View className="mt-6">
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              className="p-4 border border-gray-200 flex-row items-center mb-4 rounded-xl bg-gray-100 animate-pulse"
            >
              <View className="w-6 h-6 bg-gray-300 rounded-full" />
              <View className="ml-4 flex-1">
                <View className="h-4 w-3/5 bg-gray-300 rounded-md mb-2" />
                <View className="h-3 w-2/3 bg-gray-300 rounded-md" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={staticForms}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={() => (
            <Text className="text-center text-gray-500 mt-6">
              {t("No forms available")}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push(
                  `/(elements)/${item.id}` as Href
                )
              }
              className="p-4 border flex-row items-center mb-4 border-gray-200 rounded-xl"
            >
              <TabBarIcon
                name="description"
                family="MaterialIcons"
                size={24}
                color="#71717A"
              />
              <View className="ml-4">
                <Text className="text-lg font-semibold">{item.name}</Text>
                <Text className="text-sm text-gray-600">
                  {item.description || "No description available"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

export default IZUForms;