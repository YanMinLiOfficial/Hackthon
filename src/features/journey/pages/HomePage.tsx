import { useNavigate } from 'react-router-dom';
import { SIMULATION_LABELS } from '../../../app/config';
import { useAppStore } from '../../../store';
import { TempFacilityPostCard } from '../components/TempFacilityPostCard';
import { selectFacilityPostIndex } from '../selectors';

/**
 * 首页 · 主线设施帖流（项目负责人所有）。
 * 本阶段只展示主线设施观察帖；通用帖子卡片、“全部/设施观察/科普/工具”筛选
 * 与科普/工具/经验内容由成员 A 在 src/features/feed/ 交付后接入。
 */
export function HomePage() {
  const store = useAppStore();
  const navigate = useNavigate();
  const facilityPosts = selectFacilityPostIndex(store);

  return (
    <section aria-labelledby="home-heading">
      <header className="journey-section-head">
        <h2 id="home-heading" className="journey-section-head__title">
          设施观察
        </h2>
        <p className="journey-section-head__hint">
          主线演示：设施帖可进入对应地图与地点时间线（{SIMULATION_LABELS.aiAnalysis}）
        </p>
      </header>

      <div className="post-list">
        {facilityPosts.map((item) => {
          const post = store.posts.find((entry) => entry.id === item.postId);
          if (!post) {
            return null;
          }
          return (
            <TempFacilityPostCard
              key={item.postId}
              post={post}
              placeName={item.placeName}
              status={item.status}
              onOpenPlaceDetail={(placeId) => navigate(`/places/${placeId}`)}
              onOpenInMap={(placeId) => navigate(`/map?placeId=${placeId}`)}
            />
          );
        })}
      </div>

      <p className="journey-footnote">
        科普、工具与经验内容流及类型筛选将由成员 A 接入；当前为 M1
        主线最小实现。
      </p>
    </section>
  );
}
