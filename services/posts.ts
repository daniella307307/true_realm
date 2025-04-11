import { useEffect, useState, useCallback, useMemo } from "react";

import { IComment, ILikes, IPost, IResponse } from "~/types";
import { Post } from "~/models/posts/post";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useNetworkStatus } from "./network";
import { useDataSync } from "./dataSync";

const { useRealm, useQuery } = RealmContext;

// Remote data fetching functions
export async function fetchPostsFromRemote() {
  const res = await baseInstance.get<IResponse<IPost[]>>(`/posts`);
  return res.data;
}

export async function fetchPostByIdFromRemote(id: number) {
  const res = await baseInstance.get<IPost>(`/posts/${id}`);
  return res.data;
}

// Hook for getting all posts with offline support
export function useGetPosts(forceSync: boolean = false) {
  const storedPosts = useQuery(Post);
  const { syncStatus, refresh } = useDataSync([
    {
      key: "posts",
      fetchFn: fetchPostsFromRemote,
      model: Post,
      staleTime: 5 * 60 * 1000, // 5 minutes
      transformData: (data: IResponse<IPost[]>) =>
        data.data.map((post) => ({
          ...post,
          likes: JSON.stringify(post.likes),
          comments: JSON.stringify(post.comments),
          user: JSON.stringify(post.user),
        })),
      forceSync,
    },
  ]);

  return {
    posts: storedPosts,
    isLoading: syncStatus.posts?.isLoading || false,
    error: syncStatus.posts?.error || null,
    lastSyncTime: syncStatus.posts?.lastSyncTime || null,
    refresh: () => refresh("posts", forceSync),
  };
}

// Hook for getting post by ID with offline support
export function useGetPostById(id: number, forceSync: boolean = false) {
  const { posts, isLoading, error, lastSyncTime, refresh } = useGetPosts(forceSync);
  const post = useMemo(() => {
    return posts.find((p) => p.id === id) || null;
  }, [posts, id]);

  return {
    post,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
}

export async function createPost(values: { title: string; body: string }) {
  const res = await baseInstance.post<IResponse<IPost>>("/posts", {
    title: values.title,
    body: values.body,
  });
  return res.data;
}

export async function updatePost(values: {
  title: string;
  body: string;
  id: number;
}) {
  const res = await baseInstance.put<IResponse<IPost>>(`/posts/${values.id}`, {
    title: values.title,
    body: values.body,
  });
  return res.data;
}

export async function deletePost({ id }: { id: number }) {
  const res = await baseInstance.delete<IResponse<{ message: string }>>(
    `/posts/${id}`
  );
  return res.data;
}

export async function likePost({ id }: { id: number }) {
  const res = await baseInstance.post<IResponse<ILikes>>(`/posts/${id}/like`);
  return res.data;
}

export async function unlikePost({ id }: { id: number }) {
  const res = await baseInstance.delete<IResponse<{ message: string }>>(
    `/posts/${id}/like`
  );
  return res.data;
}

export async function postComment({
  id,
  comment,
}: {
  id: number;
  comment: string;
}) {
  const res = await baseInstance.post<IResponse<IComment>>(
    `/posts/${id}/comments`,
    { comment }
  );
  return res.data;
}

export async function deleteComment({ commentId }: { commentId: number }) {
  const res = await baseInstance.delete<IResponse<{ message: string }>>(
    `/comments/${commentId}`
  );
  return res.data;
}

export async function updateComment({
  commentId,
  comment,
}: {
  commentId: number;
  comment: string;
}) {
  const res = await baseInstance.put<IResponse<IComment>>(
    `/comments/${commentId}`,
    { comment }
  );
  return res.data;
}

export async function reportPost({
  id,
  report,
}: {
  id: number;
  report: string;
}) {
  const res = await baseInstance.post<IResponse<{ message: string }>>(
    `/posts/${id}/report`,
    { report }
  );
  return res.data;
}
