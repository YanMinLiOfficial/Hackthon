import type { Place, UserPreferences } from '../../types';

export type TravelNeeds = Pick<UserPreferences, 'avoidStairs' | 'needsRamp' | 'needsElevator'>;
export interface DemoTravelEdge { from: string; to: string; meters: number; kind: 'flat' | 'stairs' | 'ramp' | 'elevator' }
const CENTER = 'place-student-center', LIBRARY = 'place-library-east', CANTEEN = 'place-canteen', TEACHING = 'place-teaching-3', GYM = 'place-gym';
/** 虚构路网及距离，仅用于展示偏好筛选，不对应高德路网或现场设施。 */
export const DEMO_TRAVEL_EDGES: readonly DemoTravelEdge[] = [
  { from: CENTER, to: LIBRARY, meters: 100, kind: 'stairs' },
  { from: CENTER, to: CANTEEN, meters: 180, kind: 'flat' },
  { from: CANTEEN, to: LIBRARY, meters: 240, kind: 'ramp' },
  { from: CENTER, to: TEACHING, meters: 160, kind: 'flat' },
  { from: TEACHING, to: LIBRARY, meters: 200, kind: 'elevator' },
  { from: TEACHING, to: GYM, meters: 280, kind: 'flat' },
  { from: CANTEEN, to: GYM, meters: 360, kind: 'ramp' },
];
export const TRAVEL_KIND_LABELS = { flat: '模拟平路', stairs: '模拟台阶', ramp: '模拟坡道', elevator: '模拟电梯' };
export interface DemoTravelPlan { placeIds: string[]; segments: DemoTravelEdge[]; totalMeters: number }
export type TravelPlanResult = { ok: true; preferred: DemoTravelPlan; shortest: DemoTravelPlan } | { ok: false; message: string };

export function planDemoTravel(places: Place[], origin: string, destination: string, needs: TravelNeeds, edges = DEMO_TRAVEL_EDGES): TravelPlanResult {
  const ids = new Set(places.map((place) => place.id));
  if (!ids.has(origin) || !ids.has(destination)) return { ok: false, message: '请选择有效的起点和终点。' };
  if (origin === destination) return { ok: false, message: '起点和终点相同，请选择不同地点。' };
  const candidates: DemoTravelPlan[] = [];
  const visit = (current: string, path: string[], segments: DemoTravelEdge[]) => {
    if (current === destination) {
      candidates.push({ placeIds: path, segments, totalMeters: segments.reduce((sum, edge) => sum + edge.meters, 0) });
      return;
    }
    for (const edge of edges) {
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (!next || !ids.has(next) || path.includes(next)) continue;
      visit(next, [...path, next], [...segments, { ...edge, from: current, to: next }]);
    }
  };
  visit(origin, [origin], []);
  candidates.sort((a, b) => a.totalMeters - b.totalMeters);
  const preferred = candidates.find((plan) => plan.segments.every((edge) => {
    if (edge.kind === 'stairs' && (needs.avoidStairs || needs.needsRamp || needs.needsElevator)) return false;
    if (edge.kind === 'ramp' && needs.needsElevator && !needs.needsRamp) return false;
    if (edge.kind === 'elevator' && needs.needsRamp && !needs.needsElevator) return false;
    return true;
  }));
  return preferred ? { ok: true, preferred, shortest: candidates[0] } : { ok: false, message: '演示路网中没有满足全部偏好的路线。不会自动放宽条件；请调整需求或查看地点记录。' };
}
