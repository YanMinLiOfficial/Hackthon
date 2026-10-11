import type { AppData, VerificationStatus } from '../types';

const STATUS_RANK: Record<VerificationStatus, number> = { pending: 0, remediation_pending: 1, stale: 2, community_verified: 3, institution_confirmed: 4, resolved: 5 };

/** 权限和关联清理在同一次状态更新里完成，不允许通过界面之外删除他人帖子。 */
export function deleteOwnedPost(data: AppData, postId: string): AppData {
  const post = data.posts.find((item) => item.id === postId);
  if (!post || post.author.id !== data.currentUserId) return data;
  const observationIds = new Set(data.observations.filter((item) => item.id === post.observationId || item.postId === post.id).map((item) => item.id));
  const affectedPlaces = new Set(data.observations.filter((item) => observationIds.has(item.id)).map((item) => item.placeId));
  const observations = data.observations.filter((item) => !observationIds.has(item.id));
  const places = data.places.map((place) => {
    if (!affectedPlaces.has(place.id)) return place;
    const remaining = observations.filter((item) => item.placeId === place.id);
    const currentStatus = remaining.length ? remaining.reduce<VerificationStatus>((status, item) => STATUS_RANK[item.verificationStatus] < STATUS_RANK[status] ? item.verificationStatus : status, 'resolved') : 'stale';
    const verifiedTimes = remaining.flatMap((item) => item.confirmations.map((vote) => vote.createdAt)).filter((time) => Number.isFinite(Date.parse(time))).sort((a, b) => Date.parse(b) - Date.parse(a));
    return { ...place, observationIds: remaining.map((item) => item.id), currentStatus, lastVerifiedAt: verifiedTimes[0] ?? place.lastVerifiedAt };
  });
  return { ...data, posts: data.posts.filter((item) => item.id !== postId), observations, places,
    timeline: data.timeline.filter((item) => !item.observationId || !observationIds.has(item.observationId)),
    pointRecords: data.pointRecords.filter((item) => !item.relatedObservationId || !observationIds.has(item.relatedObservationId)),
    deletedPostIds: [...new Set([...(data.deletedPostIds ?? []), postId])],
  };
}
