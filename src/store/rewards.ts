import type { AppData } from '../types';
import { REWARDS } from '../app/config/rewards';

export function getAvailablePoints(data: Pick<AppData, 'pointRecords'>, userId: string) {
  return data.pointRecords.filter((record) => record.userId === userId).reduce((sum, record) => sum + record.delta, 0);
}

/** 在同一次状态更新中校验并写入订单和扣分，重复点击不会重复兑换。 */
export function applyRewardRedemption(data: AppData, rewardId: string, id: string, createdAt: string): AppData {
  const reward = REWARDS.find((item) => item.id === rewardId);
  const user = data.demoUsers.find((item) => item.userId === data.currentUserId);
  if (!reward || !user || user.role === 'institution' ||
      data.redemptions.some((item) => item.userId === user.userId && item.rewardId === reward.id) ||
      getAvailablePoints(data, user.userId) < reward.cost) return data;
  return { ...data,
    redemptions: [{ id, userId: user.userId, rewardId, title: reward.title, cost: reward.cost,
      status: reward.review ? 'review_pending' : 'demo_reserved', createdAt }, ...data.redemptions],
    pointRecords: [...data.pointRecords, { id: `${id}-points`, userId: user.userId, userName: user.name,
      delta: -reward.cost, reason: 'reward_redeemed', detail: `模拟兑换：${reward.title}`, createdAt }],
  };
}
