import type { DemoRoute } from '../types';

/**
 * 预设模拟无障碍路线（成员 B 的导航页消费）。
 * 位置点为本地 SVG 地图百分比坐标，位置移动为模拟匀速，不是真实路径规划。
 */
export const DEMO_ROUTES: readonly DemoRoute[] = [
  {
    id: 'route-center-to-library',
    name: '学生活动中心 → 图书馆东门（无障碍路线）',
    originPlaceId: 'place-student-center',
    destinationPlaceId: 'place-library-east',
    durationSeconds: 26,
    speedMps: 8,
    totalMeters: 200,
    steps: [
      {
        id: 'step-1',
        atMeters: 0,
        instruction: '从学生活动中心无障碍出口出发，沿主路直行',
        coordinates: { x: 50, y: 52 },
      },
      {
        id: 'step-2',
        atMeters: 60,
        instruction: '继续直行约 60 米，路面平整',
        coordinates: { x: 46, y: 46 },
      },
      {
        id: 'step-3',
        atMeters: 115,
        instruction: '前方 15 米存在台阶，请向右进入无障碍坡道',
        coordinates: { x: 41, y: 39 },
        hazard: '前方 15 米有台阶（3 级）',
        accessibleAlternative: '向右进入轮椅坡道，坡度平缓，配有扶手',
      },
      {
        id: 'step-4',
        atMeters: 160,
        instruction: '沿坡道上行，保持右侧直行',
        coordinates: { x: 35, y: 33 },
      },
      {
        id: 'step-5',
        atMeters: 200,
        instruction: '到达图书馆东门无障碍出入口，本次模拟导航结束',
        coordinates: { x: 30, y: 26 },
      },
    ],
  },
] as const;
