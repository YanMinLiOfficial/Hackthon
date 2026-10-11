import type { AppData, HelpRequest } from '../types';

export const HELP_NEEDS = ['坡道或通道受阻', '需要短距离陪同', '设施使用协助', '其他非紧急帮助'] as const;
export const HELP_STATUS = { pending: '待响应', accepted: '已接单', completed: '已完成', cancelled: '已取消' };
export const canRespondToHelp = (role: string) => ['volunteer', 'lead_volunteer', 'institution'].includes(role);
export const helpEntryLabel = (role: string) => role === 'disabled_person' ? '求助' : '响应求助';

/** 演示位置取校园地点，不读取志愿者真实位置；同一坐标系估算直线距离。 */
export function nearbyDemoVolunteers(data: AppData, placeId: string) {
  const target = data.places.find((place) => place.id === placeId)?.coordinates;
  return data.demoUsers.filter((user) => canRespondToHelp(user.role)).map((user, index) => {
    const location = data.places[index % data.places.length]?.coordinates;
    const distance = target && location && Number.isFinite(target.lat) && Number.isFinite(target.lng) &&
      Number.isFinite(location.lat) && Number.isFinite(location.lng)
      ? Math.round(Math.hypot((location.lat! - target.lat!) * 111320,
        (location.lng! - target.lng!) * 111320 * Math.cos(target.lat! * Math.PI / 180))) : null;
    return { user, distance };
  }).filter(({ user, distance }) => user.userId !== data.currentUserId && distance !== null && distance <= 1500)
    .sort((a, b) => a.distance! - b.distance!).slice(0, 3);
}

export function createLocalHelp(data: AppData, input: { id: string; placeId: string; need: string; message: string; now: string }): AppData {
  if (data.demoUsers.find((user) => user.userId === data.currentUserId)?.role !== 'disabled_person' ||
    !data.places.some((place) => place.id === input.placeId) ||
    !HELP_NEEDS.some((need) => need === input.need) || input.message.length > 500 ||
    data.helpRequests.some((item) => item.requesterId === data.currentUserId && ['pending', 'accepted'].includes(item.status))) return data;
  const request: HelpRequest = {
    id: input.id, requesterId: data.currentUserId, placeId: input.placeId, need: input.need,
    message: input.message.trim(), status: 'pending',
    recipientIds: nearbyDemoVolunteers(data, input.placeId).map(({ user }) => user.userId),
    createdAt: input.now, updatedAt: input.now,
  };
  return { ...data, helpRequests: [request, ...data.helpRequests] };
}

export function transitionLocalHelp(data: AppData, id: string, action: 'accept' | 'complete' | 'cancel', now: string): AppData {
  const request = data.helpRequests.find((item) => item.id === id);
  if (!request) return data;
  const actor = data.demoUsers.find((user) => user.userId === data.currentUserId);
  let status: HelpRequest['status'];
  if (action === 'accept' && request.status === 'pending' && actor && canRespondToHelp(actor.role) &&
      request.requesterId !== actor.userId && request.recipientIds.includes(actor.userId)) status = 'accepted';
  else if (action === 'complete' && request.status === 'accepted' &&
      [request.requesterId, request.volunteerId].includes(data.currentUserId)) status = 'completed';
  else if (action === 'cancel' && ['pending', 'accepted'].includes(request.status) && request.requesterId === data.currentUserId) status = 'cancelled';
  else return data;
  return { ...data, helpRequests: data.helpRequests.map((item) => item.id === id
    ? { ...item, status, updatedAt: now, ...(action === 'accept' ? { volunteerId: data.currentUserId } : {}) } : item) };
}
