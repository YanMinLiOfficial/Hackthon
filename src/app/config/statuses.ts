import type { VerificationStatus } from '../../types';

/**
 * 核验状态元数据。地图大头针同时使用 tone（颜色）与 shape（图形）双重编码，
 * 并始终配合文字标签：状态表达不能只依赖颜色。
 */
export type StatusTone = 'pending' | 'warning' | 'success' | 'info' | 'attention' | 'neutral' | 'resolved';
export type MarkerShape =
  | 'pin-ring' // 空心圆：待核验
  | 'pin-dot' // 实心圆：社区已复核
  | 'pin-square' // 方块：机构确认/正常
  | 'pin-triangle' // 三角：整改中
  | 'pin-clock' // 时钟：可能过期
  | 'pin-check'; // 对勾：复查通过/已解决

export interface StatusMeta {
  label: string;
  description: string;
  tone: StatusTone;
  shape: MarkerShape;
}

export const STATUS_META: Record<VerificationStatus, StatusMeta> = {
  pending: {
    label: '待核验',
    description: '新观察，等待不同志愿者独立复核',
    tone: 'pending',
    shape: 'pin-ring',
  },
  community_verified: {
    label: '社区已复核',
    description: '已达到社区独立复核人数',
    tone: 'success',
    shape: 'pin-dot',
  },
  institution_confirmed: {
    label: '已确认 · 正常',
    description: '机构确认或志愿者记录设施正常可用',
    tone: 'info',
    shape: 'pin-square',
  },
  remediation_pending: {
    label: '整改中',
    description: '场所负责人已提交整改，待现场复查',
    tone: 'attention',
    shape: 'pin-triangle',
  },
  resolved: {
    label: '已解决',
    description: '复查通过，设施恢复可用',
    tone: 'resolved',
    shape: 'pin-check',
  },
  stale: {
    label: '信息可能过期',
    description: '距上次核验超过时效阈值，建议重新复核',
    tone: 'neutral',
    shape: 'pin-clock',
  },
};

/** 地图图例固定展示五项（resolved 在时间线中出现） */
export const MAP_LEGEND_STATUSES: readonly VerificationStatus[] = [
  'pending',
  'community_verified',
  'institution_confirmed',
  'remediation_pending',
  'stale',
] as const;
