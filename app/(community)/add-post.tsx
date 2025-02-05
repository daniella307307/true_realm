import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { usePostManipulate } from "~/lib/hooks/usePost";
import { Button } from "~/components/ui/button";

const NewPostScreen: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();
  const { useCreatePost, isLoading } = usePostManipulate();

  const handlePostSubmit = () => {
    if (title.trim() === "" || description.trim() === "") return;
    useCreatePost(
      { title, body: description },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
  };

  return (
    <View className="flex-1 bg-background p-4">
      <View>
        <Text className="mb-2 text-lg font-medium text-[#050F2B]">Post Title</Text>
        <TextInput
          className="w-full px-4 h-12 border border-[#E4E4E7] rounded-lg bg-white"
          placeholder="Add your post title here"
          value={title}
          onChangeText={setTitle}
        />
      </View>
      <View className="mb-4">
        <Text className="mb-2 text-md font-medium text-[#050F2B]">Post Description</Text>
        <TextInput
          className="w-full px-4 h-44 border border-[#E4E4E7] rounded-lg bg-white"
          placeholder="Add your post description here"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>
      <Button
        onPress={handlePostSubmit}
        isLoading={isLoading}
        className="bg-primary p-4 rounded-lg flex-row items-center justify-center"
      >
        <Text className="ml-2 text-white font-semibold">Create Post</Text>
      </Button>
    </View>
  );
};

export default NewPostScreen;