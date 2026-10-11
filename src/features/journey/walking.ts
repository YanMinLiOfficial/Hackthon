export interface WalkingRoute {
  path: [number, number][];
  distance: number;
  duration: number;
  instructions: string[];
}
export type WalkingState = { status: 'idle' | 'loading' } | { status: 'error'; message: string } | { status: 'ready'; route: WalkingRoute };

/** 使用高德 steps.path 的完整道路几何，不用起终点替代。 */
export function parseWalkingRoute(result: any): WalkingRoute {
  const route = result?.routes?.[0];
  if (!route || !Array.isArray(route.steps)) throw new Error('高德未返回可用步行路线。');
  const path: [number, number][] = [];
  for (const step of route.steps) {
    if (!Array.isArray(step.path) || !step.path.length) throw new Error('步行路线缺少道路坐标，未绘制替代连线。');
    for (const location of step.path) {
      const lng = Number(location?.getLng?.() ?? location?.lng ?? location?.[0]);
      const lat = Number(location?.getLat?.() ?? location?.lat ?? location?.[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) throw new Error('步行路线坐标无效。');
      const last = path[path.length - 1];
      if (!last || last[0] !== lng || last[1] !== lat) path.push([lng, lat]);
    }
  }
  const distance = Number(route.distance), duration = Number(route.time);
  if (path.length < 2 || !Number.isFinite(distance) || distance <= 0 || !Number.isFinite(duration) || duration < 0) throw new Error('步行路线数据不完整。');
  return { path, distance, duration, instructions: route.steps.map((step: any) => String(step.instruction ?? '')).filter(Boolean) };
}

export function searchWalkingRoute(AMap: any, origin: [number, number], destination: [number, number], signal: AbortSignal): Promise<WalkingRoute> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, route?: WalkingRoute) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(route!);
    };
    const abort = () => finish(new Error('路线请求已取消。'));
    const timer = setTimeout(() => finish(new Error('高德步行规划超时，请稍后重试。')), 15000);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); return; }
    try {
      AMap.plugin('AMap.Walking', () => {
        if (settled) return;
        try {
          const walking = new AMap.Walking({});
          walking.search(origin, destination, (status: string, result: any) => {
            if (settled) return;
            if (status !== 'complete') { finish(new Error('高德未找到步行路线或接口不可用，请检查服务权限并重试。')); return; }
            try { finish(undefined, parseWalkingRoute(result)); } catch (error) { finish(error instanceof Error ? error : new Error('步行路线解析失败。')); }
          });
        } catch { finish(new Error('高德步行服务未能启动，请检查服务权限。')); }
      });
    } catch { finish(new Error('高德步行插件加载失败。')); }
  });
}

/** 校园小范围近似点到道路折线距离，用于提示附近记录，不作通行判断。 */
export function distanceToWalkingPath(lng: number, lat: number, path: [number, number][]) {
  if (path.length < 2 || !Number.isFinite(lng) || !Number.isFinite(lat)) return Infinity;
  const scaleX = 111320 * Math.cos(lat * Math.PI / 180), scaleY = 111320;
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const ax = (path[i - 1][0] - lng) * scaleX, ay = (path[i - 1][1] - lat) * scaleY;
    const bx = (path[i][0] - lng) * scaleX, by = (path[i][1] - lat) * scaleY;
    const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}
