import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, formatDistanceToNow } from "date-fns";
import { Text } from "~/components/ui/text";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetPostById, postComment, deleteComment, likePost, unlikePost, deletePost } from "~/services/posts";
import { useAuth } from "~/lib/hooks/useAuth";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { useNetworkStatus } from "~/services/network";
import { IPost } from "~/types";
import { useSQLite } from "~/providers/RealContextProvider";

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

const PostScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const sqlite = useSQLite();
  
  const commentSchema = z.object({
    comment: z.string().min(1, t("CommunityPage.comment_required")),
  });

  const { postId } = useLocalSearchParams<{ postId: string }>();
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: "" },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth({});

  const { post, isLoading, refresh } = useGetPostById(parseInt(postId));

  // Parse user data from JSON string
  const postUser = post?.user ;
  
  // Parse comments from JSON string
  const comments: Comment[] = post?.comments ;
  
  // Parse likes from JSON string
  const likes = post?.likes;
  const isLiked = likes.some((like: any) => like.user_id === user.id);
  const likesCount = likes.length;

  const handleAddComment = async (data: { comment: string }) => {
    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: t("Common.offline_title"),
        text2: t("Common.offline_comment_message"),
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    if (isSubmitting || !post) return;
    setIsSubmitting(true);

    try {
      await postComment({ id: parseInt(postId), comment: data.comment });
      
      // Reset form
      reset({ comment: "" });
      
      // Show success toast
      Toast.show({
        type: 'success',
        text1: t("CommunityPage.comment_added"),
        position: 'top',
        visibilityTime: 3000,
      });

      // Refresh to get updated data from server and sync to SQLite
      await refresh();
    } catch (error) {
      console.error("Error adding comment:", error);
      
      // Show error toast
      Toast.show({
        type: 'error',
        text1: t("CommunityPage.comment_error"),
        text2: t("CommunityPage.try_again"),
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!post) return;

    try {
      await deleteComment({ commentId });
      
      // Show delete success toast
      Toast.show({
        type: 'success',
        text1: t("CommunityPage.comment_deleted"),
        position: 'top',
        visibilityTime: 3000,
      });

      // Refresh to sync with server
      await refresh();
    } catch (error) {
      console.error("Error deleting comment:", error);
      
      // Show error toast
      Toast.show({
        type: 'error',
        text1: t("CommunityPage.delete_error"),
        text2: t("CommunityPage.try_again"),
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleLikePress = async () => {
    if (!post) return;

    const currentLikes = likes;
    const newIsLiked = !isLiked;
    
    // Optimistic update to SQLite
    const updatedLikes = newIsLiked
      ? [...currentLikes, { user_id: user.id }]
      : currentLikes.filter((like: any) => like.user_id !== user.id);

    try {
      // Update local SQLite immediately for instant UI feedback
      await sqlite.update('posts', post.id.toString(), {
        likes: JSON.stringify(updatedLikes)
      });

      // Make API call
      if (isLiked) {
        await unlikePost({ id: post.id });
      } else {
        await likePost({ id: post.id });
      }
      
      Toast.show({
        type: 'success',
        text1: isLiked ? t("CommunityPage.post_unliked") : t("CommunityPage.post_liked"),
        position: 'top',
        visibilityTime: 1000,
      });

      // Refresh in background to ensure consistency with server
      refresh();
    } catch (error) {
      console.error('Error in handleLikePress:', error);
      
      // Revert SQLite update on error
      try {
        await sqlite.update('posts', post.id.toString(), {
          likes: JSON.stringify(currentLikes)
        });
      } catch (revertError) {
        console.error('Error reverting like update:', revertError);
      }
      
      Toast.show({
        type: 'error',
        text1: t("Common.error"),
        text2: t("CommunityPage.try_again"),
        position: 'top',
        visibilityTime: 2000,
      });

      // Force refresh to get correct state
      await refresh();
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;

    // Store post data for potential restoration
    const postCopy = { ...post };

    try {
      // Optimistically delete from SQLite
      await sqlite.delete('posts', post.id.toString());

      // Navigate back immediately
      router.back();

      // Make API call
      await deletePost({ id: post.id });

      Toast.show({
        type: 'success',
        text1: t("CommunityPage.post_deleted"),
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error deleting post:', error);

      // Restore post in SQLite on error
      try {
        await sqlite.create('posts', postCopy);
      } catch (restoreError) {
        console.error('Error restoring post:', restoreError);
      }

      Toast.show({
        type: 'error',
        text1: t("Common.error"),
        text2: t("CommunityPage.try_again"),
        position: 'top',
        visibilityTime: 2000,
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderHeader = () => {
    if (!post) return null;

    return (
      <View className="bg-white p-4 rounded-lg">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Image
              source={{ uri: postUser?.picture || '' }}
              className="w-10 h-10 rounded-full"
            />
            <View className="ml-3">
              <Text className="font-semibold">{postUser?.name || ''}</Text>
              <Text className="text-gray-500 text-sm">
                {post.created_at &&
                  `${format(
                    new Date(post.created_at),
                    "MMM dd, yyyy"
                  )} - ${formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                  })}`}
              </Text>
            </View>
          </View>
          {postUser?.id === user.id && (
            <TouchableOpacity
              onPress={handleDeletePost}
              className="bg-slate-100 p-2 rounded-full"
            >
              <Ionicons name="trash" size={16} color="grey" />
            </TouchableOpacity>
          )}
        </View>
        <Text className="text-lg font-semibold">{post.title}</Text>
        <Text className="text-gray-600 mt-4">{post.body}</Text>

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
            <Text className="ml-2 text-gray-500">{likesCount}</Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <TabBarIcon
              name="comment"
              size={16}
              color="grey"
              family="FontAwesome6"
            />
            <Text className="ml-2 text-gray-500">{comments.length}</Text>
          </View>
          <View className="flex-row items-center">
            <TabBarIcon
              name="flag"
              size={16}
              color={post.flagged === 1 ? "red" : "grey"}
              family="FontAwesome6"
            />
          </View>
        </View>
      </View>
    );
  };

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
        {item?.user?.id === user.id && (
          <TouchableOpacity
            className="bg-slate-100 p-2 rounded-full"
            onPress={() => handleDeleteComment(item.id)}
          >
            <Ionicons name="trash" size={16} color="grey" />
          </TouchableOpacity>
        )}
      </View>
      <Text className="text-base mt-1">{item?.comment}</Text>
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <HeaderNavigation showLeft={true} showRight={true} showLogo={true} />
        <View className="flex-1 justify-center items-center">
          <Text>{t("Common.loading")}</Text>
        </View>
        <Toast />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation showLeft={true} showRight={true} showLogo={true} />
      <FlatList
        data={comments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={comments.length === 0 ? renderHeader : undefined}
      />
      <View className="flex-row items-center mt-4 bg-white py-1 pr-4">
        {renderCommentInput()}
      </View>
      <Toast />
    </SafeAreaView>
  );
};

export default PostScreen;