import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Post, PostType } from '../../../types';
import { useAppStore } from '../../../store';
import { TempFacilityPostCard } from '../components/TempFacilityPostCard';
import { selectFacilityPostIndex } from '../selectors';
import { PostActions, PostComments } from '../components/PostInteractions';

const TOPICS: { id: string; label: string; type?: PostType }[] = [
  { id: 'all', label: '推荐' },
  { id: 'facility', label: '无障碍督查', type: 'facility' },
  { id: 'article', label: '无障碍科普', type: 'article' },
  { id: 'tool', label: '好用工具', type: 'tool' },
  { id: 'experience', label: '出行与生活', type: 'experience' },
];

/**
 * 首页 · 主线设施帖流（项目负责人所有）。
 * 本阶段只展示主线设施观察帖；通用帖子卡片、“全部/设施观察/科普/工具”筛选
 * 与科普/工具/经验内容由成员 A 在 src/features/feed/ 交付后接入。
 */
export function HomePage() {
  const store = useAppStore();
  const navigate = useNavigate();
  const facilityPosts = selectFacilityPostIndex(store);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const topic = TOPICS.find((item) => item.id === params.get('topic')) ?? TOPICS[0];
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [focusComments, setFocusComments] = useState(false);
  const openPost = (post: Post, comments = false) => {
    setFocusComments(comments);
    setSelectedPost(post);
  };
  const previewRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selectedPost) {
      if (!previewRef.current?.open) previewRef.current?.showModal();
      if (focusComments) previewRef.current?.querySelector<HTMLTextAreaElement>('#post-comment-input')?.focus();
    }
  }, [selectedPost, focusComments]);
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const search = query.trim().toLocaleLowerCase();
  const filteredPosts = store.posts.filter((post) => {
    // 不显示当前身份自己发布的帖子
    if (post.author.id === store.currentUser.userId) return false;
    if (topic.type && post.type !== topic.type) return false;
    const place = post.placeId ? store.getPlace(post.placeId) : undefined;
    return [post.title, post.content, post.author.name, place?.name ?? '', ...post.tags]
      .join(' ').toLocaleLowerCase().includes(search);
  });

  return (
    <section aria-labelledby="home-heading">
      <header className="journey-section-head">
        <h2 id="home-heading" className="journey-section-head__title">
          发现无碍生活
        </h2>
        <p className="journey-section-head__hint">
          看见身边的无障碍信息，分享观察，让每次出行更有依据。
        </p>
      </header>

      <div className="community-search" role="search">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
        <input type="search" aria-label="搜索社区帖子" placeholder="搜索地点、设施、工具或生活经验" value={query} onChange={(event) => updateFilter('q', event.target.value)} />
        {query && <button type="button" onClick={() => updateFilter('q', '')}>清除</button>}
      </div>
      <nav className="community-topics" aria-label="帖子主题">
        {TOPICS.map((item) => <button key={item.id} type="button" aria-pressed={topic.id === item.id} onClick={() => updateFilter('topic', item.id)}>{item.label}</button>)}
      </nav>
      <p className="community-result" role="status">{topic.label} · {filteredPosts.length} 篇{search ? ` · 搜索“${query.trim()}”` : ''}</p>

      <div className="post-list">
        {filteredPosts.map((post) => {
          const item = facilityPosts.find((entry) => entry.postId === post.id);
          if (!item) return (
            <article className="post-card" key={post.id} data-post-id={post.id}>
              <div className="post-card__media">
                <button className="post-card__cover" type="button" aria-label={`阅读${post.title}`} onClick={() => openPost(post)}>
                  {post.images[0] ? <img src={post.images[0]} alt={post.title} loading="lazy" decoding="async" /> : <span>社区分享</span>}
                </button>
                {post.images[0]?.includes('generated-') && <span className="post-card__demo-label">AI 生成 · 演示图</span>}
                <span className={`post-card__kind-badge ${post.type === 'facility' ? 'post-card__kind-badge--inspect' : 'post-card__kind-badge--share'}`}>{post.type === 'facility' ? '督查' : '分享'}</span>
              </div>
              <div className="post-card__body">
                <h3 className="post-card__title">{post.title}</h3>
                <div className="post-card__author"><span className="post-card__avatar" aria-hidden="true">{post.author.name.slice(0, 1)}</span><span>{post.author.name}</span><PostActions postId={post.id} onComments={() => openPost(post, true)} /></div>
                <button className="ghost-button" type="button" onClick={() => openPost(post)}>阅读全文</button>
              </div>
            </article>
          );
          return (
            <TempFacilityPostCard
              key={item.postId}
              post={post}
              placeName={item.placeName}
              status={item.status}
              onOpenPlaceDetail={(placeId) => navigate(`/places/${placeId}`)}
              onOpenInMap={(placeId) => navigate(`/map?placeId=${placeId}`)}
              onOpenPost={() => openPost(post)}
              onComments={() => openPost(post, true)}
            />
          );
        })}
      </div>
      {filteredPosts.length === 0 && <div className="community-empty"><h3>暂时没有找到相关帖子</h3><p>试试“坡道”“盲道”或“电梯”，也可以切换到推荐查看全部主题。</p><button className="ghost-button" type="button" onClick={() => { setParams({}); }}>清除搜索和分类</button></div>}
      <dialog className="post-preview" ref={previewRef} aria-labelledby="post-preview-title" onClose={() => setSelectedPost(null)}>
        {selectedPost && <>
          <button className="post-preview__close ghost-button" type="button" onClick={() => previewRef.current?.close()}>关闭</button>
          {selectedPost.images[0] && <img src={selectedPost.images[0]} alt={selectedPost.title} />}
          {selectedPost.images[0]?.includes('generated-') && <p className="journey-footnote">AI 生成演示图，非现场采集照片；地图界面为虚构示意，照片不用于尺寸测量或标准合规判断。</p>}
          <h2 id="post-preview-title">{selectedPost.title}</h2>
          <p className="post-card__author">{selectedPost.author.name} · <time dateTime={selectedPost.createdAt}>{new Date(selectedPost.createdAt).toLocaleDateString('zh-CN')}</time></p>
          <p className="post-preview__content">{selectedPost.content}</p>
          <p>{selectedPost.tags.join(' ')}</p>
          {selectedPost.placeId && <button className="ghost-button" type="button" onClick={() => { previewRef.current?.close(); navigate(`/places/${selectedPost.placeId}`); }}>查看地点与核验记录</button>}
          <PostActions postId={selectedPost.id} />
          <PostComments key={selectedPost.id} postId={selectedPost.id} />
        </>}
      </dialog>
    </section>
  );
}
