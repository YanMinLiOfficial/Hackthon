import { useEffect, useState } from 'react';
import type { PlaceMarkerVm } from '../contracts';
import { getDemoRoutePoints } from './DemoRouteOverlay';
import { searchWalkingRoute, type WalkingState } from '../walking';

export function WalkingRouteOverlay({ map, markers, routeIds, onResult }: { map: any; markers: PlaceMarkerVm[]; routeIds: string[]; onResult?: (state: WalkingState) => void }) {
  const [state, setState] = useState<WalkingState>({ status: 'idle' });
  const points = getDemoRoutePoints(markers, routeIds);
  const signature = JSON.stringify(points);
  useEffect(() => {
    const controller = new AbortController();
    const overlays: any[] = [];
    const publish = (next: WalkingState) => { if (!controller.signal.aborted) { setState(next); onResult?.(next); } };
    if (!routeIds.length) { publish({ status: 'idle' }); return; }
    if (points.length !== 2) { publish({ status: 'error', message: '起终点位置尚未匹配，不能查询真实步行路线。' }); return; }
    if (!map || !window.AMap) { publish({ status: 'loading' }); return; }
    const AMap = window.AMap;
    publish({ status: 'loading' });
    searchWalkingRoute(AMap, points[0], points[1], controller.signal).then((route) => {
      if (controller.signal.aborted) return;
      const line = new AMap.Polyline({ path: route.path, strokeColor: '#2268d7', strokeWeight: 7,
        strokeOpacity: .95, isOutline: true, outlineColor: '#fff', borderWeight: 3, zIndex: 80 });
      overlays.push(line);
      [route.path[0], route.path[route.path.length - 1]].forEach((position, index) => {
        const content = document.createElement('span');
        content.className = `demo-route-endpoint${index ? ' is-end' : ''}`;
        content.textContent = index ? '终' : '起';
        content.setAttribute('aria-hidden', 'true');
        overlays.push(new AMap.Marker({ position, content, anchor: 'bottom-center', offset: new AMap.Pixel(0, -25), zIndex: 140 }));
      });
      overlays.forEach((overlay) => map.add(overlay));
      const desktop = window.matchMedia('(min-width: 760px)').matches;
      map.setFitView(overlays, false, [160, 140, desktop ? 410 : 60, 80]);
      publish({ status: 'ready', route });
    }).catch((error) => publish({ status: 'error', message: error instanceof Error ? error.message : '步行路线请求失败。' }));
    return () => { controller.abort(); overlays.forEach((overlay) => map.remove(overlay)); };
  }, [map, signature, routeIds, onResult]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!routeIds.length) return null;
  return <p className="demo-route-notice" role="status">{state.status === 'ready' ? '高德步行道路路线 · 无障碍通行待核验' : state.status === 'error' ? state.message : '正在获取高德步行道路路线…'}</p>;
}
