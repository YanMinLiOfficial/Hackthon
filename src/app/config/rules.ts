import type { PointReason } from '../../types';

/** 业务规则集中配置：核验阈值、时效、积分均为模拟规则 */

/** 一名志愿者只能计一票，达到 2 名不同志愿者确认后变为“社区已复核” */
export const VERIFICATION_REQUIRED_CONFIRMATIONS = 2;

/** 超过该天数未核验的地点/观察标记为“信息可能过期” */
export const STALE_AFTER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isStale(lastVerifiedAt: string, nowMs: number = Date.now()): boolean {
  const t = Date.parse(lastVerifiedAt);
  if (Number.isNaN(t)) {
    return false;
  }
  return nowMs - t > STALE_AFTER_DAYS * DAY_MS;
}

export interface PointRule {
  delta: number;
  label: string;
  /** 积分明细中展示的变化原因 */
  detail: string;
}

export const POINT_RULES: Record<PointReason, PointRule> = {
  observation_published: {
    delta: 10,
    label: '有效观察',
    detail: '发布一条有效设施观察',
  },
  verification_confirmed: {
    delta: 5,
    label: '独立复核',
    detail: '完成一次独立现场复核',
  },
  remediation_posted: {
    delta: 0,
    label: '整改回复',
    detail: '整改回复由机构提交，不产生志愿积分',
  },
};
