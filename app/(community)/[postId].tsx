import React, { useState } from "react";
import {
  View,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, formatDistanceToNow } from "date-fns";
import { Text } from "~/components/ui/text";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetPostById, postComment, deleteComment, likePost, unlikePost } from "~/services/posts";
import { useAuth } from "~/lib/hooks/useAuth";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";

const PostScreen: React.FC = () => {
  const { t } = useTranslation();
  
  const commentSchema = z.object({
    comment: z.string().min(1, t("CommunityPage.comment_required")),
  });

  interface Comment {
    id: number;
    user: {
      id: number;
      name: string;
      picture: string;
    };
    comment: string;
    created_at: string;
  }

  const { postId } = useLocalSearchParams<{ postId: string }>();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: "" },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth({});

  const { post, isLoading, refresh } = useGetPostById(parseInt(postId));

  const handleAddComment = async (data: { comment: string }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await postComment({ id: parseInt(postId), comment: data.comment });
      refresh();
      control._reset({ comment: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment({ commentId });
      refresh();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const currentUserId = user.id;
  const isLiked = post?.likes ? JSON.parse(post.likes).some((like: any) => like.user_id === currentUserId) : false;

  const handleLikePress = async () => {
    if (isLiked) {
      await unlikePost({ id: post?.id || 0 });
    } else {
      await likePost({ id: post?.id || 0 });
    }
    refresh();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View className="bg-white p-4 rounded-lg">
      <View className="flex-row items-center mb-2">
        <Image
          source={{ uri: post?.user ? JSON.parse(post.user).picture : '' }}
          className="w-10 h-10 rounded-full"
        />
        <View className="ml-3">
          <Text className="font-semibold">{post?.user ? JSON.parse(post.user).name : ''}</Text>
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
      <Text className="text-lg font-semibold">{post?.title}</Text>
      <Text className="text-gray-600 mt-4">{post?.body}</Text>

      <View className="flex-row gap-x-4 mt-4">
        <TouchableOpacity
          onPress={handleLikePress}
          className="flex-row flex justify-center items-center"
        >
          <TabBarIcon
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? "red" : "grey"}
            family="MaterialCommunityIcons"
          />
          <Text className="ml-2 text-gray-500">{post?.likes ? JSON.parse(post.likes).length : 0}</Text>
        </TouchableOpacity>
        <View className="flex-row items-center">
          <TabBarIcon
            name="comment"
            size={16}
            color="grey"
            family="FontAwesome6"
          />
          <Text className="ml-2 text-gray-500">{post?.comments ? JSON.parse(post.comments).length : 0}</Text>
        </View>
        <View className="flex-row items-center">
          <TabBarIcon
            name="flag"
            size={16}
            color={post?.flagged === 1 ? "red" : "grey"}
            family="FontAwesome6"
          />
        </View>
      </View>
    </View>
  );

  const renderCommentInput = () => (
    <View className="flex-row items-center mt-4 pr-4 rounded-lg border-b-2 bottom-4 border-primary mx-4">
      <Controller
        control={control}
        name="comment"
        render={({ field: { value, onChange } }) => (
          <TextInput
            className="px-2 flex-1"
            placeholder={t("CommunityPage.write_comment")}
            value={value}
            style={{ height: 40 }}
            onChangeText={onChange}
          />
        )}
      />
      <TouchableOpacity
        onPress={handleSubmit(handleAddComment)}
        disabled={isSubmitting || !!errors.comment}
      >
        <TabBarIcon
          name="send"
          family="Ionicons"
          size={20}
          color={isSubmitting || errors.comment ? "grey" : "#A23A91"}
        />
      </TouchableOpacity>
    </View>
  );

  const renderComment = ({ item }: { item: Comment }) => (
    <View className="bg-white mb-4 border border-slate-100 p-4 mx-4 rounded-xl shadow">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Image
            source={{ uri: item?.user?.picture }}
            className="w-8 h-8 rounded-full"
          />
          <View className="ml-3">
            <Text className="font-semibold">{item?.user?.name}</Text>
            <Text className="text-gray-500 text-sm">
              {item?.created_at &&
                `${format(
                  new Date(item.created_at),
                  "MMM dd, yyyy"
                )} - ${formatDistanceToNow(new Date(item.created_at), {
                  addSuffix: true,
                })}`}
            </Text>
          </View>
        </View>
      </View>
      <Text className="text-base mt-1">{item?.comment}</Text>
      {item?.user?.id === (post?.user ? JSON.parse(post.user).id : null) && (
        <View className="flex-row items-center justify-end">
          <TouchableOpacity
            className="bg-slate-100 p-2 rounded-full"
            onPress={() => handleDeleteComment(item.id)}
          >
            <Ionicons name="trash" size={16} color="grey" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item, index }: { item: Comment; index: number }) => {
    if (index === 0) {
      return (
        <>
          {renderHeader()}
          {renderComment({ item })}
        </>
      );
    }
    return renderComment({ item });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation showLeft={true} showRight={true} showLogo={true} />
      <FlatList
        data={post?.comments ? JSON.parse(post.comments).reverse() : []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderHeader}
      />
      <View className="flex-row items-center mt-4 bg-white py-1 pr-4 ">
        {renderCommentInput()}
      </View>
    </SafeAreaView>
  );
};

export default PostScreen;
