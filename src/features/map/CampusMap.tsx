import { STATUS_META } from '../../app/config';
import type { CampusMapProps, PlaceMarkerVm } from '../journey/contracts';
import { StatusGlyph } from '../journey/components/StatusGlyph';
import { MapLegend } from './MapLegend';
import './map.css';

/**
 * 可复用本地校园地图画布（成员 B 所有，src/features/map/）。
 *
 * 数据与事件全部来自 props（满足 src/features/journey/contracts.ts 的
 * CampusMapProps）：组件不读 store、不维护地点/观察业务状态，一个地点
 * 恰好由控制器传入一个大头针。
 *
 * - 纯内联 SVG，无网络依赖，断网与无地图 Key 时也可演示；
 * - 状态使用颜色 + 图形（StatusGlyph）+ 文字（名称/aria-label/图例）三重编码；
 * - 鼠标点击与键盘 Enter/Space 均可选择大头针，焦点有清晰可见指示。
 */
export function CampusMap({ markers, onSelectPlace }: CampusMapProps) {
  return (
    <figure className="cnm-panel">
      <svg
        className="cnm-canvas"
        viewBox="0 0 100 100"
        role="group"
        aria-label="本地模拟校园地图：使用 Tab 键在地点大头针间移动，按 Enter 查看地点详情"
      >
        <title>本地模拟校园地图（原型数据）</title>

        <CampusBaseMap />

        <g className="cnm-sim-badge" aria-hidden="true">
          <rect x="1.6" y="1.8" width="17.5" height="5" rx="1.2" />
          <text x="3" y="5.2">
            本地模拟地图
          </text>
        </g>

        {markers.length === 0 ? (
          <text className="cnm-empty" x="50" y="50" textAnchor="middle">
            暂无可显示的地点
          </text>
        ) : (
          markers.map((marker) => (
            <PlaceMarker
              key={marker.placeId}
              marker={marker}
              onSelect={onSelectPlace}
            />
          ))
        )}
      </svg>

      <MapLegend />
    </figure>
  );
}

/**
 * 单个地点大头针。锚点（坐标 x/y）位于针尖；状态色填充圆形牌面，
 * 白色图形居中，下方为带描边光晕的地点名称，保证在任意底图上可读。
 */
function PlaceMarker({
  marker,
  onSelect,
}: {
  marker: PlaceMarkerVm;
  onSelect: (placeId: string) => void;
}) {
  const meta = STATUS_META[marker.status];

  return (
    <g
      className="cnm-marker"
      role="button"
      tabIndex={0}
      aria-label={`${marker.name}，${meta.label}，查看地点详情`}
      aria-current={marker.selected ? 'true' : undefined}
      transform={`translate(${marker.x} ${marker.y})${marker.selected ? ' scale(1.22)' : ''}`}
      style={{ color: `var(--tone-${meta.tone})` }}
      onClick={() => onSelect(marker.placeId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(marker.placeId);
        }
      }}
    >
      {/* 放大的透明命中区，兼顾触摸与键盘焦点指示 */}
      <circle className="cnm-marker__hit" cy="-3.2" r="8.2" />

      {marker.selected && (
        <circle
          className="cnm-marker__selected"
          cy="-3.2"
          r="7.4"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.05"
          strokeDasharray="2 1.2"
        />
      )}

      {/* 针身：圆牌 + 针尖，颜色仅作第三重编码 */}
      <path className="cnm-marker__tail" d="M-2.2 -0.3 L2.2 -0.3 L0 0.9 Z" />
      <circle className="cnm-marker__badge" cy="-3.6" r="4.7" />
      <g className="cnm-marker__glyph" transform="translate(-3.25 -6.85)">
        <StatusGlyph shape={meta.shape} size={6.5} />
      </g>

      <text className="cnm-marker__name" textAnchor="middle" y="5.4">
        {marker.name}
      </text>
    </g>
  );
}

/**
 * 装饰性校园底图：建筑轮廓、道路、绿地与水景仅作视觉定位，
 * 不承载业务信息，辅助技术整体忽略。
 */
function CampusBaseMap() {
  return (
    <g aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" className="cnm-base__ground" />

      {/* 校园主路 */}
      <path d="M0 44 H100" className="cnm-base__road-h" />
      <path d="M50 0 V100" className="cnm-base__road-v" />

      {/* 中心广场（学生活动中心前） */}
      <circle cx="50" cy="50" r="13" className="cnm-base__plaza" />
      <circle cx="50" cy="50" r="13" className="cnm-base__plaza-ring" />

      {/* 绿地与水景 */}
      <ellipse cx="11" cy="80" rx="9" ry="6.5" className="cnm-base__lawn" />
      <ellipse cx="89" cy="16" rx="8.5" ry="6" className="cnm-base__water" />

      {/* 建筑轮廓（针点位于建筑旁，方便视觉定位） */}
      <g className="cnm-base__building">
        <rect x="19" y="11" width="23" height="16" rx="1.6" />
        <rect x="11" y="58" width="23" height="16" rx="1.6" />
        <rect x="55" y="15" width="27" height="17" rx="1.6" />
        <rect x="60" y="60" width="23" height="16" rx="1.6" />
      </g>

      {/* 树丛点缀 */}
      <g className="cnm-base__trees">
        <circle cx="8" cy="20" r="2.4" />
        <circle cx="14" cy="30" r="1.9" />
        <circle cx="40" cy="12" r="2.1" />
        <circle cx="88" cy="40" r="2.3" />
        <circle cx="92" cy="58" r="1.9" />
        <circle cx="40" cy="86" r="2.2" />
        <circle cx="62" cy="88" r="1.9" />
        <circle cx="20" cy="44" r="1.7" />
        <circle cx="80" cy="44" r="1.7" />
      </g>
    </g>
  );
}
