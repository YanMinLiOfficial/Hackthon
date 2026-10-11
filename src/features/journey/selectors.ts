/**
 * M1 主线业务派生：从唯一共享仓库 useAppStore() 取数，
 * 页面控制器与临时适配器只消费这里的结果，不重复实现筛选/聚合逻辑。
 */
import type { AppStore, Place, VerificationStatus } from '../../types';
import type { PlaceMarkerVm } from './contracts';

export interface FacilityPostVm {
  postId: string;
  placeId: string;
  placeName: string;
  status: VerificationStatus;
  createdAt: string;
}

/**
 * 首页主线：按时间倒序的设施观察帖。
 * 状态取关联观察的核验状态；观察缺失时回退地点当前聚合状态。
 */
export function selectFacilityPostIndex(store: AppStore): FacilityPostVm[] {
  return store.posts
    .filter((post) => post.type === 'facility' && post.placeId)
    .map((post) => {
      const place: Place | undefined = store.getPlace(post.placeId as string);
      const observation = post.observationId
        ? store.getObservation(post.observationId)
        : undefined;
      return {
        postId: post.id,
        placeId: post.placeId as string,
        placeName: place?.name ?? '未知地点',
        status: observation?.verificationStatus ?? place?.currentStatus ?? 'pending',
        createdAt: post.createdAt,
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * 地图大头针：严格按 places 生成，每个地点恰好一个针，
 * 观察永远不产生新针（多次观察进入地点时间线）。
 */
export function selectPlaceMarkers(
  store: AppStore,
  selectedPlaceId?: string,
): PlaceMarkerVm[] {
  return store.places.map((place) => ({
    placeId: place.id,
    name: place.name,
    x: place.coordinates.x,
    y: place.coordinates.y,
    lat: place.coordinates.lat,
    lng: place.coordinates.lng,
    status: place.currentStatus,
    selected: place.id === selectedPlaceId,
  }));
}
