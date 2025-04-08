import { useEffect, useState, useCallback } from "react";

import { IComment, ILikes, IPost, IResponse } from "~/types";
import { Post } from "~/models/posts/post";
import { RealmContext } from "~/providers/RealContextProvider";
import { baseInstance } from "~/utils/axios";

import { useNetworkStatus } from "./network";

const { useRealm, useQuery } = RealmContext;

// Remote data fetching functions
export async function fetchPostsFromRemote() {
    const res = await baseInstance.get<IResponse<IPost[]>>(`/posts`);
    return res.data;
}

export async function fetchPostByIdFromRemote(id: string) {
    const res = await baseInstance.get<IPost>(`/posts/${id}`);
    return res.data;
}

// Hook for getting all posts with offline support
export function useGetPosts() {
    const realm = useRealm();
    const storedPosts = useQuery(Post);
    const { isConnected } = useNetworkStatus();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const syncPosts = useCallback(async () => {
        if (!isConnected) {
            console.log("Offline mode: Using local posts data");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log("Fetching posts from remote");
            const apiPosts = await fetchPostsFromRemote();

            if (!realm || realm.isClosed) {
                console.warn("Skipping Realm write: Realm is closed");
                setError(new Error("Realm is closed"));
                return;
            }

            realm.write(() => {
                apiPosts.data.forEach((post) => {
                    try {
                        realm.create("Post", {
                            id: post.id,
                            user_id: post.user_id,
                            status: post.status,
                            title: post.title,
                            body: post.body,
                            flagged: post.flagged,
                            created_at: post.created_at,
                            updated_at: post.updated_at,
                            user: JSON.stringify(post.user),
                            comments: JSON.stringify(post.comments),
                            likes: JSON.stringify(post.likes),
                        }, Realm.UpdateMode.Modified);
                    } catch (error) {
                        console.error("Error creating/updating post:", error);
                    }
                });
            });

            setLastSyncTime(new Date());
        } catch (error) {
            console.error("Error fetching posts:", error);
            setError(error instanceof Error ? error : new Error(String(error)));
        } finally {
            setIsLoading(false);
        }
    }, [isConnected, realm]);

    // Initial load and when network state changes
    useEffect(() => {
        if (isConnected) {
            syncPosts();
        }
    }, [isConnected, syncPosts]);

    return {
        posts: storedPosts,
        isLoading,
        error,
        lastSyncTime,
        refresh: syncPosts
    };
}

// Hook for getting post by ID with offline support
export function useGetPost(id: string) {
    const realm = useRealm();
    const { isConnected } = useNetworkStatus();
    const [post, setPost] = useState<IPost | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchPost() {
            setIsLoading(true);
            setError(null);

            try {
                // First check if we have the post in Realm
                const localPost = realm.objectForPrimaryKey<Post>("Post", id);

                if (localPost) {
                    const parsedPost = {
                        id: localPost.id,
                        user_id: localPost.user_id,
                        status: localPost.status,
                        title: localPost.title,
                        body: localPost.body,
                        flagged: localPost.flagged,
                        created_at: localPost.created_at,
                        updated_at: localPost.updated_at,
                        user: JSON.parse(localPost.user),
                        comments: JSON.parse(localPost.comments),
                        likes: JSON.parse(localPost.likes),
                    }
                    setPost(parsedPost);
                    
                    // If we're online, still fetch fresh data in the background
                    if (isConnected) {
                        try {
                            const remotePost = await fetchPostByIdFromRemote(id);
                            
                            if (!realm || realm.isClosed) {
                                console.warn("Skipping Realm write: Realm is closed");
                            } else {
                                realm.write(() => {
                                    try {
                                        realm.create("Post", {
                                            id: remotePost.id,
                                            user_id: remotePost.user_id,
                                            status: remotePost.status,
                                            title: remotePost.title,
                                            body: remotePost.body,
                                            flagged: remotePost.flagged,
                                            created_at: remotePost.created_at,
                                            updated_at: remotePost.updated_at,
                                            user: JSON.stringify(remotePost.user),
                                            comments: JSON.stringify(remotePost.comments),
                                            likes: JSON.stringify(remotePost.likes),
                                        }, Realm.UpdateMode.Modified);
                                        setPost(remotePost);
                                    } catch (error) {
                                        console.error("Error updating post:", error);
                                    }
                                });
                            }
                        } catch (remoteError) {
                            console.error("Error fetching remote post:", remoteError);
                        }
                    }
                } else if (isConnected) {
                    // No local data and we're online, so fetch from remote
                    const remotePost = await fetchPostByIdFromRemote(id);
                    
                    if (!realm || realm.isClosed) {
                        console.warn("Skipping Realm write: Realm is closed");
                        setPost(remotePost);
                    } else {
                        realm.write(() => {
                            try {
                                realm.create("Post", {
                                    id: remotePost.id,
                                    user_id: remotePost.user_id,
                                    status: remotePost.status,
                                    title: remotePost.title,
                                    body: remotePost.body,
                                    flagged: remotePost.flagged,
                                    created_at: remotePost.created_at,
                                    updated_at: remotePost.updated_at,
                                    user: JSON.stringify(remotePost.user),
                                    comments: JSON.stringify(remotePost.comments),
                                    likes: JSON.stringify(remotePost.likes),
                                }, Realm.UpdateMode.Modified);
                                setPost(remotePost);
                            } catch (error) {
                                console.error("Error creating post:", error);
                                setPost(remotePost);
                            }
                        });
                    }
                } else {
                    // No local data and offline
                    setError(new Error("Post not found locally and device is offline"));
                }
            } catch (error) {
                console.error("Error in useGetPost:", error);
                setError(error instanceof Error ? error : new Error(String(error)));
            } finally {
                setIsLoading(false);
            }
        }

        fetchPost();
    }, [id, isConnected, realm]);

    const refresh = useCallback(async () => {
        if (!isConnected) {
            return;
        }
        
        setIsLoading(true);
        try {
            const remotePost = await fetchPostByIdFromRemote(id);
            
            if (!realm || realm.isClosed) {
                setPost(remotePost);
                return;
            }
            
            realm.write(() => {
                try {
                    realm.create("Post", {
                        id: remotePost.id,
                        user_id: remotePost.user_id,
                        status: remotePost.status,
                        title: remotePost.title,
                        body: remotePost.body,
                        flagged: remotePost.flagged,
                        created_at: remotePost.created_at,
                        updated_at: remotePost.updated_at,
                        user: JSON.stringify(remotePost.user),
                        comments: JSON.stringify(remotePost.comments),
                        likes: JSON.stringify(remotePost.likes),
                    }, Realm.UpdateMode.Modified);
                    setPost(remotePost);
                } catch (error) {
                    console.error("Error refreshing post:", error);
                }
            });
        } catch (error) {
            console.error("Error refreshing post:", error);
            setError(error instanceof Error ? error : new Error(String(error)));
        } finally {
            setIsLoading(false);
        }
    }, [id, isConnected, realm]);

    return { post, isLoading, error, refresh };
}

export async function createPost(values: { title: string, body: string }) {
    const res = await baseInstance
        .post<IResponse<IPost>>(
            '/posts',
            { title: values.title, body: values.body });
    return res.data;
}

export async function updatePost(values: { title: string, body: string, id: number }) {
    const res = await baseInstance
        .put<IResponse<IPost>>(
            `/posts/${values.id}`,
            { title: values.title, body: values.body });
    return res.data;
}

export async function deletePost({ id }: { id: number }) {
    const res = await baseInstance.delete<IResponse<{ message: string }>>(`/posts/${id}`);
    return res.data;
}

export async function likePost({ id }: { id: number }) {
    const res = await baseInstance.post<IResponse<ILikes>>(`/posts/${id}/like`);
    return res.data;
}

export async function unlikePost({ id }: { id: number }) {
    const res = await baseInstance.delete<IResponse<{ message: string }>>(`/posts/${id}/like`);
    return res.data;
}

export async function postComment({ id, comment }: { id: number, comment: string }) {
    const res = await baseInstance.post<IResponse<IComment>>(`/posts/${id}/comments`, { comment });
    return res.data;
}

export async function deleteComment({ commentId }: { commentId: number }) {
    const res = await baseInstance.delete<IResponse<{ message: string }>>(`/comments/${commentId}`);
    return res.data;
}

export async function updateComment({ commentId, comment }: { commentId: number, comment: string }) {
    const res = await baseInstance.put<IResponse<IComment>>(`/comments/${commentId}`, { comment });
    return res.data;
}

export async function reportPost({ id, report }: { id: number, report: string }) {
    const res = await baseInstance.post<IResponse<{ message: string }>>(`/posts/${id}/report`, { report });
    return res.data;
}