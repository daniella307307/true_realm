import { View } from "react-native";
import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import Skeleton from "~/components/ui/skeleton";
import { useGetFormById } from "~/services/formElements";
import DynamicForm from "~/components/DynamicForm";
import EmptyDynamicComponent from "~/components/EmptyDynamic";
import { useAuth } from "~/lib/hooks/useAuth";
import { IFormSubmissionDetail } from "~/types";

const FormElementIndexScreen = () => {
  const { formId, project_id, family_id } = useLocalSearchParams<{
    formId: string;
    project_id: string;
    family_id: string;
  }>();
  // create an object with the formId, project_id and family_id
  const formIdNumber = parseInt(formId);
  const projectIdNumber = parseInt(project_id);
  const familyIdNumber = parseInt(family_id);
  console.log("Form ID: ", formIdNumber);
  console.log("Project ID: ", projectIdNumber);
  console.log("Family ID: ", familyIdNumber);
  const { user } = useAuth({});

  if (!formId || !project_id || !family_id) {
    return (
      <View>
        <Text>Missing form or form id or family ID</Text>
        <Button onPress={() => router.replace("/(home)")}>Go to home</Button>
      </View>
    );
  }

  const form = useGetFormById(parseInt(formId));
  const isLoading = form === undefined;
  const parsedForm = form?.json2
    ? typeof form.json2 === "string"
      ? JSON.parse(form.json2)
      : form.json2
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
    id: form?.id ?? 0,
    table_name: form?.table_name,
    project_module_id: form?.project_module_id ?? 0,
    source_module_id: form?.module_id ?? 0,
    project_id: parseInt(project_id) || 0,
    post_data: form?.post_data,
    province: user.location?.province?.id ?? 0,
    district: user.location?.district?.id ?? 0,
    sector: user.location?.sector?.id ?? 0,
    cell: user.location?.cell?.id ?? 0,
    village: user.location?.village?.id ?? 0,
    family: familyIdNumber,
    izucode: user.user_code ?? "",
    userId: user.id ?? 0,
  };

  // console.log("Form Structure: ", JSON.stringify(formStructure, null, 2));

  return (
    <View className="flex-1 p-4 bg-background">
      {parsedForm?.components ? (
        <>
          <Text className="text-lg font-semibold">{form?.name}</Text>
          <DynamicForm
            formStructure={formStructure}
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
