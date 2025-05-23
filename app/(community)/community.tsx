import React, { useState, useCallback, useEffect } from "react";
import { RealmContext } from "~/providers/RealContextProvider";

import {
  FlatList,
  TouchableOpacity,
  View,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from "react-native";

import { useRouter } from "expo-router";

import CustomInput from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import { ILikes } from "~/types";
import { TabBarIcon } from "~/components/ui/tabbar-icon";
import { Text } from "~/components/ui/text";
import { format, formatDistanceToNow } from "date-fns";
import { t } from "i18next";
import { useAuth } from "~/lib/hooks/useAuth";
import { useForm } from "react-hook-form";
import {
  useGetPosts,
  likePost,
  unlikePost,
  deletePost,
  reportPost,
} from "~/services/posts";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Post } from "~/models/posts/post";
import HeaderNavigation from "~/components/ui/header";
import Toast from "react-native-toast-message";
import Realm from "realm";

const { useRealm } = RealmContext;

const CommunityScreen: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const router = useRouter();
  const { user } = useAuth({});
  const { control, watch } = useForm({
    resolver: zodResolver(
      z.object({
        searchQuery: z.string(),
      })
    ),
    mode: "onChange",
  });

  const searchQuery = watch("searchQuery");
  const { posts, isLoading, refresh } = useGetPosts();
  const realm = useRealm();

  useEffect(() => {
    if (posts) {
      setLocalPosts([...posts]);
    }
  }, [posts]);

  const handleLikePress = async (post: Post) => {
    console.log('=== Starting handleLikePress ===');
    console.log('Post received:', { id: post.id, likes: post.likes });
    
    const currentUserId = user.id;
    console.log('Current user ID:', currentUserId);
    
    const currentLikes = JSON.parse(post.likes);
    console.log('Current likes:', currentLikes);
    
    const isLiked = currentLikes.some(
      (like: ILikes) => like.user_id === currentUserId
    );
    console.log('Is post already liked:', isLiked);

    // Create optimistic update
    const updatedLikes = isLiked
      ? currentLikes.filter((like: ILikes) => like.user_id !== currentUserId)
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
            ...post,
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

      setLocalPosts(prevPosts =>
        prevPosts.map(p => p.id === post.id ? (updatedPost as Post) : p)
      );
      console.log('Local state updated successfully');

      console.log('Making API call to', isLiked ? 'unlike' : 'like', 'post');
      if (isLiked) {
        await unlikePost({ id: post.id });
        console.log('Unlike API call successful');
      } else {
        await likePost({ id: post.id });
        console.log('Like API call successful');
      }
      
      Toast.show({
        type: 'success',
        text1: isLiked ? t('CommunityPage.post_unliked') : t('CommunityPage.post_liked'),
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
              ...post,
              likes: JSON.stringify(currentLikes)
            },
            Realm.UpdateMode.Modified
          );
          console.log('Successfully reverted local Realm state');
          
          setLocalPosts(prevPosts =>
            prevPosts.map(p => p.id === post.id ? revertedPost : p)
          );
        });
        console.log('Successfully reverted local state');
      } catch (revertError) {
        console.error('Error while reverting optimistic update:', revertError);
      }
      
      Toast.show({
        type: 'error',
        text1: t('CommunityPage.like_error'),
        text2: t('CommunityPage.try_again'),
        position: 'top',
        visibilityTime: 2000,
      });
    }

    // Refresh in background
    console.log('Triggering background refresh');
    refresh();
    console.log('=== Finished handleLikePress ===');
  };

  const handleDeletePost = async (postId: number) => {
    console.log('=== Starting handleDeletePost ===');
    console.log('Attempting to delete post:', postId);

    // Store the post for potential recovery
    const postToDelete = localPosts.find(p => p.id === postId);
    if (!postToDelete) {
      console.log('Post not found in local state');
      return;
    }

    // Create a detached copy of the post data
    const postCopy = {
      id: postToDelete.id,
      user_id: postToDelete.user_id,
      status: postToDelete.status,
      title: postToDelete.title,
      body: postToDelete.body,
      flagged: postToDelete.flagged,
      created_at: postToDelete.created_at,
      updated_at: postToDelete.updated_at,
      user: postToDelete.user,
      comments: postToDelete.comments,
      likes: postToDelete.likes
    };

    console.log('Created detached copy of post:', { id: postCopy.id, title: postCopy.title });

    try {
      // Optimistically remove the post from local state
      console.log('Updating local state...');
      setLocalPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
      console.log('Local state updated - post removed');

      // Optimistically remove from Realm
      console.log('Attempting to update Realm...');
      realm.write(() => {
        const realmPost = realm.objectForPrimaryKey(Post, postId);
        if (realmPost) {
          realm.delete(realmPost);
          console.log('Post deleted from Realm successfully');
        } else {
          console.log('Post not found in Realm');
        }
      });

      // Make the API call
      console.log('Making API call to delete post');
      await deletePost({ id: postId });
      console.log('API call successful - post deleted from server');

      Toast.show({
        type: 'success',
        text1: t('CommunityPage.post_deleted'),
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error in handleDeletePost:', error);
      console.log('Attempting to restore deleted post');

      try {
        // Restore the post in local state using the copy
        setLocalPosts(prevPosts => [...prevPosts, postCopy as Post]);
        console.log('Local state restored');

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
          text1: t('CommunityPage.delete_error'),
          text2: t('CommunityPage.try_again'),
          position: 'top',
          visibilityTime: 2000,
        });
      } catch (restoreError) {
        console.error('Error while restoring post:', restoreError);
      }
    }

    // Refresh in background
    console.log('Triggering background refresh');
    refresh();
    console.log('=== Finished handleDeletePost ===');
  };

  const handleReportPress = (postId: number) => {
    setSelectedPostId(postId);
    setModalVisible(true);
  };

  const handleSendReport = async () => {
    if (!selectedPostId || !reportText.trim()) {
      Toast.show({
        type: 'error',
        text1: t('CommunityPage.report_description_required'),
        position: 'top',
        visibilityTime: 2000,
      });
      return;
    }

    try {
      await reportPost({ id: selectedPostId, reason: reportText });
      setModalVisible(false);
      setReportText('');
      setSelectedPostId(null);
      
      Toast.show({
        type: 'success',
        text1: t('CommunityPage.report_submitted'),
        position: 'top',
        visibilityTime: 2000,
      });
      
      refresh();
    } catch (error) {
      console.error("Error reporting post:", error);
      Toast.show({
        type: 'error',
        text1: t('CommunityPage.report_error'),
        text2: t('CommunityPage.try_again'),
        position: 'top',
        visibilityTime: 2000,
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  const filteredPosts = localPosts
    .filter((post: Post) => post.status === 1)
    .filter((post: Post) => {
      if (!searchQuery) return true;
      return (
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.body.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a: Post, b: Post) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // console.log("Posts: ", JSON.stringify(posts, null, 2));
  const renderPost = ({ item }: { item: Post }) => {
    const currentUserId = user.id;
    const isLiked = JSON.parse(item.likes).some(
      (like: ILikes) => like.user_id === currentUserId
    );
    const isOwner = JSON.parse(item.user).id === currentUserId;

    return (
      <View className="bg-white p-4 m-2 rounded-lg shadow">
        <TouchableOpacity
          onPress={() => router.push(`/(community)/${item.id}`)}
        >
          {/* User Info */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Image
                source={{ uri: JSON.parse(item.user).picture }}
                className="w-10 h-10 rounded-full"
              />
              <View className="ml-3">
                <Text className="font-semibold">
                  {JSON.parse(item.user).name}
                </Text>
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
              onPress={() => handleReportPress(item.id)}
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
          <Text
            numberOfLines={3}
            ellipsizeMode="tail"
            className="text-gray-600"
          >
            {item.body}
          </Text>

          {/* Actions */}
          <View className="flex-row justify-between mt-3">
            <View className="flex-row gap-x-4">
              <TouchableOpacity
                onPress={() => handleLikePress(item as Post)}
                className="flex-row flex justify-center items-center"
              >
                <TabBarIcon
                  name={isLiked ? "heart" : "heart-outline"}
                  size={16}
                  color={isLiked ? "red" : "grey"}
                  family="MaterialCommunityIcons"
                />
                <Text className="ml-2 text-gray-500">
                  {JSON.parse(item.likes).length}
                </Text>
              </TouchableOpacity>
              <View className="flex-row items-center">
                <TabBarIcon
                  name="comment"
                  size={16}
                  color="grey"
                  family="FontAwesome6"
                />
                <Text className="ml-2 text-gray-500">
                  {JSON.parse(item.comments).length}
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
    <SafeAreaView className="flex-1 bg-background">
      <HeaderNavigation
        showLeft={true}
        showRight={true}
        title={t("CommunityPage.title")}
      />
      <View className="bg-slate-50 relative">
        <CustomInput
          control={control}
          name="searchQuery"
          placeholder={t("CommunityPage.search_post")}
          keyboardType="default"
          accessibilityLabel={t("CommunityPage.search_post")}
        />
        <FlatList<Post>
          data={filteredPosts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 200 }}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
        <TouchableOpacity
          onPress={() => router.push("/add-post")}
          className="absolute bottom-60 right-6 bg-primary rounded-full p-4"
        >
          <TabBarIcon name="add" size={24} color="white" family="Ionicons" />
        </TouchableOpacity>

        <Modal visible={modalVisible} transparent animationType="slide">
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white p-6 rounded-lg w-4/5">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold">
                  {t("CommunityPage.report_issue")}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>

              <TextInput
                className="h-32 border p-4 border-[#E4E4E7] rounded-lg justify-start items-start flex-col"
                placeholder={t("CommunityPage.add_report_description")}
                value={reportText}
                onChangeText={setReportText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Button onPress={handleSendReport} className="mt-4">
                <Text>{t("CommunityPage.submit_report")}</Text>
              </Button>
            </View>
          </View>
        </Modal>
      </View>
      <Toast />
    </SafeAreaView>
  );
};

export default CommunityScreen;
