/**
 * M1 主线展示组件契约（props / events）。
 *
 * 按 TEAM_PLAN.md 重平衡后的分工：
 * - 成员 A 在 src/features/feed/ 交付通用帖子卡片，主线设施帖卡片满足本契约即可接入；
 * - 成员 B 在 src/features/map/ 交付校园地图画布，满足本契约即可接入；
 * - 业务状态与跳转由项目负责人的页面控制器持有，组件不得自行读 store 或创建第二套状态。
 *
 * 在成员组件合入前，src/features/journey/components/ 下的最小临时适配器
 * （Temp*）实现同一契约，仅用于贯通主线，合入后删除。
 */
import type { Post, VerificationStatus } from '../../types';

// --- 成员 A：设施帖卡片 -----------------------------------------------------

export interface FacilityPostCardProps {
  post: Post;
  /** 关联地点名称（由控制器从 store 派生，组件不查 store） */
  placeName: string;
  /** 关联观察的核验状态；无观察时回退地点聚合状态 */
  status: VerificationStatus;
  /** 事件：进入地点详情（卡片主操作） */
  onOpenPlaceDetail: (placeId: string) => void;
  /** 事件：在地图上查看该地点（帖图互跳） */
  onOpenInMap: (placeId: string) => void;
}

// --- 成员 B：校园地图画布 ---------------------------------------------------

export interface PlaceMarkerVm {
  placeId: string;
  name: string;
  /** 本地 SVG 地图上的百分比坐标 0-100（由 Place.coordinates 透传） */
  x: number;
  y: number;
  /** 真实经纬度（高德地图用；GCJ-02，缺省时高德组件跳过该针） */
  lat?: number;
  lng?: number;
  status: VerificationStatus;
  /** 是否为当前选中地点（来自 URL 查询参数），选中针放大并加描边 */
  selected: boolean;
}

export interface CampusMapProps {
  /** 一个地点恰好一个大头针；多次观察不生成新针 */
  markers: PlaceMarkerVm[];
  /** 事件：选择大头针（键盘 Enter/Space 与点击均应触发） */
  onSelectPlace: (placeId: string) => void;
}
