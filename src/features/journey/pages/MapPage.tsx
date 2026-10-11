import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { MAP_PROVIDER } from '../../../app/config';
import { useAppStore } from '../../../store';
import { AmapCampusMap } from '../components/AmapCampusMap';
import { TempCampusMap } from '../components/TempCampusMap';
import { selectPlaceMarkers } from '../selectors';
import { TravelPlanner } from '../components/TravelPlanner';
import type { WalkingState } from '../walking';
import { applyMapLayers, FACILITY_LAYERS, mapLayerLabel, type MapLayer } from '../mapLayers';

/**
 * 地图频道（页面控制由项目负责人所有）。
 * 读取 ?placeId 作为选中针来源（首页“在地图上查看”跳入）；
 * 选择大头针进入地点详情。底图/标记/图例视觉组件最终由成员 B 交付。
 * 配置了高德 Key 时用南科大真实地图，否则本地模拟 SVG（断网兜底）。
 */
export function MapPage() {
  const store = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlaceId = searchParams.get('placeId') ?? undefined;
  const [layers, setLayers] = useState<MapLayer[]>(['inspection']);
  const allMarkers = selectPlaceMarkers(store, selectedPlaceId);
  const markers = applyMapLayers(allMarkers, layers);
  const selectedPlace = selectedPlaceId ? store.getPlace(selectedPlaceId) : undefined;
  const isRealMap = MAP_PROVIDER === 'amap';
  const [routePlaceIds, setRoutePlaceIds] = useState<string[]>([]);
  const [walkingState, setWalkingState] = useState<WalkingState>({ status: 'idle' });

  return (
    <section className="map-workspace" aria-labelledby="map-heading">
      <header className="journey-section-head">
        <h2 id="map-heading" className="journey-section-head__title">
          校园无障碍地图
        </h2>
        <p className="journey-section-head__hint">
          {isRealMap ? '南方科技大学 · 高德真实地图' : '本地模拟地图'} ·
          一个地点只有一个大头针，多次观察进入地点时间线
        </p>
      </header>

      <p className="map-panel__hint map-workspace__help">
        用 Tab 键在大头针间移动，按 Enter 打开地点详情；也可直接点击或触摸。
      </p>
      {isRealMap && (
        <p className="map-panel__hint map-workspace__notice">
          建筑位置优先使用高德 POI；入口、侧门和坡道仍为演示设施点，尚未现场核验。
        </p>
      )}

      <TravelPlanner destinationId={selectedPlaceId} onRouteChange={setRoutePlaceIds} walkingState={walkingState} />
      <details className="map-layers-panel" open>
        <summary>显示图层 · 多选</summary>
        <fieldset><legend className="visually-hidden">选择要显示的地点图标</legend>
          {(['inspection', ...FACILITY_LAYERS] as MapLayer[]).map((layer) => <label key={layer}>
            <input type="checkbox" checked={layers.includes(layer)} onChange={(event) => { const checked = event.currentTarget.checked; setLayers((current) => checked ? Array.from(new Set([...current, layer])) : current.filter((item) => item !== layer)); }} />
            {mapLayerLabel(layer)}<small>{allMarkers.filter((marker) => layer === 'inspection' || marker.facilityTypes?.includes(layer)).length}</small>
          </label>)}
        </fieldset>
        <p role="status">显示 {markers.filter((marker) => !marker.hidden).length} 个地点{layers.length === 0 ? '；请勾选图层。' : '；同一地点组合图标。'}</p>
        <p>设施图标表示有相关记录，不保证当前可用；演示数据未经现场核验。</p>
      </details>
      {isRealMap ? (
        <AmapCampusMap
          markers={markers}
          routePlaceIds={routePlaceIds}
          onWalkingResult={setWalkingState}
          onSelectPlace={(placeId) => navigate(`/places/${placeId}`)}
        />
      ) : (
        <TempCampusMap
          markers={markers}
          routePlaceIds={routePlaceIds}
          onWalkingResult={setWalkingState}
          onSelectPlace={(placeId) => navigate(`/places/${placeId}`)}
        />
      )}

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
