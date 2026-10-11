import { useState } from 'react';
import { useAppStore } from '../../../store';
import { COMMENT_MAX_LENGTH } from '../../../store/postInteractions';

export function PostActions({ postId, onComments }: { postId: string; onComments?: () => void }) {
  const store = useAppStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return null;
  const liked = post.likedBy?.includes(store.currentUser.userId) ?? false;
  return <div className="post-social-actions">
    <button type="button" className="post-like" aria-pressed={liked}
      aria-label={`${liked ? '取消点赞' : '点赞'}：${post.title}`} onClick={() => store.togglePostLike(postId)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>
      <span>{post.likedBy?.length ?? 0}</span>
    </button>
    {onComments && <button type="button" aria-label={`查看评论：${post.title}`} onClick={onComments}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-9 9H3l1.8-4.2A9 9 0 1 1 21 11.5Z"/></svg>
      <span>{post.comments?.length ?? 0}</span>
    </button>}
  </div>;
}

export function PostComments({ postId }: { postId: string }) {
  const store = useAppStore();
  const post = store.posts.find((item) => item.id === postId);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  if (!post) return null;
  const comments = post.comments ?? [];
  return <section className="post-comments" aria-labelledby="post-comments-heading">
    <h3 id="post-comments-heading">评论 · {comments.length}</h3>
    <p className="journey-footnote">本机模拟互动 · 当前身份：{store.currentUser.name}。点赞和评论不代表设施已核验。</p>
    {comments.length ? <ul className="post-comments__list">{comments.map((comment) => <li key={comment.id}>
      <span className="post-card__avatar" aria-hidden="true">{comment.author.name.slice(0, 1)}</span>
      <div><div className="post-comments__author">{comment.author.name}<time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString('zh-CN')}</time></div>
      <p>{comment.content}</p></div>
    </li>)}</ul> : <p className="post-comments__empty">还没有评论，分享你的观察或出行经验吧。</p>}
    <form className="post-comment-form" onSubmit={(event) => {
      event.preventDefault();
      if (!store.addPostComment(postId, draft)) { setMessage('请输入 1–500 字的评论'); return; }
      setDraft(''); setMessage('评论已发布并保存在本机');
    }}>
      <label htmlFor="post-comment-input">写评论</label>
      <textarea id="post-comment-input" value={draft} maxLength={COMMENT_MAX_LENGTH} rows={3}
        placeholder="友善交流，让出行信息更有帮助" onChange={(event) => { setDraft(event.target.value); setMessage(''); }} />
      <div className="post-comment-form__footer"><span>{draft.length}/{COMMENT_MAX_LENGTH}</span>
      <button type="submit" className="primary-button" disabled={!draft.trim()}>发布评论</button></div>
      <p role="status" className="post-comment-form__message">{message}</p>
    </form>
  </section>;
}
