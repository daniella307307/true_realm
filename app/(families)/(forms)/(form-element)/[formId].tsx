import { View } from "react-native";
import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { useGetFormById } from "~/services/formElements";
import FormFlowManager from "~/components/FormFlowManager";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { useAuth } from "~/lib/hooks/useAuth";
import { IFormSubmissionDetail } from "~/types";

const FormElementIndexScreen = () => {
  const { formId, project_id } = useLocalSearchParams<{
    formId: string;
    project_id: string;
  }>();
  // create an object with the formId, project_id and family_id
  const formIdNumber = parseInt(formId);
  const projectIdNumber = parseInt(project_id);
  console.log("Form ID: ", formIdNumber);
  console.log("Project ID: ", projectIdNumber);
  const { user } = useAuth({});

  if (!formId || !project_id ) {
    return (
      <View>
        <Text>Missing form or form id or family ID</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const form = useGetFormById(parseInt(formId));
  const isLoading = form === undefined;
  const parsedForm = form?.form?.json2
    ? typeof form.form.json2 === "string"
      ? JSON.parse(form.form.json2)
      : form.form.json2
    : null;

  if (isLoading) {
    return (
      <View className="flex-1 p-4 bg-white">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </View>
    );
  }
  
  
  const formStructure: IFormSubmissionDetail = {
    id: form?.form?.id ?? 0,
    table_name: form?.form?.table_name,
    project_module_id: form?.form?.project_module_id ?? 0,
    source_module_id: form?.form?.module_id ?? 0,
    project_id: parseInt(project_id) || 0,
    post_data: form?.form?.post_data,
    userId: user.id ?? 0,
  };

  return (
    <View className="flex-1 p-4 bg-background">
      {parsedForm?.components ? (
        <>
          <Text className="text-lg font-semibold mb-4">{form?.form?.name}</Text>
          <FormFlowManager
            form={form}
            formSubmissionMandatoryFields={formStructure}
            fields={parsedForm.components}
          />
        </>
      ) : (
        <EmptyDynamicComponent />
      )}
    </View>
  );
};

export default FormElementIndexScreen;
