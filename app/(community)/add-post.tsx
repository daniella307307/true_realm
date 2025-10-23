// import React from "react";
// import { View, TextInput, SafeAreaView } from "react-native";
// import { useRouter } from "expo-router";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { usePostManipulate } from "~/lib/hooks/usePost";
// import { Button } from "~/components/ui/button";
// import { Text } from "~/components/ui/text";
// import HeaderNavigation from "~/components/ui/header";
// import { useTranslation } from "react-i18next";
// import { useNetworkStatus } from "~/services/network";
// import { Card } from "~/components/ui/card";
// import { TabBarIcon } from "~/components/ui/tabbar-icon";

 const NewPostScreen = () => {
//   const router = useRouter();
//   const { useCreatePost, isLoading } = usePostManipulate();
//   const { t } = useTranslation();
//   const { isConnected } = useNetworkStatus();

//   // Define validation schema using Zod
//   const postSchema = z.object({
//     title: z.string().min(3, t("CommunityPage.title_min_length")),
//     description: z.string().min(10, t("CommunityPage.description_min_length")),
//   });

//   // Define form data type based on Zod schema
//   type PostFormData = z.infer<typeof postSchema>;

//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isValid },
//     setValue,
//     watch,
//   } = useForm<PostFormData>({
//     resolver: zodResolver(postSchema),
//     mode: "onChange", // Validate on every change
//   });

//   const onSubmit = async (data: PostFormData) => {
//     if (!isConnected) {
//       return;
//     }

//     try {
//       await useCreatePost(
//         { title: data.title, body: data.description },
//         {
//           onSuccess: () => {
//             // Navigate back immediately after successful post creation
//             router.back();
//           },
//         }
//       );
//     } catch (error) {
//       console.error("Error creating post:", error);
//     }
//   };

//   // Memoize the submit handler to prevent unnecessary re-renders
//   const memoizedSubmit = React.useCallback(handleSubmit(onSubmit), [handleSubmit, onSubmit]);

//   if (!isConnected) {
//     return (
//       <SafeAreaView className="flex-1 bg-background">
//         <HeaderNavigation
//           showLeft={true}
//           showRight={true}
//           title={t("CommunityPage.new_post")}
//         />
//         <View className="flex-1 justify-center items-center p-4">
//           <Card className="p-6 items-center">
//             <TabBarIcon
//               name="wifi-off"
//               size={48}
//               color="#666"
//               family="Feather"
//             />
//             <Text className="text-lg font-semibold mt-4 text-center">
//               {t("Common.offline_title")}
//             </Text>
//             <Text className="text-gray-600 mt-2 text-center">
//               {t("Common.offline_post_message")}
//             </Text>
//           </Card>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView className="flex-1 bg-background">
//       <HeaderNavigation
//         showLeft={true}
//         showRight={true}
//         title={t("CommunityPage.new_post")}
//       />
//       <View className="flex-1 p-4">
//         <View className="mb-4">
//           <TextInput
//             className="bg-white p-4 rounded-lg border border-gray-200"
//             placeholder={t("CommunityPage.title_placeholder")}
//             onChangeText={(text) => setValue("title", text)}
//             style={{ height: 50 }}
//           />
//           {errors.title && (
//             <Text className="text-red-500 mt-1">{errors.title.message}</Text>
//           )}
//         </View>

//         <View className="mb-4 flex-1">
//           <TextInput
//             className="bg-white p-4 rounded-lg border border-gray-200 flex-1"
//             placeholder={t("CommunityPage.description_placeholder")}
//             onChangeText={(text) => setValue("description", text)}
//             multiline
//             style={{ textAlignVertical: "top", minHeight: 200 }}
//           />
//           {errors.description && (
//             <Text className="text-red-500 mt-1">
//               {errors.description.message}
//             </Text>
//           )}
//         </View>

//         <Button
//           onPress={memoizedSubmit}
//           isLoading={isLoading}
//           disabled={!isValid || isLoading}
//           className={`p-4 rounded-lg flex-row items-center justify-center ${
//             !isValid || isLoading ? "" : "bg-primary"
//           }`}
//         >
//           <Text className="ml-2 text-white font-semibold">
//             {t("CommunityPage.save_post")}
//           </Text>
//         </Button>
//       </View>
//     </SafeAreaView>
//   );
 };

 export default NewPostScreen;
