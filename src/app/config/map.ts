/**
 * 高德 POI 仅用于把演示地点校准到校园建筑中心。
 * “东门/侧门/坡道”等设施级位置不应由建筑 POI 冒充，仍需地图点选或现场核验。
 */
export const AMAP_PLACE_QUERIES: Record<string, readonly string[]> = {
  'place-library-east': ['南方科技大学工学院', '工学院'],
  'place-canteen': ['南方科技大学荔园餐厅', '荔园餐厅'],
  'place-teaching-3': ['南方科技大学第三科研楼', '第三科研楼'],
  'place-gym': ['南方科技大学致诚书院', '致诚书院'],
  'place-student-center': ['南方科技大学树德书院', '树德书院'],
};

export const AMAP_POI_CACHE_KEY = 'wuai-gongchuang:amap-poi:v2';

/** 发布页默认查询校园及周边；中心使用当前南科大演示区域 GCJ-02 坐标。 */
export const CAMPUS_SEARCH = {
  city: '深圳',
  center: [113.996072, 22.60051] as [number, number],
  radiusMeters: 3000,
  label: '南科大及周边 3 公里',
} as const;

export function distanceFromCampus(lng: number, lat: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const [centerLng, centerLat] = CAMPUS_SEARCH.center;
  const a = Math.sin(radians(lat - centerLat) / 2) ** 2
    + Math.cos(radians(centerLat)) * Math.cos(radians(lat)) * Math.sin(radians(lng - centerLng) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

/** 只接受指定建筑，不把邻近地点或整个大学当成搜索命中。 */
export function matchesCampusPoi(name: string, query: string): boolean {
  const normalize = (value: string) => value.replace(/南方科技大学|[\s()（）·-]/g, '');
  return normalize(name) === normalize(query);
}
