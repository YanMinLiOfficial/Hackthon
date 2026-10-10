import type { FacilityType, IssueType } from '../../types';

/** 设施类型文案（与标准条款分类一致） */
export const FACILITY_META: Record<FacilityType, { label: string; short: string }> = {
  accessible_entrance: { label: '无障碍出入口', short: '出入口' },
  ramp: { label: '轮椅坡道', short: '坡道' },
  tactile_paving: { label: '盲道', short: '盲道' },
  accessible_restroom: { label: '无障碍卫生间', short: '卫生间' },
  elevator: { label: '电梯', short: '电梯' },
  accessible_parking: { label: '无障碍停车位', short: '停车位' },
  signage: { label: '标识与导向', short: '标识' },
};

/** 问题类型文案 */
export const ISSUE_META: Record<IssueType, string> = {
  occupied: '被占用',
  blocked: '被阻挡',
  damaged: '设施破损',
  missing: '设施缺失',
  unavailable: '暂不可用',
  available: '正常可用',
  other: '其他问题',
};

/** 标准标签库，AI 推荐标签与发布表单均从此取值，避免散落硬编码 */
export const STANDARD_TAGS: readonly string[] = [
  '#坡道',
  '#无障碍出入口',
  '#盲道',
  '#无障碍卫生间',
  '#电梯',
  '#无障碍停车位',
  '#标识导向',
  '#通道占用',
  '#通道阻挡',
  '#设施破损',
  '#设施缺失',
  '#正常可用',
  '#需要复核',
  '#已整改',
] as const;
