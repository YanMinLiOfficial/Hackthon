import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AMAP_API_KEY,
  AMAP_PLACE_QUERIES,
  AMAP_POI_CACHE_KEY,
  AMAP_SECURITY_CODE,
  MAP_LEGEND_STATUSES,
  STATUS_META,
} from '../../../app/config';
import { matchesCampusPoi } from '../../../app/config/map';
import { facilityGlyphSvg, mapLayerLabel } from '../mapLayers';
import type { CampusMapProps, PlaceMarkerVm } from '../contracts';
import { TempCampusMap } from './TempCampusMap';
import { WalkingRouteOverlay } from './WalkingRouteOverlay';

/**
 * 高德真实地图画布（南科大校园），实现 CampusMapProps 契约。
 * 配置了 VITE_AMAP_API_KEY 时启用；加载失败 / 无 Key / 无网络时回退本地 SVG。
 *
 * 标记为实心圆徽章（DOM content）：状态色底 + 白色状态图形 + 名称标签，
 * 保持颜色/图形/文字三重编码与键盘可达（button），与本地 SVG 视觉一致。
 */

declare global {
  interface Window {
    AMap?: any;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

/** 南科大校园中心（GCJ-02，近似），作为初始视野 */
const CAMPUS_CENTER: [number, number] = [113.99685, 22.6036];
const CAMPUS_ZOOM = 16;
const MAX_POI_DISTANCE_METERS = 3500;

interface PoiPosition {
  lat: number;
  lng: number;
  poiId?: string;
  poiName: string;
}

type PoiPositions = Record<string, PoiPosition>;

function readPoiCache(): PoiPositions {
  try {
    const raw = window.localStorage.getItem(AMAP_POI_CACHE_KEY);
    if (!raw) return {};
    const value = JSON.parse(raw) as PoiPositions;
    return Object.fromEntries(
      Object.entries(value).filter(([id, position]) =>
        Number.isFinite(position?.lat) && Number.isFinite(position?.lng) &&
        (AMAP_PLACE_QUERIES[id] ?? []).some((query) => matchesCampusPoi(position.poiName ?? '', query))),
    );
  } catch {
    return {};
  }
}

function writePoiCache(positions: PoiPositions): void {
  try {
    window.localStorage.setItem(AMAP_POI_CACHE_KEY, JSON.stringify(positions));
  } catch {
    // 隐私模式或配额不足时仅使用当前会话结果。
  }
}

function getLngLat(location: any): { lng: number; lat: number } | null {
  const lng = Number(location?.getLng?.() ?? location?.lng);
  const lat = Number(location?.getLat?.() ?? location?.lat);
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
}

function distanceFromCampus(position: { lng: number; lat: number }): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadius = 6371000;
  const lat1 = radians(CAMPUS_CENTER[1]);
  const lat2 = radians(position.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = radians(position.lng - CAMPUS_CENTER[0]);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

function loadPlaceSearch(AMap: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof AMap.plugin !== 'function') {
      reject(new Error('PlaceSearch 插件不可用'));
      return;
    }
    AMap.plugin('AMap.PlaceSearch', () => {
      if (AMap.PlaceSearch) resolve(AMap.PlaceSearch);
      else reject(new Error('PlaceSearch 插件加载失败'));
    });
  });
}

function searchPoi(search: any, query: string): Promise<PoiPosition | null> {
  return new Promise((resolve) => {
    search.search(query, (status: string, result: any) => {
      if (status !== 'complete' || result?.info !== 'OK') {
        resolve(null);
        return;
      }
      const pois: any[] = result?.poiList?.pois ?? [];
      const candidates = pois
        .map((poi) => ({ poi, position: getLngLat(poi.location) }))
        .filter((entry): entry is { poi: any; position: { lng: number; lat: number } } =>
          entry.position !== null && matchesCampusPoi(entry.poi.name ?? '', query) &&
          distanceFromCampus(entry.position) <= MAX_POI_DISTANCE_METERS)
        .sort((a, b) => distanceFromCampus(a.position) - distanceFromCampus(b.position));
      const best = candidates[0];
      resolve(best ? {
        ...best.position,
        poiId: best.poi.id,
        poiName: best.poi.name ?? query,
      } : null);
    });
  });
}

async function resolveCampusPois(AMap: any, markers: PlaceMarkerVm[]): Promise<PoiPositions> {
  const PlaceSearch = await loadPlaceSearch(AMap);
  const search = new PlaceSearch({ city: '深圳市', citylimit: true, pageSize: 10, extensions: 'base' });
  const resolved: PoiPositions = {};
  for (const marker of markers) {
    const queries = AMAP_PLACE_QUERIES[marker.placeId] ?? [];
    for (const query of queries) {
      const position = await searchPoi(search, query);
      if (position) {
        resolved[marker.placeId] = position;
        break;
      }
    }
  }
  return resolved;
}

/** 状态图形 → 内嵌 SVG 字符串（高德 Marker content 为 HTML 字符串） */
function glyphSvg(shape: string, size: number): string {
  const s = `width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" style="display:block"`;
  switch (shape) {
    case 'pin-ring':
      return `<svg ${s}><circle cx="8" cy="8" r="5.5" stroke="#fff" stroke-width="2"/></svg>`;
    case 'pin-dot':
      return `<svg ${s}><circle cx="8" cy="8" r="5" fill="#fff"/></svg>`;
    case 'pin-square':
      return `<svg ${s}><rect x="3" y="3" width="10" height="10" rx="1.5" fill="#fff"/></svg>`;
    case 'pin-triangle':
      return `<svg ${s}><path d="M8 2.5 14.5 13.5h-13L8 2.5Z" fill="#fff"/></svg>`;
    case 'pin-clock':
      return `<svg ${s} stroke="#fff" stroke-width="1.6"><circle cx="8" cy="8.5" r="5.5" fill="none"/><path d="M8 5.5v3l2.2 1.4" stroke-linecap="round" fill="none"/></svg>`;
    case 'pin-check':
      return `<svg ${s} stroke="#fff" stroke-width="1.8"><circle cx="8" cy="8" r="5.5" fill="none"/><path d="m5.2 8.2 2 2 3.6-4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
    default:
      return `<svg ${s}><circle cx="8" cy="8" r="5" fill="#fff"/></svg>`;
  }
}

/** 生成徽章 HTML：圆徽章 + 名称标签，包一层 button 保证键盘可达 */
function markerHtml(marker: PlaceMarkerVm): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  const name = escape(marker.name);
  const meta = STATUS_META[marker.status];
  const facilities = marker.visibleFacilities ?? [];
  const inspection = marker.showInspection !== false;
  const color = inspection ? `var(--tone-${meta.tone})` : 'var(--tone-info)';
  const facilityLabel = facilities.map(mapLayerLabel).join('、');
  const extraFacilities = inspection ? facilities : facilities.slice(1);
  const ring = marker.selected
    ? `<span class="amap-marker__ring" aria-hidden="true"></span>`
    : '';
  return (
    `<button type="button" class="amap-marker${marker.selected ? ' is-selected' : ''}" ` +
    `data-place-id="${escape(marker.placeId)}" ` +
    `data-lng="${marker.lng}" data-lat="${marker.lat}" ` +
    `aria-label="${name}，${meta.label}${facilityLabel ? `，包含${facilityLabel}` : ''}，按 Enter 查看地点详情" ` +
    `${marker.selected ? 'aria-current="true"' : ''}>` +
    ring +
    `<span class="amap-marker__badge" style="background:${color};color:#fff">` +
    (inspection || !facilities.length ? glyphSvg(meta.shape, 14) : facilityGlyphSvg(facilities[0])) +
    `</span>` +
    (extraFacilities.length ? `<span class="amap-marker__facilities">${extraFacilities.map((type) => `<span title="${mapLayerLabel(type)}">${facilityGlyphSvg(type)}${mapLayerLabel(type)}</span>`).join('')}</span>` : '') +
    `<span class="amap-marker__label">${name}</span>` +
    (!inspection && facilities.length ? `<span class="amap-marker__facility-note">${facilityLabel} · ${meta.label}</span>` : '') +
    `</button>`
  );
}

let amapLoaderPromise: Promise<any> | null = null;

/** 动态加载高德 JS API（仅加载一次） */
export function loadAmap(): Promise<any> {
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }
  if (amapLoaderPromise) {
    return amapLoaderPromise;
  }
  if (AMAP_SECURITY_CODE) {
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
  }
  amapLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_API_KEY}`;
    script.async = true;
    script.onload = () => (window.AMap ? resolve(window.AMap) : reject(new Error('AMap 未挂载')));
    script.onerror = () => reject(new Error('高德脚本加载失败'));
    document.head.appendChild(script);
  });
  return amapLoaderPromise;
}

export function AmapCampusMap(props: CampusMapProps) {
  const { markers, onSelectPlace, routePlaceIds = [] } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [failed, setFailed] = useState(false);
  const [readyMap, setReadyMap] = useState<any>(null);
  const [poiPositions, setPoiPositions] = useState<PoiPositions>(readPoiCache);
  const [poiStatus, setPoiStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const viewportRef = useRef('');
  const poiRequestedRef = useRef(false);
  const initialMarkersRef = useRef(markers);
  const resolvedMarkers = useMemo(() => markers.map((marker) => {
    const position = poiPositions[marker.placeId];
    return position ? { ...marker, lat: position.lat, lng: position.lng } :
      AMAP_PLACE_QUERIES[marker.placeId] ? { ...marker, lat: undefined, lng: undefined } : marker;
  }), [markers, poiPositions]);

  // 初始化地图（仅一次）。鉴权失败 / 无网络时地图容器不会有瓦片渲染，
  // 监听瓦片 'complete' 事件；超时未完成则判定失败并回退本地 SVG。
  useEffect(() => {
    let cancelled = false;
    let tilesDone = false;
    let instance: any = null;
    const dispose = () => {
      if (instance) {
        if (mapRef.current === instance) mapRef.current = null;
        instance.destroy();
        instance = null;
        markersRef.current = [];
        viewportRef.current = '';
      }
    };
    const fail = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(watchdog);
      setReadyMap(null);
      setFailed(true);
      dispose();
    };
    const watchdog = window.setTimeout(() => {
      if (!cancelled && !tilesDone) {
        fail();
      }
    }, 8000);

    loadAmap()
      .then((AMap) => {
        if (cancelled || !containerRef.current || mapRef.current) {
          return;
        }
        const map = new AMap.Map(containerRef.current, {
          center: CAMPUS_CENTER,
          zoom: CAMPUS_ZOOM,
          viewMode: '2D',
        });
        instance = map;
        mapRef.current = map;
        map.on('complete', () => {
          if (cancelled || mapRef.current !== map) return;
          tilesDone = true;
          window.clearTimeout(watchdog);
          setReadyMap(map);
        });
        map.on('error', fail);
      })
      .catch(fail);
    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      dispose();
    };
  }, []);

  // 只在真实底图绘制已匹配的 POI，不把旧演示坐标当作真实建筑位置。
  useEffect(() => {
    if (!readyMap || poiRequestedRef.current || !window.AMap) return;
    poiRequestedRef.current = true;
    setPoiStatus('loading');
    let cancelled = false;
    resolveCampusPois(window.AMap, initialMarkersRef.current)
      .then((positions) => {
        if (cancelled) return;
        if (Object.keys(positions).length > 0) {
          setPoiPositions((cached) => {
            const merged = { ...cached, ...positions };
            writePoiCache(merged);
            return merged;
          });
          setPoiStatus('ready');
        } else {
          setPoiStatus('failed');
        }
      })
      .catch(() => {
        if (!cancelled) setPoiStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [readyMap]);

  // 渲染 / 更新标记（事件委托只绑定一次，见下方独立 effect）
  useEffect(() => {
    const map = readyMap;
    const AMap = window.AMap;
    if (!map || mapRef.current !== map || failed || !AMap) {
      return;
    }
    markersRef.current.forEach((m) => map.remove(m));
    markersRef.current = [];

    const created: any[] = [];
    resolvedMarkers.forEach((marker) => {
      if (marker.hidden) return;
      if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) {
        return;
      }
      const m = new AMap.Marker({
        position: [marker.lng, marker.lat],
        content: markerHtml(marker),
        anchor: 'top-center',
        offset: new AMap.Pixel(0, -15),
        extData: marker.placeId,
        zIndex: marker.selected ? 120 : 100,
      });
      created.push(m);
      map.add(m);
    });
    markersRef.current = created;

    // 视野：有选中则聚焦，否则适配全部
    const valid = resolvedMarkers.filter((m) => !m.hidden && Number.isFinite(m.lat) && Number.isFinite(m.lng));
    const viewport = valid.map((m) => `${m.placeId}:${m.lng}:${m.lat}:${m.selected}`).join('|') + `|route:${routePlaceIds.length > 0}`;
    if (viewportRef.current === viewport) return;
    viewportRef.current = viewport;
    // 有路线时由路线图层适配视野，避免 POI 异步更新把路线缩放覆盖。
    if (routePlaceIds.length > 0) return;
    const selected = valid.find((m) => m.selected);
    if (selected) {
      map.setZoomAndCenter(17, [selected.lng as number, selected.lat as number]);
    } else if (created.length > 0) {
      map.setFitView(created, false, [150, 90, 150, 70]);
    }
  }, [resolvedMarkers, readyMap, failed, routePlaceIds.length]);

  // 事件委托：点击与键盘激活（绑定一次，读最新 onSelectPlace）
  const onSelectRef = useRef(onSelectPlace);
  onSelectRef.current = onSelectPlace;
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const activate = (event: Event) => {
      const target = (event.target as HTMLElement).closest?.('[data-place-id]');
      const placeId = target?.getAttribute('data-place-id');
      if (placeId) {
        onSelectRef.current(placeId);
      }
    };
    const onKey = (event: Event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        activate(event);
      }
    };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('click', activate);
      el.removeEventListener('keydown', onKey);
    };
  }, []);

  if (failed) {
    return (
      <div>
        <p className="map-fallback-note" role="status">
          真实地图加载失败（无网络或 Key 未配置），已切换到本地模拟校园地图。
        </p>
        <TempCampusMap {...props} />
      </div>
    );
  }

  return (
    <div className="map-canvas">
      <WalkingRouteOverlay map={readyMap} markers={resolvedMarkers} routeIds={routePlaceIds} onResult={props.onWalkingResult} />
      <p className="map-poi-status" role="status">
        {poiStatus === 'loading' && '正在使用高德 POI 校准校园建筑位置…'}
        {poiStatus === 'ready' &&
          `已显示 ${resolvedMarkers.filter((m) => !m.hidden && Number.isFinite(m.lat) && Number.isFinite(m.lng)).length}/${markers.length} 个地点（高德地标或用户选点）；设施状态为模拟数据。`}
        {poiStatus === 'failed' && '未查到指定校园地标，不绘制未经核验的坐标；已有地点记录仍保留。'}
        {poiStatus === 'idle' && Object.keys(poiPositions).length > 0 &&
          `已读取 ${Object.keys(poiPositions).length} 个高德 POI 缓存位置。`}
      </p>
      <div
        ref={containerRef}
        className="amap-canvas"
        role="application"
        aria-label="南科大校园真实地图，大头针可用 Tab 聚焦、Enter 查看详情"
      />
      <details className="map-legend-panel" open>
        <summary>图例</summary>
        <ul>
          {MAP_LEGEND_STATUSES.map((status) => {
            const meta = STATUS_META[status];
            return (
              <li key={status}>
                <span
                  className="amap-legend-badge"
                  style={{ background: `var(--tone-${meta.tone})` }}
                  dangerouslySetInnerHTML={{ __html: glyphSvg(meta.shape, 9) }}
                />
                {meta.label}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
