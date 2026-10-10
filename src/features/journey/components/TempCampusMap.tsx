import { MAP_LEGEND_STATUSES, STATUS_META } from '../../../app/config';
import type { CampusMapProps } from '../contracts';
import { StatusGlyph } from './StatusGlyph';

/**
 * 【临时适配器】本地简化校园地图画布。
 * 成员 B 在 src/features/map/ 的可复用地图组件合入后，本文件删除，
 * 其组件只需满足 CampusMapProps（见 ../contracts.ts）：数据与回调全部来自 props，
 * 不读 store、不维护第二套地点状态。
 *
 * 约束：markers 由控制器严格按 places 生成，一个地点恰好一个针；
 * 状态使用图形 + 文字（aria-label/图例）+ 颜色三重编码。
 */
export function TempCampusMap({ markers, onSelectPlace }: CampusMapProps) {
  return (
    <figure className="map-panel" style={{ margin: 0 }}>
      <svg
        className="campus-map"
        viewBox="0 0 100 100"
        role="group"
        aria-label="本地模拟校园地图：使用方向键或 Tab 选择地点大头针查看详情"
      >
        <title>本地模拟校园地图</title>
        {/* 装饰性校园底图（纯装饰，辅助技术可忽略） */}
        <g aria-hidden="true">
          <rect x="20" y="12" width="26" height="22" rx="2" fill="#cfe0cf" />
          <rect x="55" y="14" width="24" height="20" rx="2" fill="#cfe0cf" />
          <rect x="58" y="56" width="22" height="22" rx="2" fill="#cfe0cf" />
          <rect x="16" y="52" width="24" height="18" rx="2" fill="#cfe0cf" />
          <path d="M0 44 H100 M50 0 V100" stroke="#d9e2d9" strokeWidth="3" />
          <circle cx="50" cy="50" r="16" fill="#f2f6f2" stroke="#d9e2d9" strokeWidth="1.5" />
        </g>

        {markers.map((marker) => {
          const tone = STATUS_META[marker.status].tone;
          return (
            <g
              key={marker.placeId}
              className="map-marker"
              role="button"
              tabIndex={0}
              aria-label={`${marker.name}，${STATUS_META[marker.status].label}，查看地点详情`}
              aria-current={marker.selected ? 'true' : undefined}
              transform={`translate(${marker.x} ${marker.y})${marker.selected ? ' scale(1.25)' : ''}`}
              style={{ color: `var(--tone-${tone})` }}
              onClick={() => onSelectPlace(marker.placeId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectPlace(marker.placeId);
                }
              }}
            >
              <circle className="map-marker__hit" r="7" />
              {marker.selected && (
                <circle
                  r="6.4"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="1.1"
                  strokeDasharray="2 1.2"
                />
              )}
              <g transform="translate(-4.5 -4.5)">
                <StatusGlyph shape={STATUS_META[marker.status].shape} size={9} />
              </g>
              <text
                className="map-marker__name"
                textAnchor="middle"
                y="10.5"
              >
                {marker.name}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="map-legend" aria-label="地图状态图例：状态同时使用图形、文字和颜色区分">
        {MAP_LEGEND_STATUSES.map((status) => (
          <span className="map-legend__item" key={status}>
            <span style={{ color: `var(--tone-${STATUS_META[status].tone})`, display: 'inline-flex' }}>
              <StatusGlyph shape={STATUS_META[status].shape} size={14} />
            </span>
            {STATUS_META[status].label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
