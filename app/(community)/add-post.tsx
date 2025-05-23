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

const NewPostScreen: React.FC = () => {
  const router = useRouter();
  const { useCreatePost, isLoading } = usePostManipulate();
  const { t } = useTranslation();

  // Define validation schema using Zod
  const postSchema = z.object({
    title: z.string().min(3, t("CommunityPage.title_min_length")),
    description: z.string().min(10, t("CommunityPage.description_min_length")),
  });

  // Define form data type based on Zod schema
  type PostFormData = z.infer<typeof postSchema>;

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

  const onSubmit = async (data: PostFormData) => {
    try {
      await useCreatePost(
        { title: data.title, body: data.description },
        {
          onSuccess: () => {
            // Navigate back immediately after successful post creation
            router.back();
          },
        }
      );
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  // Memoize the submit handler to prevent unnecessary re-renders
  const memoizedSubmit = React.useCallback(handleSubmit(onSubmit), [handleSubmit, onSubmit]);

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
            {t("CommunityPage.post_title")}
          </Text>
          <TextInput
            className="w-full px-2 h-14 border border-[#E4E4E7] rounded-lg bg-white"
            placeholder={t("CommunityPage.post_title_placeholder")}
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
            {t("CommunityPage.post_description")}
          </Text>
          <TextInput
            className="h-32 border p-4 border-[#E4E4E7] rounded-lg justify-start items-start flex-col"
            placeholder={t("CommunityPage.post_description_placeholder")}
            value={watch("description") || ""}
            onChangeText={(text) =>
              setValue("description", text, { shouldValidate: true })
            }
            multiline
            numberOfLines={4}
            {...register("description")}
            textAlignVertical="top"
          />
          {errors.description && (
            <Text className="text-red-500 text-xs/1 mt-2">
              {errors.description.message}
            </Text>
          )}
        </View>

        {/* Submit Button */}
        <Button
          onPress={memoizedSubmit}
          isLoading={isLoading}
          disabled={!isValid || isLoading}
          className={`p-4 rounded-lg flex-row items-center justify-center ${
            !isValid || isLoading ? "" : "bg-primary"
          }`}
        >
          <Text className="ml-2 text-white font-semibold">
            {t("CommunityPage.save_post")}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default NewPostScreen;
