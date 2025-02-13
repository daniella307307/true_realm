import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import React, { useState, useCallback } from "react";
import {
  FlatList,
  TouchableOpacity,
  View,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { usePostManipulate } from "~/lib/hooks/usePost";
import { Text } from "~/components/ui/text";
import { useGetPosts } from "~/services/posts";
import { IPost } from "~/types";
import { useAuth } from "~/lib/hooks/useAuth";
import { Button } from "~/components/ui/button";
import { TabBarIcon } from "~/components/ui/tabbar-icon";

const CommunityScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth({});

  const {
    data: posts,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: useGetPosts,
    staleTime: 0,
  });

  const { useLikePost, useUnlikePost, useDeletePost, useReportPost } =
    usePostManipulate();

  const handleLikePress = (post: IPost) => {
    const currentUserId = user.id;
    const isLiked = post.likes.some((like) => like.user_id === currentUserId);

    if (isLiked) {
      useUnlikePost({ id: post.id });
    } else {
      useLikePost({ id: post.id });
    }
  };

  const handleDeletePost = (postId: number) => {
    useDeletePost({ id: postId });
  };

  const handleReportPress = () => {
    setModalVisible(true);
  };

  const handleSendReport = () => {
    useReportPost({ id: 1, report: reportText });
    setModalVisible(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const renderPost = ({ item }: { item: IPost }) => {
    const currentUserId = user.id;
    const isLiked = item.likes.some((like) => like.user_id === currentUserId);
    const isOwner = item.user.id === currentUserId;

    return (
      <View className="bg-white p-4 m-2 rounded-lg shadow">
        <TouchableOpacity
          onPress={() => router.push(`/(community)/${item.id}`)}
        >
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
          <Text className="text-gray-600">{item.body}</Text>

          {/* Actions */}
          <View className="flex-row justify-between mt-3">
            <View className="flex-row gap-x-4">
              <TouchableOpacity
                onPress={() => handleLikePress(item)}
                className="flex-row flex justify-center items-center"
              >
                <TabBarIcon
                  name={isLiked ? "heart" : "heart-outline"}
                  size={16}
                  color={isLiked ? "red" : "grey"}
                  family="MaterialCommunityIcons"
                />
                <Text className="ml-2 text-gray-500">{item.likes.length}</Text>
              </TouchableOpacity>
              <View className="flex-row items-center">
                <TabBarIcon
                  name="comment"
                  size={16}
                  color="grey"
                  family="FontAwesome6"
                />
                <Text className="ml-2 text-gray-500">
                  {item.comments.length}
                </Text>
              </View>
              <View className="flex-row items-center">
                <TabBarIcon
                  name="flag"
                  size={16}
                  color={item.flagged === 1 ? "red" : "grey"}
                  family="FontAwesome6"
                />
              </View>
            </View>

            <View className="flex-row gap-x-4">
              {isOwner && (
                <TouchableOpacity
                  className="bg-slate-100 p-2 rounded-full"
                  onPress={() => handleDeletePost(item.id)}
                >
                  <Ionicons name="trash" size={16} color="grey" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={posts?.data || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <TouchableOpacity
        onPress={() => router.push("/add-post")}
        className="absolute bottom-16 right-6 bg-primary rounded-full p-4"
      >
        <TabBarIcon name="add" size={24} color="white" family="Ionicons" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-lg w-4/5">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold">Report Issue</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <TextInput
              className="h-32 border px-2 border-[#E4E4E7] rounded-lg justify-start items-start flex-col"
              placeholder="Add your post description here"
              value={reportText}
              onChangeText={setReportText}
              multiline
              numberOfLines={4}
            />
            <Button onPress={handleSendReport} className="mt-4">
              <Text>Submit</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CommunityScreen;
