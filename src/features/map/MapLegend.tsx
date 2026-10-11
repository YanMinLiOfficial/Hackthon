import { MAP_LEGEND_STATUSES, STATUS_META } from '../../app/config';
import { StatusGlyph } from '../journey/components/StatusGlyph';

/**
 * 地图状态图例（成员 B 所有）。
 * 状态同时使用图形、颜色与文字三重编码，屏幕阅读器通过 figcaption 的
 * aria-label 获取说明，装饰图形标记 aria-hidden。
 */
export function MapLegend() {
  return (
    <figcaption
      className="cnm-legend"
      aria-label="地图状态图例：状态同时使用图形、文字和颜色区分，不只依赖颜色"
    >
      {MAP_LEGEND_STATUSES.map((status) => (
        <span className="cnm-legend__item" key={status}>
          <span
            className="cnm-legend__glyph"
            style={{ color: `var(--tone-${STATUS_META[status].tone})` }}
            aria-hidden="true"
          >
            <StatusGlyph shape={STATUS_META[status].shape} size={14} />
          </span>
          {STATUS_META[status].label}
        </span>
      ))}
    </figcaption>
  );
}
