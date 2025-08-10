import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { IComment, ILikes, IPost, IResponse, IResponseError } from "~/types";
import { AxiosError } from "axios";
import {
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  postComment,
  deleteComment,
  updateComment,
  reportPost,
} from "~/services/posts";
import Toast from "react-native-toast-message";
import { Href, router } from "expo-router";
import { queryClient } from "~/providers/QueryProvider";

export const usePostManipulate = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleError = (error: AxiosError<IResponseError>) => {
    console.error("Error:", error);
    Toast.show({
      text1: error.response?.data.message || "An error occurred",
      type: "error",
      position: "bottom",
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 30,
    });
  };

  const handleSuccess = (message: string, navigateTo?: string) => {
    Toast.show({
      text1: message,
      type: "success",
      position: "top",
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 30,
    });
    queryClient.invalidateQueries({ queryKey: ["posts"] }); // Refetch posts
    if (navigateTo) {
      router.push(navigateTo as Href);
    }
  };

  const createPostMutation = useMutation<
    IResponse<IPost>,
    AxiosError<IResponseError>,
    { title: string; body: string }
  >({
    mutationFn: createPost,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: (data) => {
      console.log("The post data: ", data);
      if (data.data?.id != null) {
        handleSuccess("Post created successfully", "/(community)/community");
      }
    },
    onSettled: () => setIsLoading(false),
  });

  const updatePostMutation = useMutation<
    IResponse<IPost>,
    AxiosError<IResponseError>,
    { title: string; body: string; id: number }
  >({
    mutationFn: updatePost,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: () => handleSuccess("Post updated successfully"),
    onSettled: () => setIsLoading(false),
  });

  const deletePostMutation = useMutation<
    IResponse<{ message: string }>,
    AxiosError<IResponseError>,
    { id: number }
  >({
    mutationFn: deletePost,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: () => handleSuccess("Post deleted successfully"),
    onSettled: () => setIsLoading(false),
  });

  const likePostMutation = useMutation<
    IResponse<ILikes>,
    AxiosError<IResponseError>,
    { id: number }
  >({
    mutationFn: likePost,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: () => handleSuccess("Post liked successfully"),
    onSettled: () => setIsLoading(false),
  });

  const unlikePostMutation = useMutation<
    IResponse<{ message: string }>,
    AxiosError<IResponseError>,
    { id: number }
  >({
    mutationFn: unlikePost,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: () => handleSuccess("Post unliked successfully"),
    onSettled: () => setIsLoading(false),
  });

  const postCommentMutation = useMutation<
    IResponse<IComment>,
    AxiosError<IResponseError>,
    { id: number; comment: string }
  >({
    mutationFn: postComment,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: () => handleSuccess("Comment posted successfully"),
    onSettled: () => setIsLoading(false),
  });

  const deleteCommentMutation = useMutation<
    IResponse<{ message: string }>,
    AxiosError<IResponseError>,
    { commentId: number }
  >({
    mutationFn: deleteComment,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: () => handleSuccess("Comment deleted successfully"),
    onSettled: () => setIsLoading(false),
  });

  const updateCommentMutation = useMutation<
    IResponse<IComment>,
    AxiosError<IResponseError>,
    { commentId: number; comment: string }
  >({
    mutationFn: updateComment,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: () => handleSuccess("Comment updated successfully"),
    onSettled: () => setIsLoading(false),
  });

  const reportPostMutation = useMutation<
    IResponse<{ message: string }>,
    AxiosError<IResponseError>,
    { id: number; reason: string }
  >({
    mutationFn: reportPost,
    onMutate: () => setIsLoading(true),
    onError: handleError,
    onSuccess: () => handleSuccess("Post reported successfully"),
    onSettled: () => setIsLoading(false),
  });

  return {
    useCreatePost: createPostMutation.mutate,
    useUpdatePost: updatePostMutation.mutate,
    useDeletePost: deletePostMutation.mutate,
    useLikePost: likePostMutation.mutate,
    useUnlikePost: unlikePostMutation.mutate,
    usePostComment: postCommentMutation.mutate,
    useDeleteComment: deleteCommentMutation.mutate,
    useUpdateComment: updateCommentMutation.mutate,
    useReportPost: reportPostMutation.mutate,
    isLoading,
  };
};
