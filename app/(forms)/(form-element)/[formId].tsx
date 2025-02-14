import { View } from "react-native";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { useGetFormElements } from "~/services/formElements";
import DynamicForm from "~/components/DynamicForm";
import Skeleton from "~/components/ui/skeleton";
import { Text } from "~/components/ui/text";
import EmptyDynamicComponent from "~/components/EmptyDynamic";

const FormElementIndexScreen = () => {
  const { formId } = useLocalSearchParams();
  if (!formId) {
    return (
      <View>
        <Text>Missing form id</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const {
    data: formElements,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["formElements", formId],
    queryFn: () =>
      useGetFormElements({
        id: parseInt(Array.isArray(formId) ? formId[0] : formId),
      }),
  });

  if (isLoading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </View>
    );
  }

  if (isError) {
    return <EmptyDynamicComponent />;
  }

  return (
    <View className="flex-1 p-4 bg-white">
      {formElements?.data?.length ? (
        <>
          <Text className="text-lg font-semibold">{formElements?.name}</Text>
          <Text className="text-sm py-2 text-gray-600">
            {formElements?.description}
          </Text>
          <DynamicForm fields={formElements?.data || []} />
        </>
      ) : (
        <EmptyDynamicComponent />
      )}
    </View>
  );
};

export default FormElementIndexScreen;
