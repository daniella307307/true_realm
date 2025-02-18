import { View } from "react-native";
import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { useGetFormById } from "~/services/formElements";
import { useQuery } from "@tanstack/react-query";
import DynamicForm from "~/components/DynamicForm";
import EmptyDynamicComponent from "~/components/EmptyDynamic";

const FormElementIndexScreen = () => {
  const { formId } = useLocalSearchParams<{ formId: string }>();

  if (!formId) {
    return (
      <View>
        <Text>Missing form or form id</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const { data: form, isLoading } = useQuery({
    queryKey: ["form", formId],
    queryFn: () => useGetFormById(parseInt(formId)),
  });

  const parsedForm = form?.json2 ? JSON.parse(form.json2) : null;
  if (isLoading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </View>
    );
  }

  return (
    <View className="flex-1 p-4 bg-background">
      {parsedForm?.components ? (
        <>
          <Text className="text-lg font-semibold">{form?.name}</Text>
          <DynamicForm fields={parsedForm.components} />
        </>
      ) : (
        <EmptyDynamicComponent />
      )}
    </View>
  );
};

export default FormElementIndexScreen;
