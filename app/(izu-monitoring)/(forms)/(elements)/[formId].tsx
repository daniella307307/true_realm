import React, { useState, useEffect } from "react";
import { View, Text, Button } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Skeleton from "~/components/ui/skeleton";
import DynamicForm from "~/components/DynamicForm";
import { IForm } from "~/types";

const staticForms: IForm[] = [
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        element_properties: {
          label: "Full Name",
          labelPosition: "top",
          placeholder: "Enter your full name",
          validate: {
            required: true,
          },
        },
      },
      {
        id: 2,
        form_id: 1,
        key: "email",
        type: "email",
        label: "Email Address",
        element_properties: {
          label: "Email",
          labelPosition: "top",
          placeholder: "Enter your email",
          validate: {
            required: true,
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 2,
    name: "Special Questions",
    description: "Detailed assessment questions",
    data: [
      {
        id: 3,
        form_id: 2,
        key: "specialCase",
        type: "textarea",
        label: "Special Case Description",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        element_properties: {
          label: "Special Case",
          labelPosition: "top",
          placeholder: "Describe your special case",
          validate: {
            required: true,
            minLength: 10,
          },
        },
      },
      {
        id: 4,
        form_id: 2,
        key: "priority",
        type: "selectbox",
        label: "Priority Level",
        element_properties: {
          label: "Priority",
          labelPosition: "top",
          values: [
            { label: "High", value: "high" },
            { label: "Medium", value: "medium" },
            { label: "Low", value: "low" },
          ],
          validate: {},
        },
      },
    ],
  },
  {
    id: 3,
    name: "Closing Questions",
    description: "Final feedback and completion questions",
    data: [
      {
        id: 5,
        form_id: 3,
        key: "feedback",
        type: "selectboxes",
        label: "Overall Experience",
        element_properties: {
          label: "Rate your experience",
          labelPosition: "top",
          values: [
            { label: "Excellent", value: "excellent" },
            { label: "Good", value: "good" },
            { label: "Fair", value: "fair" },
          ],
          validate: {},
        },
      },
      {
        id: 6,
        form_id: 3,
        key: "comments",
        type: "textarea",
        label: "Additional Comments",
        element_properties: {
          label: "Comments",
          labelPosition: "top",
          placeholder: "Share any additional feedback",
          validate: {
            required: false,
          },
        },
      },
    ],
  },
];

const FormElementIndexScreen = () => {
  const { formId } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [currentForm, setCurrentForm] = useState<IForm | null>(null);

  useEffect(() => {
    if (!formId) return;

    // Simulate loading delay
    const timer = setTimeout(() => {
      const id = parseInt(Array.isArray(formId) ? formId[0] : formId);
      const form = staticForms.find((f) => f.id === id) || null;
      setCurrentForm(form);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [formId]);

  if (!formId) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Text className="text-red-500 mb-4">Missing form id</Text>
        <Button onPress={() => router.replace("/(home)")} title="Go to home" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Skeleton width="100%" height={20} className="mb-2" />
        <Skeleton width="80%" height={15} className="mb-4" />
        <Skeleton width="100%" height={50} className="mb-2" />
        <Skeleton width="100%" height={50} className="mb-2" />
      </View>
    );
  }

  if (!currentForm) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Text className="text-red-500 mb-4">Form not found</Text>
        <Button onPress={() => router.replace("/(home)")} title="Go to home" />
      </View>
    );
  }

  return (
    <View className="flex-1 p-4 bg-white">
      <View className="mb-6">
        <Text className="text-lg font-semibold">{currentForm?.name}</Text>
        <Text className="text-sm text-gray-600">{currentForm.description}</Text>
      </View>
      <DynamicForm fields={currentForm.data || []} />
    </View>
  );
};

export default FormElementIndexScreen;
