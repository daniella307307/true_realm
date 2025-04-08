import React from "react";
import { View, TextInput, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePostManipulate } from "~/lib/hooks/usePost";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";

// Define validation schema using Zod
const postSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

// Define form data type based on Zod schema
type PostFormData = z.infer<typeof postSchema>;

const NewPostScreen: React.FC = () => {
  const router = useRouter();
  const { useCreatePost, isLoading } = usePostManipulate();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    mode: "onChange", // Validate on every change
  });

  const onSubmit = (data: PostFormData) => {
    useCreatePost(
      { title: data.title, body: data.description },
      {
        onSuccess: () => {
          router.push("/community");
        },
      }
    );
  };

  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("CommunityPage.create_post")}
      />
      {/* Title Input */}
      <View className="p-4">
        <View className="mb-4">
          <Text className="mb-2 text-lg font-medium text-[#050F2B]">
            Post Title
          </Text>
          <TextInput
            className="w-full px-2 h-14 border border-[#E4E4E7] rounded-lg bg-white"
            placeholder="Add your post title here"
            value={watch("title") || ""}
            onChangeText={(text) =>
              setValue("title", text, { shouldValidate: true })
            }
            {...register("title")}
          />
          {errors.title && (
            <Text className="text-red-500 text-xs/1 mt-2">
              {errors.title.message}
            </Text>
          )}
        </View>

        {/* Description Input */}
        <View className="mb-4">
          <Text className="mb-2 text-md font-medium text-[#050F2B]">
            Post Description
          </Text>
          <TextInput
            className="h-32 border px-2 border-[#E4E4E7] rounded-lg justify-start items-start flex-col"
            placeholder="Add your post description here"
            value={watch("description") || ""}
            onChangeText={(text) =>
              setValue("description", text, { shouldValidate: true })
            }
            multiline
            numberOfLines={4}
            {...register("description")}
          />
          {errors.description && (
            <Text className="text-red-500 text-xs/1 mt-2">
              {errors.description.message}
            </Text>
          )}
        </View>

        {/* Submit Button */}
        <Button
          onPress={handleSubmit(onSubmit)}
          isLoading={isLoading}
          disabled={!isValid || isLoading}
          className={`p-4 rounded-lg flex-row items-center justify-center ${
            !isValid || isLoading ? "bg-gray-400" : "bg-primary"
          }`}
        >
          <Text className="ml-2 text-white font-semibold">Create Post</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default NewPostScreen;
