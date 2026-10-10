import { STATUS_META, type StatusTone } from '../../../app/config';
import type { VerificationStatus } from '../../../types';
import { StatusGlyph } from './StatusGlyph';

/** 状态徽标：图形 + 文字 + 颜色三重编码 */
export function StatusBadge({ status }: { status: VerificationStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`status-badge status-badge--${meta.tone as StatusTone}`}
      title={meta.description}
    >
      <StatusGlyph shape={meta.shape} size={14} />
      {meta.label}
    </span>
  );
}
