import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { POST_TYPE_META } from '../../../app/config';
import type { PostType } from '../../../types';
import { useAppStore } from '../../../store';
import './my-posts.css';

export function MyPostsPage() {
  const store = useAppStore();
  const [filter, setFilter] = useState<PostType | 'all'>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const posts = store.posts.filter((post) => post.author.id === store.currentUser.userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filtered = posts.filter((post) => filter === 'all' || post.type === filter);
  const pendingPost = posts.find((post) => post.id === pendingId);
  useEffect(() => {
    if (pendingPost) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else if (dialog.current?.open) dialog.current.close();
  }, [pendingPost]);
  useEffect(() => { setPendingId(null); setMessage(''); }, [store.currentUser.userId]);

  return <section className="my-posts-page" aria-labelledby="my-posts-title">
    <Link className="ghost-button" to="/me">← 返回我的</Link>
    <header className="journey-section-head"><div><h2 id="my-posts-title">我的帖子</h2><p className="journey-footnote">{store.currentUser.name} · 共 {posts.length} 篇</p></div><Link className="primary-button" to="/publish">发布新帖子</Link></header>
    <nav className="community-topics" aria-label="我的帖子分类"><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>全部</button>{(Object.keys(POST_TYPE_META) as PostType[]).map((type) => <button key={type} type="button" aria-pressed={filter === type} onClick={() => setFilter(type)}>{POST_TYPE_META[type].label}</button>)}</nav>
    <p className="my-posts-message" role="status">{message}</p>
    <div className="my-posts-list">{filtered.map((post) => <article className="my-post" key={post.id}>
      {post.images[0] && <img className="my-post__image" src={post.images[0]} alt={post.title} loading="lazy" />}
      <div className="my-post__body"><span className="tag-chip">{POST_TYPE_META[post.type].label}</span><h3>{post.title}</h3><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString('zh-CN')}</time><details><summary>查看正文</summary><p>{post.content}</p><p>{post.tags.join(' ')}</p></details><div className="my-post__actions">{post.placeId && <Link className="ghost-button" to={`/places/${post.placeId}`}>查看地点记录</Link>}<button className="my-post__delete" type="button" aria-label={`删除帖子：${post.title}`} onClick={() => setPendingId(post.id)}>删除帖子</button></div></div>
    </article>)}</div>
    {filtered.length === 0 && <div className="community-empty"><h3>{posts.length ? '这个分类还没有帖子' : '你还没有发布帖子'}</h3><p>发布的内容会出现在这里，也能在这里管理。</p></div>}
    <dialog className="my-posts-dialog" ref={dialog} aria-labelledby="delete-post-title" aria-describedby="delete-post-description" onClose={() => setPendingId(null)}>
      {pendingPost && <><h2 id="delete-post-title">删除这篇帖子？</h2><p>《{pendingPost.title}》</p><p id="delete-post-description">{pendingPost.type === 'facility' ? '将移除帖子及关联观察、复核、整改记录，并撤销关联贡献积分。地点档案和其他观察保留；已兑换记录保留。' : '将移除帖子及其点赞、评论。'}删除后无法恢复。</p><div className="my-post__actions"><button autoFocus type="button" className="ghost-button" onClick={() => dialog.current?.close()}>取消</button><button type="button" className="my-post__delete" onClick={() => {
        const title = pendingPost.title;
        const ok = store.deletePost(pendingPost.id);
        dialog.current?.close();
        setMessage(ok ? `已删除《${title}》。` : '删除失败，只能删除当前身份自己的帖子。');
      }}>确认删除</button></div></>}
    </dialog>
  </section>;
}
