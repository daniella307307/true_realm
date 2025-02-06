import { IComment, ILikes, IPost, IResponse } from "~/types";
import { baseInstance } from "~/utils/axios";

export async function useGetPosts() {
    const res = await baseInstance.get<IResponse<IPost[]>>(`/posts`);
    return res.data;
}

export async function useGetPost({ id }: { id: number }) {
    const res = await baseInstance.get<IPost>(`/posts/${id}`);
    return res.data;
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