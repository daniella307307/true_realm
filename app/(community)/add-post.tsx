import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import CustomInput from "~/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const NewPostScreen: React.FC = () => {
  const [title, setTitle] = useState("");
  const { t } = useTranslation();
  const [description, setDescription] = useState("");
  const router = useRouter();

  const handlePostSubmit = () => {
    if (title.trim() === "" || description.trim() === "") return;
    console.log("New Post:", { title, description });
    router.back();
  };
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(
      z.object({
        title: z.string(),
      })
    ),
    mode: "onChange",
  });

  return (
    <View className="flex-1 bg-background p-4">
      <View>
        <Text className="mb-2 text-lg font-medium text-[#050F2B]">
          {t("Post title")}
        </Text>
        <CustomInput
          control={control}
          name="title"
          placeholder={t("Add your post title here")}
          keyboardType="default"
          accessibilityLabel={t("post_title")}
        />
      </View>
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">
          Post Description
        </Text>
        <TextInput
          className={`w-full px-4 h-44 border border-[#E4E4E7] rounded-lg dark:text-white bg-white dark:bg-[#1E1E1E]`}
          placeholder={"Add your post description here"}
          value={description}
          onChangeText={(text: string) => setDescription(text)}
          multiline
          numberOfLines={4}
        />
      </View>
      <TouchableOpacity
        onPress={handlePostSubmit}
        className="bg-primary p-4 rounded-lg flex-row items-center justify-center"
      >
        <Text className="ml-2 text-white font-semibold">Create Post</Text>
      </TouchableOpacity>
    </View>
  );
};

export default NewPostScreen;
