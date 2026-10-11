import { STATUS_META } from '../../app/config';
import { STANDARD_REFERENCES } from '../../data/standards';
import type { AppStore } from '../../types';
import type { AiGroundingSource, GroundedAiAnswer } from './types';

export const PRESET_QUESTIONS = [
  '工学院入口轮椅能进入吗？',
  '附近最近核验过的无障碍卫生间在哪里？',
  '坡道被占用应该使用什么标签和标准？',
] as const;

/** 从共享状态派生，不创建第二套持久化数据；发布、复核、整改后自动更新。 */
export function integrateLocalInformation(store: AppStore) {
  return store.places.map((place) => {
    const observations = store.observations.filter((item) => item.placeId === place.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const posts = store.posts.filter((post) => post.placeId === place.id);
    const disputed = observations.filter((item) => item.disputes.length > 0);
    const pending = observations.filter((item) => ['pending', 'remediation_pending', 'stale'].includes(item.verificationStatus));
    const latest = observations[0];
    return { place, observations, posts, disputed, pending, latest };
  });
}

export function buildGroundingSources(store: AppStore): AiGroundingSource[] {
  const places = integrateLocalInformation(store).map(({ place, observations, posts, disputed, pending, latest }) => {
    return {
      id: `place:${place.id}`,
      type: 'place' as const,
      entityId: place.id,
      title: place.name,
      updatedAt: latest?.createdAt ?? place.lastVerifiedAt,
      status: STATUS_META[place.currentStatus].label,
      excerpt: [
        `类别：${place.category}`,
        `无障碍设施：${place.accessibilityFeatures.join('、') || '暂无记录'}`,
        `本地自动整合：${observations.length} 条观察、${posts.length} 篇关联帖子；${pending.length} 条待处理；${disputed.length} 条存在异议（不自动裁决）`,
        `最近核验时间：${place.lastVerifiedAt || '暂无'}；最新上传不等于已核验`,
        '以当前地点档案名称为准；旧帖子可能使用历史名称，不得据此推断为同名地点；不同时间或设施的记录不可直接当作矛盾',
        ...observations.map((item) =>
          `观察 ${item.id}，${item.createdAt}，设施 ${item.facilityType}，问题 ${item.issueType}：${item.description}；核验状态：${STATUS_META[item.verificationStatus].label}；独立确认 ${item.confirmations.length}，异议 ${item.disputes.length}；整改记录：${JSON.stringify(item.remediationUpdates.map(({ createdAt, message, statusAfter }) => ({ createdAt, message, statusAfter })))}`,
        ),
      ].join('；'),
    };
  });
  const posts = store.posts.map((post) => ({
    id: `post:${post.id}`,
    type: 'post' as const,
    entityId: post.id,
    title: post.title,
    updatedAt: post.createdAt,
    status: post.observationId
      ? STATUS_META[store.getObservation(post.observationId)?.verificationStatus ?? 'pending'].label
      : undefined,
    excerpt: `${post.placeId ? `关联地点：${store.places.find((place) => place.id === post.placeId)?.name ?? '未知'}；` : ''}${post.content}；标签：${post.tags.join('、')}`,
  }));
  const standards = STANDARD_REFERENCES.map((standard) => ({
    id: `standard:${standard.id}`,
    type: 'standard' as const,
    entityId: standard.id,
    title: `${standard.title}（原型示例）`,
    updatedAt: '',
    status: '正式使用前需核对原文',
    excerpt: `${standard.clauseCode}；${standard.source}；${standard.excerpt}`,
  }));
  return [...places, ...posts, ...standards];
}

function hasAny(question: string, words: string[]): boolean {
  return words.some((word) => question.includes(word));
}

/** DeepSeek 不可用时保持核心演示可运行；回答仍由同一批本地证据生成。 */
export function buildLocalFallback(question: string, sources: AiGroundingSource[]): GroundedAiAnswer {
  const find = (id: string) => sources.find((source) => source.id === id);
  let selected: AiGroundingSource[];
  let summary: string;
  let details: string[];

  if (hasAny(question, ['工学院', '图书馆', '东门', '轮椅', '进入'])) {
    selected = [find('place:place-library-east'), find('post:post-facility-ramp')].filter(Boolean) as AiGroundingSource[];
    summary = `${selected[0]?.title ?? '该地点'}当前记录状态为“${selected[0]?.status ?? '未知'}”；不能仅凭演示数据保证轮椅可顺畅进入。`;
    details = ['建议先查看最新核验时间，再选择其他无障碍入口或请求附近志愿者复核。'];
  } else if (hasAny(question, ['卫生间', '厕所', '洗手间'])) {
    selected = [find('place:place-teaching-3'), find('standard:std-restroom')].filter(Boolean) as AiGroundingSource[];
    summary = `本地数据中第三教学楼记录有无障碍卫生间，当前状态为“${selected[0]?.status ?? '未知'}”。`;
    details = ['缺少当前定位，无法判断“附近最近”；到达前应查看最近核验时间。标准条款为原型示例，不能作为正式合规结论。'];
  } else if (hasAny(question, ['坡道', '标签', '标准', '占用'])) {
    selected = [find('standard:std-ramp-passage'), find('post:post-facility-ramp')].filter(Boolean) as AiGroundingSource[];
    summary = '可使用“坡道、通道占用、需要复核”等标签，并关联轮椅坡道通行空间的原型条款。';
    details = ['AI 标签只用于辅助整理，现场情况和正式标准原文仍需人工复核。'];
  } else {
    selected = sources.filter((source) => source.type === 'place').slice(0, 3);
    summary = '本地资料不足以给出确定结论，以下列出最相关的地点档案供继续核验。';
    details = ['请补充地点名称、需要的设施类型或出行偏好，以缩小检索范围。'];
  }
  return {
    summary,
    details,
    sourceIds: selected.map((source) => source.id),
    generatedAt: new Date().toISOString(),
    mode: 'local_fallback',
  };
}
