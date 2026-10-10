import type { PostType } from '../../types';

/** 帖子类型文案 */
export interface PostTypeMeta {
  label: string;
  description: string;
}

export const POST_TYPE_META: Record<PostType, PostTypeMeta> = {
  facility: { label: '设施观察', description: '关联地图地点的无障碍设施现场记录' },
  article: { label: '无障碍科普', description: '标准与无障碍知识科普' },
  tool: { label: '工具', description: '实用辅助工具分享' },
  experience: { label: '生活经验', description: '无障碍出行与生活经验' },
};

/** 首页筛选项（全部 / 设施观察 / 科普 / 工具） */
export type PostFilterValue = 'all' | PostType;

export const POST_FILTERS: readonly { value: PostFilterValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'facility', label: '设施观察' },
  { value: 'article', label: '科普' },
  { value: 'tool', label: '工具' },
] as const;
