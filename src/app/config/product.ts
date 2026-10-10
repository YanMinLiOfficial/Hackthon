/**
 * 产品级集中配置。产品名、模拟标注文案只在此维护，
 * 页面中禁止硬编码产品名或“AI 分析”等可能误导为真实能力的措辞。
 */

export const PRODUCT = {
  name: '无碍共创',
  tagline: '无障碍设施观察社区',
  /** 全局原型徽标文案 */
  prototypeBadge: '原型演示 · 本地模拟数据',
} as const;

/** 所有模拟能力的统一标注，界面必须原样展示 */
export const SIMULATION_LABELS = {
  aiAnalysis: 'AI 模拟分析 · 原型数据',
  aiQa: 'AI 模拟问答 · 原型数据',
  navigation: '模拟导航 · 预设路线',
  privacy: '本地模拟处理，不上传图片',
  /** “请求附近志愿者复核”等本地状态变化 */
  localNotification: '本地模拟通知，不会真实发送',
  /** 标准条款统一免责声明 */
  standards: '原型示例，正式使用前需核对原文',
} as const;

export const AI_DISCLAIMER = 'AI 结果仅供辅助，须由志愿者现场复核，不作为权威合规结论。';

/**
 * 高德 JS API Key 预留入口（在 .env.local 配置 VITE_AMAP_API_KEY）。
 * MVP 不联网：未配置时地图适配器自动使用本地 SVG 校园地图。
 */
export const AMAP_API_KEY: string = import.meta.env.VITE_AMAP_API_KEY?.trim() ?? '';

export const MAP_PROVIDER: 'local-svg' | 'amap' = AMAP_API_KEY ? 'amap' : 'local-svg';
