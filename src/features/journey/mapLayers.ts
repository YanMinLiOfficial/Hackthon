import { FACILITY_META } from '../../app/config';
import type { FacilityType } from '../../types';
import type { PlaceMarkerVm } from './contracts';

export type MapLayer = 'inspection' | FacilityType;
export const FACILITY_LAYERS = Object.keys(FACILITY_META) as FacilityType[];
export function mapLayerLabel(layer: MapLayer): string {
  return layer === 'inspection' ? '设施督查' : layer === 'elevator' ? '无障碍电梯' : FACILITY_META[layer].label;
}

export function applyMapLayers(markers: PlaceMarkerVm[], layers: MapLayer[]): PlaceMarkerVm[] {
  return markers.map((marker) => {
    const visibleFacilities = (marker.facilityTypes ?? []).filter((type) => layers.includes(type));
    const showInspection = layers.includes('inspection');
    return { ...marker, visibleFacilities, showInspection, hidden: !showInspection && visibleFacilities.length === 0 };
  });
}

/** 简单线形设施图标，与文字标签组合使用；只输出固定配置，无用户 HTML。 */
export function facilityGlyphSvg(type: FacilityType, size = 14): string {
  const paths: Record<FacilityType, string> = {
    accessible_restroom: '<text x="8" y="11" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" font-weight="bold">WC</text>',
    elevator: '<rect x="2" y="1" width="12" height="14" rx="1"/><path d="M5 11V5m-2 2 2-2 2 2m4-2v6m-2-2 2 2 2-2"/>',
    ramp: '<path d="M2 13h12L12 6 2 13Z"/><circle cx="5" cy="5" r="2"/>',
    accessible_entrance: '<path d="M4 14V2h8v12M1 14h14M7 8h5m-2-2 2 2-2 2"/>',
    tactile_paving: '<path d="M4 2v12m4-12v12m4-12v12" stroke-dasharray="1 3" stroke-width="2"/>',
    accessible_parking: '<rect x="2" y="1" width="12" height="14" rx="2"/><path d="M6 12V4h3a2 2 0 0 1 0 4H6"/>',
    signage: '<path d="M8 1v14M2 3h9l3 3-3 3H2V3Z"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]}</svg>`;
}
