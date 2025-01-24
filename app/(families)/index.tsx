import React, { Fragment } from "react";
import { ScrollView, View } from "react-native";
import DynamicForm, { IForm } from "~/components/DynamicForm";
import { Text } from "~/components/ui/text";

const sampleFields: IForm[] = [
  {
    id: "form1",
    title: "Newly Created Form",
    name: "sample-form",
    path: "/sample-form",
    type: "form",
    display: "form",
    description: "This is a newly created form, to test the dynamic form and its components. Feel free to test it out.",
    tags: ["sample", "form"],
    owner: "admin",
    components: [
      {
        label: "Name",
        type: "textfield",
        key: "name",
        placeholder: "Enter your name",
        validate: { required: true, customMessage: "Name is required" },
      },
      {
        label: "Gender",
        type: "select",
        key: "gender",
        placeholder: "Select your gender",
        options: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
        ],
        validate: { required: true, customMessage: "Gender is required" },
      },

      {
        label: "Address",
        type: "address",
        key: "address",
        components: [
          { label: "Street", type: "textfield", key: "street" },
          { label: "City", type: "textfield", key: "city" },
        ],
      },
      {
        label: "Remember Me",
        type: "switch",
        key: "rememberMe",
      },
    ],
  },
  {
    id: "form2",
    title: "Account Information",
    description: "Please fill in your account information,",
    name: "sample-form",
    path: "/sample-form",
    type: "form",
    display: "form",
    tags: ["sample", "form"],
    owner: "admin",
    components: [
      {
        label: "Name",
        type: "textfield",
        key: "name",
        placeholder: "Enter your name",
        validate: { required: true, customMessage: "Name is required" },
      },
      {
        label: "Gender",
        type: "select",
        key: "gender",
        placeholder: "Select your gender",
        options: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
        ],
        validate: { required: true, customMessage: "Gender is required" },
      },

      {
        label: "Address",
        type: "address",
        key: "address",
        components: [
          { label: "Street", type: "textfield", key: "street" },
          { label: "City", type: "textfield", key: "city" },
        ],
      },
      {
        label: "Remember Me",
        type: "switch",
        key: "rememberMe",
      },
    ],
  },
];

const FormScreen = () => {
  return (
    <ScrollView className="bg-white py-10">
      {sampleFields.map((form: IForm) => (
        <Fragment key={form.id}>
          <View className="px-8">
            <Text className="text-xl font-semibold">{form.title}</Text>
            <Text className="text-[#6E7191]">{form.description}</Text>
          </View>
          <DynamicForm fields={form.components} />
        </Fragment>
      ))}
    </ScrollView>
  );
};

export default FormScreen;
