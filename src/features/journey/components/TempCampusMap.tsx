import { useEffect, useState } from 'react';
import { MAP_LEGEND_STATUSES, STATUS_META } from '../../../app/config';
import type { CampusMapProps, PlaceMarkerVm } from '../contracts';
import { CampusBasemap } from './CampusBasemap';
import { StatusGlyph } from './StatusGlyph';

/**
 * 【临时适配器】本地模拟校园地图画布。
 * 成员 B 在 src/features/map/ 的可复用地图组件合入后，本文件删除，
 * 其组件只需满足 CampusMapProps（见 ../contracts.ts）：数据与回调全部来自 props，
 * 不读 store、不维护第二套地点状态。
 *
 * 视觉借鉴真实电子地图：平面底图 + 实心圆徽章标记 + 悬浮图例 + 缩放控制。
 * 无障碍约束：状态同时使用颜色（徽章底色）、图形（徽章内符号）、文字
 * （名称标签 / aria-label / 图例）三重编码，不只依赖颜色。
 *
 * 约束：markers 由控制器严格按 places 生成，一个地点恰好一个针。
 */

const VIEW_W = 800;
const VIEW_H = 600;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const FOCUS_ZOOM = 1.9;

interface MapView {
  cx: number;
  cy: number;
  zoom: number;
}

const FULL_VIEW: MapView = { cx: VIEW_W / 2, cy: VIEW_H / 2, zoom: 1 };

/** 契约中的百分比坐标（0-100）换算为底图像素坐标 */
function toPx(marker: PlaceMarkerVm): { px: number; py: number } {
  return { px: (marker.x / 100) * VIEW_W, py: (marker.y / 100) * VIEW_H };
}

/** 缩放时把视图中心钳制在底图范围内，避免露出底图外区域 */
function clampView(view: MapView): MapView {
  const halfW = VIEW_W / 2 / view.zoom;
  const halfH = VIEW_H / 2 / view.zoom;
  return {
    ...view,
    cx: Math.min(Math.max(view.cx, halfW), VIEW_W - halfW),
    cy: Math.min(Math.max(view.cy, halfH), VIEW_H - halfH),
  };
}

export function TempCampusMap({ markers, onSelectPlace }: CampusMapProps) {
  const [view, setView] = useState<MapView>(FULL_VIEW);
  const selected = markers.find((marker) => marker.selected);
  const selectedId = selected?.placeId;

  // 首页“在地图上查看”跳入（URL 带 placeId）时，自动聚焦并放大到选中地点
  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const marker = markers.find((item) => item.placeId === selectedId);
    if (!marker) {
      return;
    }
    const { px, py } = toPx(marker);
    setView(clampView({ cx: px, cy: py, zoom: FOCUS_ZOOM }));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomBy = (factor: number) => {
    setView((current) =>
      clampView({
        ...current,
        zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor)),
      }),
    );
  };

  const viewBox = `${view.cx - VIEW_W / 2 / view.zoom} ${
    view.cy - VIEW_H / 2 / view.zoom
  } ${VIEW_W / view.zoom} ${VIEW_H / view.zoom}`;

  return (
    <figure className="map-panel map-canvas" style={{ margin: 0 }}>
      <svg
        className="campus-map"
        viewBox={viewBox}
        role="group"
        aria-label="本地模拟校园地图：使用 Tab 键在大头针间移动，按 Enter 打开地点详情"
      >
        <title>本地模拟校园地图</title>
        <CampusBasemap />

        {markers.map((marker) => {
          const meta = STATUS_META[marker.status];
          const { px, py } = toPx(marker);
          const labelWidth = marker.name.length * 13 + 18;
          return (
            <g
              key={marker.placeId}
              className="map-marker"
              role="button"
              tabIndex={0}
              aria-label={`${marker.name}，${meta.label}，按 Enter 查看地点详情`}
              aria-current={marker.selected ? 'true' : undefined}
              transform={`translate(${px} ${py}) scale(${marker.selected ? 1.3 : 1})`}
              style={{ color: `var(--tone-${meta.tone})` }}
              onClick={() => onSelectPlace(marker.placeId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectPlace(marker.placeId);
                }
              }}
            >
              <circle className="map-marker__hit" r="22" />
              {marker.selected && <circle className="map-marker__ring" r="19" />}
              <circle className="map-marker__badge" r="13" />
              <g transform="translate(-7 -7)" style={{ color: '#ffffff' }}>
                <StatusGlyph shape={meta.shape} size={14} />
              </g>
              <g className="map-marker__label" transform="translate(0 32)">
                <rect
                  x={-labelWidth / 2}
                  y="-11"
                  width={labelWidth}
                  height="22"
                  rx="11"
                />
                <text textAnchor="middle" dy="4.5">
                  {marker.name}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      <div className="map-controls" role="group" aria-label="地图缩放控制">
        <button
          type="button"
          onClick={() => zoomBy(1.5)}
          disabled={view.zoom >= MAX_ZOOM}
          aria-label="放大地图"
        >
          ＋
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.5)}
          disabled={view.zoom <= MIN_ZOOM}
          aria-label="缩小地图"
        >
          －
        </button>
        <button
          type="button"
          onClick={() => setView(FULL_VIEW)}
          aria-label="回到全图视图"
        >
          ⟲
        </button>
      </div>

      <details className="map-legend-panel" open>
        <summary>图例</summary>
        <ul>
          {MAP_LEGEND_STATUSES.map((status) => {
            const meta = STATUS_META[status];
            return (
              <li key={status}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  aria-hidden="true"
                  style={{ color: `var(--tone-${meta.tone})` }}
                >
                  <circle
                    cx="9"
                    cy="9"
                    r="7.5"
                    fill="currentColor"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <g transform="translate(4.5 4.5)" style={{ color: '#ffffff' }}>
                    <StatusGlyph shape={meta.shape} size={9} />
                  </g>
                </svg>
                {meta.label}
              </li>
            );
          })}
        </ul>
      </details>
    </figure>
  );
}
