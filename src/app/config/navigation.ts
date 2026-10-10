/** 底部导航集中配置（首页是默认入口；地图是核心频道但不是首页） */

export type NavIcon = 'home' | 'map' | 'publish' | 'ai' | 'me';

export interface NavItem {
  path: string;
  label: string;
  icon: NavIcon;
  /** NavLink 首页精确高亮 */
  end?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: '首页', icon: 'home', end: true },
  { path: '/map', label: '地图', icon: 'map' },
  { path: '/publish', label: '发布', icon: 'publish' },
  { path: '/ask-ai', label: '问 AI', icon: 'ai' },
  { path: '/me', label: '我的', icon: 'me' },
] as const;
