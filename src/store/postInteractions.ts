import type { AppData, PostComment } from '../types';

export const COMMENT_MAX_LENGTH = 500;

export function togglePostLike(data: AppData, postId: string, userId: string): AppData {
  if (!data.posts.some((post) => post.id === postId)) return data;
  return { ...data, posts: data.posts.map((post) => {
    if (post.id !== postId) return post;
    const likes = Array.from(new Set(post.likedBy ?? []));
    return { ...post, likedBy: likes.includes(userId)
      ? likes.filter((id) => id !== userId) : [...likes, userId] };
  }) };
}

export function appendPostComment(data: AppData, postId: string, comment: PostComment): AppData {
  const content = comment.content.trim();
  if (!content || content.length > COMMENT_MAX_LENGTH || !data.posts.some((post) => post.id === postId)) return data;
  return { ...data, posts: data.posts.map((post) => post.id === postId
    ? { ...post, comments: [...(post.comments ?? []), { ...comment, content }] } : post) };
}
