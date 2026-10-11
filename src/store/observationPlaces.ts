import type { Place, PublishObservationInput } from '../types';

export function resolveObservationPlace(places: Place[], input: PublishObservationInput, id: string): Place {
  const existing = places.find((place) => place.id === input.placeId);
  if (existing) return existing;
  if (!input.newPlace) throw new Error('请选择地点或为新地点填写名称并确认位置');
  const name = input.newPlace.name.trim();
  const { lat, lng } = input.coordinates;
  if (!name || name.length > 80 || !Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat!) > 90 || Math.abs(lng!) > 180) throw new Error('请填写有效地点名称并确认地图位置');
  const normalize = (value: string) => value.replace(/南方科技大学|[\s()（）·-]/g, '');
  const matched = places.find((place) => {
    if (input.newPlace!.amapPoiId && place.amapPoiId === input.newPlace!.amapPoiId) return true;
    if (normalize(place.name) !== normalize(name) || !Number.isFinite(place.coordinates.lat) || !Number.isFinite(place.coordinates.lng)) return false;
    const north = (lat! - place.coordinates.lat!) * 111320;
    const east = (lng! - place.coordinates.lng!) * 111320 * Math.cos(lat! * Math.PI / 180);
    return Math.hypot(north, east) <= 80;
  });
  return matched ?? { id, name, amapPoiId: input.newPlace.amapPoiId, coordinates: { ...input.coordinates },
    category: '用户标注地点', accessibilityFeatures: [], currentStatus: 'pending', lastVerifiedAt: '', observationIds: [] };
}
