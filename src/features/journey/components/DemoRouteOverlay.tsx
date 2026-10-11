import type { PlaceMarkerVm } from '../contracts';

/** 使用已匹配 POI，禁止跳过缺失的途经点后直接连接两端。 */
export function getDemoRoutePoints(markers: PlaceMarkerVm[], routeIds: readonly string[]) {
  if (routeIds.length < 2) return [];
  const points = routeIds.map((id) => markers.find((marker) => marker.placeId === id));
  if (points.some((point) => !point || !Number.isFinite(point.lng) || !Number.isFinite(point.lat))) return [];
  return points.map((point) => [point!.lng!, point!.lat!] as [number, number]);
}
