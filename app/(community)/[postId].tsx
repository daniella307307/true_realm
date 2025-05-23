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
import { Post } from "~/models/posts/post";
import { RealmContext } from "~/providers/RealContextProvider";
import Realm from "realm";

const { useRealm } = RealmContext;

const PostScreen: React.FC = () => {
  const { t } = useTranslation();
  const realm = useRealm();
  const router = useRouter();
  
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
    reset
  } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: "" },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const { user } = useAuth({});

  const { post, isLoading, refresh } = useGetPostById(parseInt(postId));

  const [localPost, setLocalPost] = useState<Post | null>(null);

  useEffect(() => {
    if (post) {
      setLocalPost(post);
    }
  }, [post]);

  // Initialize local comments from post data
  useEffect(() => {
    if (post?.comments) {
      setLocalComments(JSON.parse(post.comments).reverse());
    }
  }, [post?.comments]);

  const handleAddComment = async (data: { comment: string }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Create optimistic comment
    const optimisticComment: Comment = {
      id: Date.now(), // Temporary ID
      user: {
        id: user.id,
        name: user.name,
        picture: user.picture,
      },
      comment: data.comment,
      created_at: new Date().toISOString(),
    };

    // Optimistically update UI
    setLocalComments(prev => [optimisticComment, ...prev]);
    
    try {
      const response = await postComment({ id: parseInt(postId), comment: data.comment });
      // Reset form
      reset({ comment: "" });
      
      // Show success toast
      Toast.show({
        type: 'success',
        text1: t("CommunityPage.comment_added"),
        position: 'top',
        visibilityTime: 3000,
      });

      // Refresh to get the actual server data
      await refresh();
    } catch (error) {
      console.error("Error adding comment:", error);
      // Revert optimistic update on error
      setLocalComments(prev => prev.filter(comment => comment.id !== optimisticComment.id));
      
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
    try {
      await deleteComment({ commentId });
      await refresh();
      // Show delete success toast
      Toast.show({
        type: 'success',
        text1: t("CommunityPage.comment_deleted"),
        position: 'top',
        visibilityTime: 3000,
      });
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

  const currentUserId = user.id;
  const isLiked = localPost?.likes ? JSON.parse(localPost.likes).some((like: any) => like.user_id === currentUserId) : false;

  const handleLikePress = async () => {
    console.log('=== Starting handleLikePress in PostScreen ===');
    if (!localPost) {
      console.log('No localPost available, returning');
      return;
    }

    console.log('Post data:', { 
      id: localPost.id, 
      likes: localPost.likes,
      currentUserId 
    });

    const currentLikes = JSON.parse(localPost.likes);
    console.log('Current likes:', currentLikes);
    
    // Create optimistic update
    const updatedLikes = isLiked
      ? currentLikes.filter((like: any) => like.user_id !== currentUserId)
      : [...currentLikes, { user_id: currentUserId }];
    console.log('Updated likes array:', updatedLikes);

    let updatedPost: Post | null = null;

    try {
      console.log('Attempting to update local Realm state');
      // Update local state immediately
      realm.write(() => {
        updatedPost = realm.create(
          Post,
          {
            ...localPost,
            likes: JSON.stringify(updatedLikes)
          },
          Realm.UpdateMode.Modified
        );
      });

      if (!updatedPost) {
        throw new Error('Failed to update post in Realm');
      }

      console.log('Local Realm update successful:', { 
        id: (updatedPost as Post).id, 
        newLikesCount: JSON.parse((updatedPost as Post).likes).length 
      });

      setLocalPost(updatedPost as Post);
      console.log('Local state updated successfully');

      console.log('Making API call to', isLiked ? 'unlike' : 'like', 'post');
      if (isLiked) {
        await unlikePost({ id: localPost.id });
        console.log('Unlike API call successful');
      } else {
        await likePost({ id: localPost.id });
        console.log('Like API call successful');
      }
      
      Toast.show({
        type: 'success',
        text1: isLiked ? 'Post unliked' : 'Post liked',
        position: 'top',
        visibilityTime: 1000,
      });
    } catch (error) {
      console.error('Error in handleLikePress:', error);
      console.log('Attempting to revert optimistic update');
      
      try {
        realm.write(() => {
          const revertedPost = realm.create(
            Post,
            {
              ...localPost,
              likes: JSON.stringify(currentLikes)
            },
            Realm.UpdateMode.Modified
          );
          console.log('Successfully reverted local Realm state');
          
          setLocalPost(revertedPost);
        });
        console.log('Successfully reverted local state');
      } catch (revertError) {
        console.error('Error while reverting optimistic update:', revertError);
      }
      
      Toast.show({
        type: 'error',
        text1: 'Failed to update like',
        text2: 'Please try again',
        position: 'top',
        visibilityTime: 2000,
      });
    }

    // Refresh in background
    console.log('Triggering background refresh');
    refresh();
    console.log('=== Finished handleLikePress in PostScreen ===');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDeletePost = async () => {
    console.log('=== Starting handleDeletePost in PostScreen ===');
    if (!localPost) {
      console.log('No localPost available, returning');
      return;
    }

    // Create a detached copy of the post data
    const postCopy = {
      id: localPost.id,
      user_id: localPost.user_id,
      status: localPost.status,
      title: localPost.title,
      body: localPost.body,
      flagged: localPost.flagged,
      created_at: localPost.created_at,
      updated_at: localPost.updated_at,
      user: localPost.user,
      comments: localPost.comments,
      likes: localPost.likes
    };

    console.log('Created detached copy of post:', { id: postCopy.id, title: postCopy.title });

    try {
      // Optimistically remove from Realm
      console.log('Attempting to update Realm...');
      realm.write(() => {
        const realmPost = realm.objectForPrimaryKey(Post, localPost.id);
        if (realmPost) {
          realm.delete(realmPost);
          console.log('Post deleted from Realm successfully');
        } else {
          console.log('Post not found in Realm');
        }
      });

      // Navigate back immediately for instant feedback
      router.back();

      // Make the API call
      console.log('Making API call to delete post');
      await deletePost({ id: localPost.id });
      console.log('API call successful - post deleted from server');

      Toast.show({
        type: 'success',
        text1: 'Post deleted successfully',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error in handleDeletePost:', error);
      console.log('Attempting to restore deleted post');

      try {
        // Restore in Realm using the copy
        realm.write(() => {
          realm.create(
            Post,
            postCopy,
            Realm.UpdateMode.Modified
          );
          console.log('Post restored in Realm');
        });

        Toast.show({
          type: 'error',
          text1: 'Failed to delete post',
          text2: 'Please try again',
          position: 'top',
          visibilityTime: 2000,
        });
      } catch (restoreError) {
        console.error('Error while restoring post:', restoreError);
      }
    }

    console.log('=== Finished handleDeletePost in PostScreen ===');
  };

  const renderHeader = () => (
    <View className="bg-white p-4 rounded-lg">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Image
            source={{ uri: localPost?.user ? JSON.parse(localPost.user).picture : '' }}
            className="w-10 h-10 rounded-full"
          />
          <View className="ml-3">
            <Text className="font-semibold">{localPost?.user ? JSON.parse(localPost.user).name : ''}</Text>
            <Text className="text-gray-500 text-sm">
              {localPost?.created_at &&
                `${format(
                  new Date(localPost.created_at),
                  "MMM dd, yyyy"
                )} - ${formatDistanceToNow(new Date(localPost.created_at), {
                  addSuffix: true,
                })}`}
            </Text>
          </View>
        </View>
        {JSON.parse(localPost?.user || '{}').id === currentUserId && (
          <TouchableOpacity
            onPress={handleDeletePost}
            className="bg-slate-100 p-2 rounded-full"
          >
            <Ionicons name="trash" size={16} color="grey" />
          </TouchableOpacity>
        )}
      </View>
      <Text className="text-lg font-semibold">{localPost?.title}</Text>
      <Text className="text-gray-600 mt-4">{localPost?.body}</Text>

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
          <Text className="ml-2 text-gray-500">{localPost?.likes ? JSON.parse(localPost.likes).length : 0}</Text>
        </TouchableOpacity>
        <View className="flex-row items-center">
          <TabBarIcon
            name="comment"
            size={16}
            color="grey"
            family="FontAwesome6"
          />
          <Text className="ml-2 text-gray-500">{localPost?.comments ? JSON.parse(localPost.comments).length : 0}</Text>
        </View>
        <View className="flex-row items-center">
          <TabBarIcon
            name="flag"
            size={16}
            color={localPost?.flagged === 1 ? "red" : "grey"}
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
        {item?.user?.id === currentUserId && (
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation showLeft={true} showRight={true} showLogo={true} />
      <FlatList
        data={localComments}
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
      <Toast />
    </SafeAreaView>
  );
};

export default PostScreen;
