import type { FacilityPostCardProps } from '../contracts';
import { formatDateTime } from '../format';
import { StatusBadge } from './StatusBadge';
import { PostActions } from './PostInteractions';

/**
 * 【临时适配器】首页主线设施帖卡片。
 * 成员 A 在 src/features/feed/ 的通用帖子卡片合入后，本文件删除，
 * 其组件只需满足 FacilityPostCardProps（见 ../contracts.ts）即可无缝替换。
 */
export function TempFacilityPostCard({
  post,
  placeName,
  status,
  onOpenPlaceDetail,
  onOpenInMap,
  onOpenPost,
  onComments,
}: FacilityPostCardProps & { onOpenPost?: () => void; onComments?: () => void }) {
  return (
    <article className="post-card" data-post-id={post.id}>
      <div className="post-card__media">
        {post.images[0] ? (
          <button className="post-card__cover" type="button" onClick={() => onOpenPost ? onOpenPost() : onOpenPlaceDetail(post.placeId as string)} aria-label={`阅读${post.title}`}>
            <img src={post.images[0]} alt={post.title} loading="lazy" decoding="async" />
          </button>
        ) : (
          <div className="post-card__no-image" aria-hidden="true">
            无照片
          </div>
        )}
        <StatusBadge status={status} />
        <span className="post-card__kind-badge post-card__kind-badge--inspect">督查</span>
        {post.images[0]?.includes('generated-') && <span className="post-card__demo-label">AI 生成 · 演示图</span>}
      </div>
      <div className="post-card__body">
        <h3 className="post-card__title">{post.title}</h3>
        <div className="post-card__author">
          <span className="post-card__avatar" aria-hidden="true">{post.author.name.slice(0, 1)}</span>
          <span>{post.author.name}</span>
          <PostActions postId={post.id} onComments={onComments ?? onOpenPost} />
        </div>
        <p className="post-card__meta">
          <span>{placeName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
        </p>
        <p className="post-card__excerpt">{post.content}</p>
        <div className="post-card__tags" aria-label="标准标签">
          {post.tags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="post-card__actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => onOpenPlaceDetail(post.placeId as string)}
          >
            查看地点详情
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => onOpenInMap(post.placeId as string)}
          >
            在地图上查看
          </button>
        </div>
      </div>
    </article>
  );
}
