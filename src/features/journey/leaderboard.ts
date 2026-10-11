import type { AppData } from '../../types';

/** 并列积分使用相同名次；机构身份不参与志愿者排名。 */
export function selectLeaderboard(data: Pick<AppData, 'demoUsers' | 'pointRecords'>) {
  const sorted = data.demoUsers.filter((user) => user.role !== 'institution')
    .map((user) => ({ ...user, points: data.pointRecords.filter((record) => record.userId === user.userId && record.delta > 0).reduce((sum, record) => sum + record.delta, 0) }))
    .sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId));
  return sorted.map((user, index) => ({ ...user, rank: sorted.findIndex((entry) => entry.points === user.points) + 1, order: index }));
}
