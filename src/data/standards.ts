import type { StandardReference } from '../types';

/**
 * 标准条款原型示例库。
 * 注意：以下条款摘录为帮助演示的简化示例，界面统一标注
 * “原型示例，正式使用前需核对原文”，不得作为合规结论引用。
 */
export const STANDARD_REFERENCES: readonly StandardReference[] = [
  {
    id: 'std-ramp-passage',
    category: 'ramp',
    clauseCode: 'GB 50763-2012 4.4.5（示例）',
    title: '轮椅坡道通行空间',
    source: '《无障碍设计规范》GB 50763-2012（原型示例）',
    excerpt: '轮椅坡道通行范围内不应有障碍物，并应保持连续、平整与防滑。',
    isPrototypeSample: true,
  },
  {
    id: 'std-entrance',
    category: 'accessible_entrance',
    clauseCode: 'GB 50763-2012 3.3.2（示例）',
    title: '无障碍出入口',
    source: '《无障碍设计规范》GB 50763-2012（原型示例）',
    excerpt: '建筑基地应设置无障碍出入口，出入口地面应防滑、不积水，门内外宜有缓冲空间。',
    isPrototypeSample: true,
  },
  {
    id: 'std-tactile-continuity',
    category: 'tactile_paving',
    clauseCode: 'GB 50763-2012 4.6.3（示例）',
    title: '盲道连续性',
    source: '《无障碍设计规范》GB 50763-2012（原型示例）',
    excerpt: '盲道铺设应连续，应避开树木、电线杆、拉线、垃圾箱等障碍物，其他设施不得占用盲道。',
    isPrototypeSample: true,
  },
  {
    id: 'std-restroom',
    category: 'accessible_restroom',
    clauseCode: 'GB 50763-2012 3.9.1（示例）',
    title: '无障碍厕所',
    source: '《无障碍设计规范》GB 50763-2012（原型示例）',
    excerpt: '无障碍厕位应设置坐便器、安全抓杆和轮椅回旋空间，门宜向外开启或采用推拉门。',
    isPrototypeSample: true,
  },
  {
    id: 'std-elevator',
    category: 'elevator',
    clauseCode: 'GB 50763-2012 3.7.1（示例）',
    title: '无障碍电梯',
    source: '《无障碍设计规范》GB 50763-2012（原型示例）',
    excerpt: '轿厢深度、门洞宽度和呼梯按钮高度应满足乘轮椅者使用，轿厢内宜设扶手与镜子。',
    isPrototypeSample: true,
  },
  {
    id: 'std-parking',
    category: 'accessible_parking',
    clauseCode: 'GB 50763-2012 3.14.1（示例）',
    title: '无障碍停车位',
    source: '《无障碍设计规范》GB 50763-2012（原型示例）',
    excerpt: '无障碍停车位应靠近出入口，一侧应留宽度不小于 1.20m 的轮椅通道，不得被占用。',
    isPrototypeSample: true,
  },
  {
    id: 'std-signage',
    category: 'signage',
    clauseCode: 'GB 50763-2012 3.16.1（示例）',
    title: '无障碍标识',
    source: '《无障碍设计规范》GB 50763-2012（原型示例）',
    excerpt: '无障碍设施位置应设置醒目的国际通用无障碍标志，导向信息应连续并便于视障者获取。',
    isPrototypeSample: true,
  },
] as const;

export function findStandard(id: string): StandardReference {
  const found = STANDARD_REFERENCES.find((item) => item.id === id);
  if (!found) {
    throw new Error(`未知标准条款 id: ${id}`);
  }
  return { ...found };
}
