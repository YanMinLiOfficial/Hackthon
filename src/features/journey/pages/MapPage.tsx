import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../../store';
import { CampusMap } from '../../map';
import { selectPlaceMarkers } from '../selectors';

/**
 * 地图频道（页面控制由项目负责人所有）。
 * 读取 ?placeId 作为选中针来源（首页“在地图上查看”跳入）；
 * 选择大头针进入地点详情。底图/标记/图例视觉组件由成员 B 在 src/features/map/ 交付。
 */
export function MapPage() {
  const store = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlaceId = searchParams.get('placeId') ?? undefined;
  const markers = selectPlaceMarkers(store, selectedPlaceId);
  const selectedPlace = selectedPlaceId ? store.getPlace(selectedPlaceId) : undefined;

  return (
    <section aria-labelledby="map-heading">
      <header className="journey-section-head">
        <h2 id="map-heading" className="journey-section-head__title">
          校园无障碍地图
        </h2>
        <p className="journey-section-head__hint">
          本地模拟地图 · 一个地点只有一个大头针，多次观察进入地点时间线
        </p>
      </header>

      <p className="map-panel__hint">
        用 Tab 键在大头针间移动，按 Enter 打开地点详情；也可直接点击或触摸。
      </p>

      <CampusMap
        markers={markers}
        onSelectPlace={(placeId) => navigate(`/places/${placeId}`)}
      />

      {selectedPlace && (
        <p className="map-panel__hint" aria-live="polite">
          已选中「{selectedPlace.name}」，
          <Link to={`/places/${selectedPlace.id}`}>进入地点详情与观察时间线</Link>
          。
        </p>
      )}
    </section>
  );
}
