/**
 * 无碍共创 MVP 共享领域模型（团队共享接口契约）。
 *
 * 所有权：项目负责人（src/types/）。成员 A/B/C 只消费本文件，
 * 如需变更字段，先向项目负责人提出，单独提交并优先合并。
 *
 * 约定：所有时间均为 ISO 8601 字符串；所有 AI / 标准 / 导航结果均为模拟，
 * 界面必须展示模拟标注，字段中保留 simulated / isPrototypeSample 等诚实标记。
 */

// ---------------------------------------------------------------------------
// 基础概念
// ---------------------------------------------------------------------------

/** 帖子类型（信息架构：全部 / 设施观察 / 科普 / 工具；经验为补充类型） */
export type PostType = 'facility' | 'article' | 'tool' | 'experience';

/**
 * 观察核验状态。地图图例、时间线和积分规则共用同一套状态，
 * 不允许各功能自定义第二套状态字面量。
 *
 * - pending：待核验（新观察默认）
 * - community_verified：社区已复核（达到独立确认人数）
 * - institution_confirmed：机构已确认 / 设施正常
 * - remediation_pending：整改中（已整改，待复查）
 * - resolved：已解决 / 复查通过
 * - stale：信息可能过期（超过时效阈值）
 */
export type VerificationStatus =
  | 'pending'
  | 'community_verified'
  | 'institution_confirmed'
  | 'remediation_pending'
  | 'resolved'
  | 'stale';

/** 设施类型（与标准条款分类对应） */
export type FacilityType =
  | 'accessible_entrance' // 无障碍出入口
  | 'ramp' // 轮椅坡道
  | 'tactile_paving' // 盲道
  | 'accessible_restroom' // 无障碍卫生间
  | 'elevator' // 电梯
  | 'accessible_parking' // 无障碍停车位
  | 'signage'; // 标识与导向

/** 问题类型；available 表示“设施正常可用”的正向观察 */
export type IssueType =
  | 'occupied' // 被占用
  | 'blocked' // 被阻挡
  | 'damaged' // 破损
  | 'missing' // 缺失
  | 'unavailable' // 不可用
  | 'available' // 正常可用
  | 'other';

/**
 * 模拟地图坐标。x/y 为本地 SVG 地图上的百分比位置（0-100），
 * 接真实地图时使用可选 lat/lng（经纬度），页面不直接依赖经纬度算法。
 */
export interface GeoCoordinates {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}

// ---------------------------------------------------------------------------
// 标准与 AI
// ---------------------------------------------------------------------------

/** 标准条款引用。正式使用前必须核对原文，故强制保留原型标记。 */
export interface StandardReference {
  id: string;
  category: FacilityType;
  /** 示例条款号，如 “GB 50763-2012 3.3.2” */
  clauseCode: string;
  title: string;
  source: string;
  excerpt: string;
  /** 恒为 true：原型示例条款，正式使用前需核对原文 */
  isPrototypeSample: true;
}

/** AI 图片分析的确定性模拟结果快照 */
export interface AiAnalysis {
  facilityType: FacilityType;
  issueType: IssueType;
  detectedLabel: string;
  issueSummary: string;
  /** 置信度 0-1，仅作模拟展示 */
  confidence: number;
  suggestedTags: string[];
  standardReferences: StandardReference[];
  /** 恒为 true：AI 模拟分析，非真实模型调用，结果仅供辅助 */
  simulated: true;
  generatedAt: string;
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// 观察、核验、整改、时间线
// ---------------------------------------------------------------------------

export interface VerificationVote {
  userId: string;
  userName: string;
  vote: 'confirm' | 'dispute';
  createdAt: string;
}

export interface RemediationUpdate {
  id: string;
  observationId: string;
  authorId: string;
  authorName: string;
  authorRole: SimulatedRole;
  message: string;
  photo?: string;
  statusAfter: VerificationStatus;
  createdAt: string;
}

export interface Observation {
  id: string;
  placeId: string;
  /** 发布后生成的关联设施帖 id，保证地图 ↔ 帖子互跳 */
  postId?: string;
  photo: string;
  capturedAt: string;
  coordinates: GeoCoordinates;
  facilityType: FacilityType;
  issueType: IssueType;
  description: string;
  standardTags: string[];
  standardReferences: StandardReference[];
  aiConfidence: number;
  verificationStatus: VerificationStatus;
  reporterId: string;
  reporterName: string;
  createdAt: string;
  confirmations: VerificationVote[];
  disputes: VerificationVote[];
  remediationUpdates: RemediationUpdate[];
}

export type TimelineEventType =
  | 'observation_published'
  | 'verified'
  | 'status_changed'
  | 'recheck_requested'
  | 'remediation'
  | 'resolved';

/** 地点时间线事件：所有状态变化都记录操作人角色与时间 */
export interface TimelineEvent {
  id: string;
  placeId: string;
  observationId?: string;
  type: TimelineEventType;
  actorId: string;
  actorName: string;
  actorRole: SimulatedRole;
  message: string;
  statusAfter?: VerificationStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 地点与帖子
// ---------------------------------------------------------------------------

export interface Place {
  id: string;
  name: string;
  coordinates: GeoCoordinates;
  /** 地点大类，如“图书馆 / 食堂 / 教学楼” */
  category: string;
  accessibilityFeatures: string[];
  /**
   * 地点状态由该地点观察聚合而来（一个地点只有一个大头针）。
   * 无观察的正常地点使用 institution_confirmed。
   */
  currentStatus: VerificationStatus;
  lastVerifiedAt: string;
  observationIds: string[];
}

export interface PostAuthor {
  id: string;
  name: string;
  role: SimulatedRole;
}

export interface Post {
  id: string;
  type: PostType;
  author: PostAuthor;
  title: string;
  content: string;
  /** 本地 SVG/图片素材路径，禁止使用必须联网的远程图片 */
  images: string[];
  tags: string[];
  /** 设施观察帖关联的地点与观察 */
  placeId?: string;
  observationId?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 用户、偏好、积分
// ---------------------------------------------------------------------------

/** 模拟身份：MVP 不做真实账号，通过身份切换演示志愿者与场所负责人 */
export type SimulatedRole = 'volunteer' | 'lead_volunteer' | 'institution';

export interface SimulatedIdentity {
  userId: string;
  name: string;
  role: SimulatedRole;
}

export interface UserPreferences {
  // 导航偏好
  avoidStairs: boolean;
  needsRamp: boolean;
  needsElevator: boolean;
  needsAccessibleRestroom: boolean;
  needsTactilePaving: boolean;
  // 显示与播报偏好（无障碍能力默认生效，不是“无障碍模式”开关）
  largeText: boolean;
  highContrast: boolean;
  voiceGuidance: boolean;
  reducedMotion: boolean;
}

/** 上传页隐私开关；处理过程为模拟，文案必须诚实 */
export interface PrivacySettings {
  autoBlurFaces: boolean;
  stripExif: boolean;
}

export type PointReason =
  | 'observation_published'
  | 'verification_confirmed'
  | 'remediation_posted';

export interface PointRecord {
  id: string;
  userId: string;
  userName: string;
  delta: number;
  reason: PointReason;
  /** 积分变化说明，界面需展示“为什么加分” */
  detail: string;
  relatedObservationId?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 模拟导航
// ---------------------------------------------------------------------------

export interface RouteStep {
  id: string;
  /** 相对路线起点的累计距离（米） */
  atMeters: number;
  instruction: string;
  coordinates: GeoCoordinates;
  /** 风险点（如台阶），用于视觉 + 语音双重提示 */
  hazard?: string;
  accessibleAlternative?: string;
}

export interface DemoRoute {
  id: string;
  name: string;
  originPlaceId: string;
  destinationPlaceId: string;
  /** 预计演示秒数（20-30 秒） */
  durationSeconds: number;
  /** 模拟匀速移动速度，米/秒 */
  speedMps: number;
  totalMeters: number;
  steps: RouteStep[];
}

export type NavigationStatus = 'idle' | 'running' | 'paused' | 'finished';
export type NavigationViewMode = 'map' | 'ar';

export interface NavigationSessionState {
  status: NavigationStatus;
  routeId: string | null;
  view: NavigationViewMode;
  soundOn: boolean;
  /** 路线上的模拟行进米数，由导航页面按定时器推进 */
  traveledMeters: number;
  startedAt: string | null;
}

// ---------------------------------------------------------------------------
// 状态仓库接口（TEAM_PLAN.md 约定的共享接口）
// ---------------------------------------------------------------------------

export interface PublishObservationInput {
  placeId: string;
  photo: string;
  capturedAt: string;
  coordinates: GeoCoordinates;
  facilityType: FacilityType;
  issueType: IssueType;
  description: string;
  /** 成员 C 的确定性 AI 模拟结果，仓库只负责落库与状态初始化 */
  aiAnalysis: AiAnalysis;
}

export type VerifyResult =
  | { ok: true; status: VerificationStatus }
  | { ok: false; reason: 'already_voted' | 'not_found' | 'unavailable' };

/** 完整应用状态快照（localStorage 持久化对象） */
export interface AppData {
  places: Place[];
  posts: Post[];
  observations: Observation[];
  timeline: TimelineEvent[];
  pointRecords: PointRecord[];
  demoUsers: SimulatedIdentity[];
  currentUserId: string;
  preferences: UserPreferences;
  privacySettings: PrivacySettings;
  routes: DemoRoute[];
  navigation: NavigationSessionState;
}

/**
 * 共享 store 接口。所有功能只通过该 Hook 读写状态，不创建第二套 store。
 * 完整方法清单与 TEAM_PLAN.md 保持一致，只做加法、不做语义变更。
 */
export interface AppStore extends AppData {
  // 派生/便利选择器
  currentUser: SimulatedIdentity;
  getPlace: (placeId: string) => Place | undefined;
  getObservation: (observationId: string) => Observation | undefined;
  getObservationsForPlace: (placeId: string) => Observation[];
  getTimelineForPlace: (placeId: string) => TimelineEvent[];
  getUserPoints: (userId: string) => number;
  // 共享动作
  publishObservation: (input: PublishObservationInput) => Observation;
  verifyObservation: (
    observationId: string,
    vote: 'confirm' | 'dispute',
  ) => VerifyResult;
  addRemediationUpdate: (
    observationId: string,
    input: { message: string; photo?: string },
  ) => void;
  requestRecheck: (observationId: string) => void;
  startDemoRoute: (routeId?: string) => void;
  // 导航控制（成员 B 页面消费；状态在共享仓库以便跨页面）
  pauseNavigation: () => void;
  resumeNavigation: () => void;
  finishNavigation: () => void;
  setNavigationView: (view: NavigationViewMode) => void;
  toggleNavigationSound: () => void;
  advanceNavigation: (meters: number) => void;
  // 偏好、隐私与身份
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  updatePrivacySettings: (patch: Partial<PrivacySettings>) => void;
  switchUser: (userId: string) => void;
  // 恢复评委演示初始数据
  resetDemoData: () => void;
}
