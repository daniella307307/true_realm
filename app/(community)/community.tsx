import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { useQuery } from "@tanstack/react-query";
import { IPost } from "~/types";
import { Button } from "~/components/ui/button";
import { useGetPosts } from "~/services/posts";
import { format, formatDistanceToNow } from "date-fns";
import { usePostManipulate } from "~/lib/hooks/usePost";

const CommunityScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const [localPosts, setLocalPosts] = useState<IPost[]>([]); // Local state for posts
  const router = useRouter();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: useGetPosts,
    retryOnMount: true,
    retry: 1,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (posts?.data) {
      setLocalPosts(posts.data);
    }
  }, [posts]);

  const { useLikePost, useUnlikePost } = usePostManipulate();

  const handleLikePress = async (post: IPost) => {
    const currentUserId = 1; // Replace with the actual current user ID
    const isLiked = post.likes.some((like) => like.user_id === currentUserId);

    // Optimistically update the UI
    const updatedPosts = localPosts.map((p) =>
      p.id === post.id
        ? {
            ...p,
            likes: isLiked
              ? p.likes.filter((like) => like.user_id !== currentUserId) // Unlike
              : [...p.likes, {
                  id: Date.now(), // Temporary ID
                  user_id: currentUserId,
                  post_id: p.id,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }], // Like
          }
        : p
    );
    setLocalPosts(updatedPosts);

    try {
      if (isLiked) {
        await useUnlikePost({ id: post.id }); // API call to unlike
      } else {
        await useLikePost({ id: post.id }); // API call to like
      }
    } catch (error) {
      // Revert the UI change if the API call fails
      setLocalPosts(localPosts);
      console.error("Error updating like:", error);
    }
  };

  const handlePostPress = (postId: number) => {
    router.push(`/(community)/${postId}`);
  };

  const handleReportPress = () => {
    setModalVisible(true);
  };

  const handleSendReport = () => {
    console.log("Report Sent:", reportText);
    setModalVisible(false);
    setReportText("");
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const renderPost = ({ item }: { item: IPost }) => {
    const currentUserId = 1; // Replace with the actual current user ID
    const isLiked = item.likes.some((like) => like.user_id === currentUserId);

    return (
      <View className="bg-white p-4 m-2 rounded-lg shadow">
        <TouchableOpacity onPress={() => handlePostPress(item.id)}>
          {/* User Info */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Image
                source={{ uri: item.user.picture }}
                className="w-10 h-10 rounded-full"
              />
              <View className="ml-3">
                <Text className="font-semibold">{item.user.name}</Text>
                <Text className="text-gray-500 text-sm">
                  {`${format(
                    new Date(item.created_at),
                    "MMM dd, yyyy"
                  )} - ${formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleReportPress}
              className="h-10 w-10 bg-gray-50 flex-row justify-center items-center rounded-xl"
            >
              <TabBarIcon
                name="ellipsis-vertical"
                family="FontAwesome6"
                color="#000"
                size={16}
              />
            </TouchableOpacity>
          </View>

          {/* Post Content */}
          <Text className="text-lg font-semibold">{item.title}</Text>
          <Text className="text-base">{item.body}</Text>

          {/* Post Actions: Comments & Like */}
          <View className="flex-row items-center justify-between mt-3">
            {/* Comments */}
            <View className="flex-row items-center gap-x-4">
              <View className="flex-row items-center">
                <FontAwesome5 name="comment-alt" size={16} color="gray" />
                <Text className="text-gray-600 ml-2">
                  {item.comments.length}
                </Text>
              </View>
              <View className="flex-row items-center gap-x-4">
                <TouchableOpacity onPress={() => handleLikePress(item)}>
                  <View className="flex-row items-center">
                    <FontAwesome5
                      name="heart"
                      size={16}
                      color={isLiked ? "red" : "gray"}
                    />
                    <Text className="text-gray-600 ml-2">
                      {item.likes.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Flag (Red if flagged) */}
            <FontAwesome5
              name="flag"
              size={16}
              color={item.flagged === 1 ? "red" : "gray"}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={localPosts} // Use localPosts instead of posts.data
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity
        onPress={() => router.push("/add-post")}
        className="absolute bottom-16 right-6 bg-primary rounded-full p-4"
      >
        <Ionicons name="pencil" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-lg w-4/5">
            <Text className="text-lg font-semibold mb-2">Report Issue</Text>
            <TextInput
              className={`w-full px-4 h-44 border border-[#E4E4E7] rounded-lg dark:text-white bg-white dark:bg-[#1E1E1E]`}
              placeholder={"Add your post description here"}
              value={reportText}
              onChangeText={(text: string) => setReportText(text)}
              multiline
              numberOfLines={4}
            />

            <Button
              onPress={handleSendReport}
              className="bg-primary p-4 rounded-lg flex-row items-center justify-center mt-4"
            >
              <Text className="ml-2 text-white font-semibold">Send Now</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CommunityScreen;