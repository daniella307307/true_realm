// import { useState, useEffect, useCallback, useMemo } from "react";
// import { IPost } from "~/types";
// import { baseInstance } from "~/utils/axios";
// import { useSQLite } from "~/providers/RealContextProvider";
// import { isOnline } from "./network";
// import Toast from "react-native-toast-message";
// import { useAuth } from "~/lib/hooks/useAuth";

// // ===============================
// // API CALLS
// // ===============================
// export const fetchPostsFromAPI = async (): Promise<IPost[]> => {
//   const response = await baseInstance.get("/posts");
//   return response.data.posts || [];
// };

// export const fetchPostByIdFromAPI = async (postId: number): Promise<IPost> => {
//   const response = await baseInstance.get(`/posts/${postId}`);
//   return response.data.post;
// };

// export const createPostAPI = async ({ title, body }: { title: string; body: string }) => {
//   const response = await baseInstance.post("/posts", { title, body });
//   return response.data;
// };

// export const likePostAPI = async ({ id }: { id: number }) => {
//   const response = await baseInstance.post(`/posts/${id}/like`);
//   return response.data;
// };

// export const unlikePostAPI = async ({ id }: { id: number }) => {
//   const response = await baseInstance.delete(`/posts/${id}/like`);
//   return response.data;
// };

// export const deletePostAPI = async ({ id }: { id: number }) => {
//   const response = await baseInstance.delete(`/posts/${id}`);
//   return response.data;
// };

// export const postCommentAPI = async ({ id, comment }: { id: number; comment: string }) => {
//   const response = await baseInstance.post("/comments", { post_id: id, comment });
//   return response.data;
// };

// export const deleteCommentAPI = async ({ commentId }: { commentId: number }) => {
//   const response = await baseInstance.delete(`/comments/${commentId}`);
//   return response.data;
// };

// // ===============================
// // SQLITE TRANSFORM & SYNC
// // ===============================
// const transformApiPostsToSQLite = (apiPosts: IPost[]) => {
//   return apiPosts.map(post => ({
//     _id: post.id.toString(),
//     id: post.id,
//     user_id: post.user_id,
//     status: post.status || "active",
//     title: post.title,
//     body: post.body,
//     flagged: post.flagged || 0,
//     created_at: post.created_at,
//     updated_at: post.updated_at,
//     user: JSON.stringify(post.user || {}),
//     comments: JSON.stringify(post.comments || []),
//     likes: JSON.stringify(post.likes || []),
//   }));
// };

// export const syncPostsToSQLite = async (sqlite: ReturnType<typeof useSQLite>) => {
//   if (!isOnline()) return;

//   try {
//     const apiPosts = await fetchPostsFromAPI();
//     const transformed = transformApiPostsToSQLite(apiPosts);

//     await sqlite.deleteAll("posts");
//     if (transformed.length > 0) await sqlite.batchCreate("posts", transformed);
//   } catch (err) {
//     console.error("Failed syncing posts:", err);
//   }
// };

// // ===============================
// // HOOKS
// // ===============================

// export const useGetAllPosts = (forceSync = false) => {
//   const sqlite = useSQLite();
//   const [posts, setPosts] = useState<IPost[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<any>(null);
//   const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

//   const loadPostsFromSQLite = useCallback(async () => {
//     const localPosts = await sqlite.getAll<any>("posts");
//     return localPosts.map(post => ({
//       ...post,
//       id: Number(post.id),
//       user_id: Number(post.user_id),
//       flagged: Number(post.flagged),
//       user: JSON.parse(post.user || "{}"),
//       comments: JSON.parse(post.comments || "[]"),
//       likes: JSON.parse(post.likes || "[]"),
//     }));
//   }, [sqlite]);

//   const loadPosts = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       // Load from SQLite first
//       let localPosts = await loadPostsFromSQLite();
//       setPosts(localPosts);

//       // Sync if online
//       if (forceSync && isOnline()) {
//         await syncPostsToSQLite(sqlite);
//         const updatedPosts = await loadPostsFromSQLite();
//         setPosts(updatedPosts);
//         setLastSyncTime(new Date());
//       }
//     } catch (err) {
//       console.error("Error loading posts:", err);
//       setError(err);
//       Toast.show({ type: "error", text1: "Error loading posts", position: "top" });
//     } finally {
//       setIsLoading(false);
//     }
//   }, [sqlite, forceSync, loadPostsFromSQLite]);

//   useEffect(() => {
//     if (sqlite.isReady) loadPosts();
//   }, [sqlite.isReady, loadPosts]);

//   const refresh = useCallback(() => loadPosts(), [loadPosts]);

//   return { posts, isLoading, error, lastSyncTime, refresh };
// };

// export const useGetPostById = (postId: number, forceSync = false) => {
//   const sqlite = useSQLite();
//   const [post, setPost] = useState<IPost | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<any>(null);
 
//   const loadPostFromSQLite = useCallback(async () => {
//     const localPost = await sqlite.getById<any>("posts", postId.toString());
//     if (!localPost) return null;
//     return {
//       ...localPost,
//       id: Number(localPost.id),
//       user_id: Number(localPost.user_id),
//       flagged: Number(localPost.flagged),
//       user: JSON.parse(localPost.user || "{}"),
//       comments: JSON.parse(localPost.comments || "[]"),
//       likes: JSON.parse(localPost.likes || "[]"),
//     };
//   }, [sqlite, postId]);

//   const loadPost = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);

//     try {
//       let localPost = await loadPostFromSQLite();
//       setPost(localPost);

//       if (forceSync && isOnline()) {
//         const apiPost = await fetchPostByIdFromAPI(postId);
//         const transformed = transformApiPostsToSQLite([apiPost])[0];
//         const existing = await sqlite.getById("posts", postId.toString());
//         if (existing) await sqlite.update("posts", postId.toString(), transformed);
//         else await sqlite.create("posts", transformed);

//         localPost = await loadPostFromSQLite();
//         setPost(localPost);
//       }
//     } catch (err) {
//       console.error("Error loading post:", err);
//       setError(err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [postId, sqlite, forceSync, loadPostFromSQLite]);

//   useEffect(() => {
//     if (sqlite.isReady) loadPost();
//   }, [sqlite.isReady, loadPost]);

//   const refresh = useCallback(() => loadPost(), [loadPost]);

//   return { post, isLoading, error, refresh };
// };

// // ===============================
// // Offline-first mutations
// // ===============================
// export const useCreatePost = () => {
//   const sqlite = useSQLite();
//   const [isCreating, setIsCreating] = useState(false);
//    const {user: authUser} = useAuth({});
//   const createNewPost = useCallback(
//     async ({ title, body }: { title: string; body: string }) => {
//       setIsCreating(true);
//       try {
//         let post: IPost;

//         if (isOnline()) {
//           const res = await createPostAPI({ title, body });
//           post = res.post;
//         } else {
//           // Offline: create local pending post
//           post = {
//             id: Date.now(),
//             user_id: authUser.id || 0,
//             title,
//             body,
//             sync_status: "pending",
//             flagged: 0,
//             created_at: new Date().toISOString(),
//             updated_at: new Date().toISOString(),
//             comments: [],
//             likes: [],
//           };
//         }

//         const transformed = transformApiPostsToSQLite([post])[0];
//         await sqlite.create("posts", transformed);

//         Toast.show({ type: "success", text1: "Post created", position: "top" });
//         return post;
//       } catch (err) {
//         console.error("Failed creating post:", err);
//         Toast.show({ type: "error", text1: "Failed to create post", position: "top" });
//         throw err;
//       } finally {
//         setIsCreating(false);
//       }
//     },
//     [sqlite]
//   );

//   return { createNewPost, isCreating };
// };
