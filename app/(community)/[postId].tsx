import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { baseInstance } from "~/utils/axios";
import { IPost, IComment, IResponse } from "~/types";
import { usePostManipulate } from "~/lib/hooks/usePost";
import { format, formatDistanceToNow } from "date-fns";

const PostScreen: React.FC = () => {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [commentText, setCommentText] = useState("");
  const { usePostComment, isLoading: isCommentLoading } = usePostManipulate();

  const {
    data: post,
    isLoading,
    refetch,
  } = useQuery<IPost>({
    queryKey: ["post", postId],
    queryFn: async () => {
      const res = await baseInstance.get(`/posts/${postId}`);
      return res.data;
    },
  });

  const handleAddComment = () => {
    if (commentText.trim() === "") return;
    usePostComment(
      { id: parseInt(postId), comment: commentText },
      {
        onSuccess: () => {
          refetch();
          setCommentText("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-4">
      <View className="bg-white p-4 rounded-lg shadow">
        <View className="flex-row items-center mb-2">
          <Image
            source={{ uri: post?.user?.picture }}
            className="w-10 h-10 rounded-full"
          />
          <View className="ml-3">
            <Text className="font-semibold">{post?.user?.name}</Text>
            <Text className="text-gray-500 text-sm">
              {post?.created_at &&
                `${format(
                  new Date(post.created_at),
                  "MMM dd, yyyy"
                )} - ${formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}`}
            </Text>
          </View>
        </View>
        <Text className="text-base">{post?.body}</Text>

        {/* Post Actions */}
        <View className="flex-row justify-between items-center mt-3">
          {/* Comment Count */}
          <View className="flex-row items-center">
            <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
            <Text className="ml-1 text-gray-500">{post?.comments.length}</Text>
          </View>

          {/* Flagged Icon */}
          <Ionicons
            name="flag"
            size={20}
            color={post?.flagged === 1 ? "red" : "#6b7280"}
          />
        </View>
      </View>

      {/* Comment Input */}
      <View className="flex-row items-center mt-4 bg-white py-1 pr-4 rounded-lg border border-gray-300">
        <TextInput
          className="flex-1 px-3 bg-red-10"
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          aria-disabled={isCommentLoading}
        />
        <TouchableOpacity onPress={handleAddComment}>
          <Ionicons name="send" size={20} color="#A23A91" />
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      <FlatList
        data={[...(post?.comments || [])].reverse()}
        renderItem={({ item }) => (
          <View className="bg-white p-3 mt-2 rounded-lg shadow">
            <View className="flex-row items-center">
              <Image
                source={{ uri: item.user.picture }}
                className="w-8 h-8 rounded-full"
              />
              <View className="ml-3">
                <Text className="font-semibold">{item.user.name}</Text>
                <Text className="text-gray-500 text-sm">
                  {item?.created_at &&
                    `${format(
                      new Date(item.created_at),
                      "MMM dd, yyyy"
                    )} - ${formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}`}
                </Text>
                <Text className="text-base mt-1">{item.comment}</Text>
              </View>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        className="mt-4"
      />
    </View>
  );
};

export default PostScreen;
