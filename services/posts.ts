import { useState, useEffect, useCallback } from "react";
import { baseInstance } from "~/utils/axios";
import { IPost } from "~/types";
import { useSQLite } from "~/providers/RealContextProvider";
import { isOnline } from "./network";
import Toast from "react-native-toast-message";

// ============================================
// API CALLS (unchanged - still call your backend)
// ============================================

export const fetchPostsFromAPI = async (): Promise<IPost[]> => {
  try {
    const response = await baseInstance.get("/posts");
    return response.data.posts || [];
  } catch (error) {
    console.error("Error fetching posts from API:", error);
    throw error;
  }
};

export const reportPost = async ({ id, reason }: { id: number; reason: string }) => {
  try {
    const response = await baseInstance.post(`/posts/${id}/report`, { reason });
    return response.data;
  }
  catch (error) {
    console.error("Error reporting post:", error);
    throw error;
  } 
};

export const fetchPostByIdFromAPI = async (postId: number): Promise<IPost> => {
  try {
    const response = await baseInstance.get(`/posts/${postId}`);
    return response.data.post;
  } catch (error) {
    console.error("Error fetching post by ID from API:", error);
    throw error;
  }
};

export const postComment = async ({ id, comment }: { id: number; comment: string }) => {
  try {
    const response = await baseInstance.post("/comments", { post_id: id, comment });
    return response.data;
  } catch (error) {
    console.error("Error posting comment:", error);
    throw error;
  }
};

export const deleteComment = async ({ commentId }: { commentId: number }) => {
  try {
    const response = await baseInstance.delete(`/comments/${commentId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};

export const likePost = async ({ id }: { id: number }) => {
  try {
    const response = await baseInstance.post(`/posts/${id}/like`);
    return response.data;
  } catch (error) {
    console.error("Error liking post:", error);
    throw error;
  }
};

export const unlikePost = async ({ id }: { id: number }) => {
  try {
    const response = await baseInstance.delete(`/posts/${id}/like`);
    return response.data;
  } catch (error) {
    console.error("Error unliking post:", error);
    throw error;
  }
};

export const deletePost = async ({ id }: { id: number }) => {
  try {
    const response = await baseInstance.delete(`/posts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};

export const createPost = async ({ title, body }: { title: string; body: string }) => {
  try {
    const response = await baseInstance.post("/posts", { title, body });
    return response.data;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

// ============================================
// SQLITE SYNC FUNCTIONS
// ============================================

const transformApiPostsToSQLite = (apiPosts: any[]): any[] => {
  return apiPosts.map((post) => ({
    _id: post.id.toString(),
    id: post.id,
    user_id: post.user_id,
    status: post.status || 'active',
    title: post.title,
    body: post.body,
    flagged: post.flagged || 0,
    created_at: post.created_at,
    updated_at: post.updated_at,
    user: JSON.stringify(post.user || {}),
    comments: JSON.stringify(post.comments || []),
    likes: JSON.stringify(post.likes || []),
  }));
};

export const syncPostsToSQLite = async (sqlite: ReturnType<typeof useSQLite>) => {
  if (!isOnline()) {
    console.log("Offline - skipping posts sync");
    return;
  }

  try {
    console.log("Fetching posts from API...");
    const apiPosts = await fetchPostsFromAPI();
    console.log(`Fetched ${apiPosts.length} posts from API`);

    const transformedPosts = transformApiPostsToSQLite(apiPosts);

    // Clear existing posts and insert new ones
    await sqlite.deleteAll('posts');
    
    if (transformedPosts.length > 0) {
      await sqlite.batchCreate('posts', transformedPosts);
      console.log(`✅ Synced ${transformedPosts.length} posts to SQLite`);
    }
  } catch (error) {
    console.error("Error syncing posts to SQLite:", error);
    throw error;
  }
};

// ============================================
// HOOKS
// ============================================

export const useGetAllPosts = (forceSync: boolean = false) => {
  const sqlite = useSQLite();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const loadPosts = useCallback(async (shouldSync: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Sync from API if online and (forceSync OR shouldSync OR no data)
      const localPosts = await sqlite.getAll<any>('posts');
      
      if (shouldSync || forceSync || localPosts.length === 0) {
        if (isOnline()) {
          try {
            await syncPostsToSQLite(sqlite);
            setLastSyncTime(new Date());
          } catch (syncError) {
            console.error("Sync failed, using local data:", syncError);
          }
        }
      }

      // Load from SQLite
      const data = await sqlite.getAll<any>('posts');
      
      // Parse JSON fields
      const parsedPosts: IPost[] = data.map(post => ({
        ...post,
        id: Number(post.id),
        user_id: Number(post.user_id),
        flagged: Number(post.flagged),
        user: post.user,
        comments: post.comments,
        likes: post.likes,
      }));

      // Sort by creation date (newest first)
      parsedPosts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPosts(parsedPosts);
    } catch (err) {
      setError(err);
      console.error("Error loading posts:", err);
      Toast.show({
        type: 'error',
        text1: 'Error loading posts',
        text2: 'Please try again',
        position: 'top',
      });
    } finally {
      setIsLoading(false);
    }
  }, [sqlite, forceSync]);

  useEffect(() => {
    if (sqlite.isReady) {
      loadPosts(true);
    }
  }, [sqlite.isReady, loadPosts]);

  const refresh = useCallback(async () => {
    await loadPosts(true);
  }, [loadPosts]);

  return {
    posts,
    isLoading,
    error,
    lastSyncTime,
    refresh,
  };
};

export const useGetPostById = (postId: number) => {
  const sqlite = useSQLite();
  const [post, setPost] = useState<IPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const loadPost = useCallback(async (shouldSync: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to sync from API if online and shouldSync
      if (shouldSync && isOnline()) {
        try {
          const apiPost = await fetchPostByIdFromAPI(postId);
          const transformedPosts = transformApiPostsToSQLite([apiPost]);
          
          if (transformedPosts.length > 0) {
            // Update the specific post in SQLite
            const existingPost = await sqlite.getById<any>('posts', postId.toString());
            if (existingPost) {
              await sqlite.update('posts', postId.toString(), transformedPosts[0]);
            } else {
              await sqlite.create('posts', transformedPosts[0]);
            }
          }
        } catch (syncError) {
          console.error("Sync failed, using local data:", syncError);
        }
      }

      // Load from SQLite
      const localPost = await sqlite.getById<any>('posts', postId.toString());
      
      if (localPost) {
        const parsedPost: IPost = {
          ...localPost,
          id: Number(localPost.id),
          user_id: Number(localPost.user_id),
          flagged: Number(localPost.flagged),
          user: localPost.user,
          comments: localPost.comments,
          likes: localPost.likes,
        };
        setPost(parsedPost);
      } else {
        setPost(null);
      }
    } catch (err) {
      setError(err);
      console.error("Error loading post:", err);
      Toast.show({
        type: 'error',
        text1: 'Error loading post',
        text2: 'Please try again',
        position: 'top',
      });
    } finally {
      setIsLoading(false);
    }
  }, [sqlite, postId]);

  useEffect(() => {
    if (sqlite.isReady && postId) {
      loadPost(true);
    }
  }, [sqlite.isReady, postId, loadPost]);

  const refresh = useCallback(async () => {
    await loadPost(true);
  }, [loadPost]);

  return {
    post,
    isLoading,
    error,
    refresh,
  };
};

// Hook for creating a new post
export const useCreatePost = () => {
  const sqlite = useSQLite();
  const [isCreating, setIsCreating] = useState(false);

  const createNewPost = useCallback(async ({ title, body }: { title: string; body: string }) => {
    setIsCreating(true);
    try {
      // Create on server first
      const response = await createPost({ title, body });
      
      // Then add to local SQLite
      if (response.post) {
        const transformedPosts = transformApiPostsToSQLite([response.post]);
        if (transformedPosts.length > 0) {
          await sqlite.create('posts', transformedPosts[0]);
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Post created successfully',
        position: 'top',
      });

      return response;
    } catch (error) {
      console.error("Error creating post:", error);
      Toast.show({
        type: 'error',
        text1: 'Failed to create post',
        text2: 'Please try again',
        position: 'top',
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [sqlite]);

  return {
    createNewPost,
    isCreating,
  };
};