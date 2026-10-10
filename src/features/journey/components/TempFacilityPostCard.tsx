import type { FacilityPostCardProps } from '../contracts';
import { formatDateTime } from '../format';
import { StatusBadge } from './StatusBadge';

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
}: FacilityPostCardProps) {
  return (
    <article className="post-card">
      <div className="post-card__media">
        {post.images[0] ? (
          <img src={post.images[0]} alt={post.title} />
        ) : (
          <div className="post-card__no-image" aria-hidden="true">
            无照片
          </div>
        )}
        <StatusBadge status={status} />
      </div>
      <div className="post-card__body">
        <h3 className="post-card__title">{post.title}</h3>
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
