import type { Observation, SimulatedIdentity } from '../types';

/** 页面提示与仓库写入共用资格检查，发布者/重复投票/机构均不可计入独立复核。 */
export function getVerificationBlock(observation: Observation, user: SimulatedIdentity): string | null {
  if (user.role === 'institution') return '机构身份不参与志愿者独立复核，请切换为志愿者。';
  if (!['pending', 'community_verified', 'stale'].includes(observation.verificationStatus)) return '当前状态不接受独立核验。';
  if (observation.reporterId === user.userId) return '你是发布者，不能复核自己的观察。';
  if (observation.confirmations.some((vote) => vote.userId === user.userId) ||
      observation.disputes.some((vote) => vote.userId === user.userId)) return '你已提交过复核，每个身份只能记录一次。';
  return null;
}
