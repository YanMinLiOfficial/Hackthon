import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  AppStore,
  Observation,
  Place,
  PointRecord,
  SimulatedIdentity,
  TimelineEvent,
  VerificationStatus,
  VerifyResult,
} from '../types';
import { buildSeedData } from '../data';
import { migrateStoredData } from './migrate';
import { resolveObservationPlace } from './observationPlaces';
import { createLocalHelp, transitionLocalHelp } from './helpRequests';
import { applyRewardRedemption } from './rewards';
import { getVerificationBlock } from './verification';
import { appendPostComment, COMMENT_MAX_LENGTH, togglePostLike } from './postInteractions';
import { deleteOwnedPost } from './deletePost';
import {
  FACILITY_META,
  ISSUE_META,
  POINT_RULES,
  SIMULATION_LABELS,
  STORAGE_KEY,
  STORAGE_VERSION,
  VERIFICATION_REQUIRED_CONFIRMATIONS,
} from '../app/config';

/**
 * 唯一共享状态仓库（TEAM_PLAN.md 约定）。
 * 成员 A/B/C 只通过 useAppStore() 读写数据，不创建第二套 store。
 * 持久化：localStorage 单键保存 AppData；解析失败自动回退种子数据。
 */

const StoreContext = createContext<AppStore | null>(null);

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadInitialData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      return migrateStoredData(parsed, buildSeedData());
    }
  } catch {
    // 隐私模式 / 脏数据：回退种子数据，保证演示不白屏
  }
  return buildSeedData();
}

/** 地点状态聚合：一个地点多条观察时，优先展示最需要处理的状态 */
const STATUS_RANK: Record<VerificationStatus, number> = {
  pending: 0,
  remediation_pending: 1,
  stale: 2,
  community_verified: 3,
  institution_confirmed: 4,
  resolved: 5,
};

function derivePlaceStatus(observations: Observation[]): VerificationStatus {
  if (observations.length === 0) {
    return 'institution_confirmed';
  }
  return observations.reduce<VerificationStatus>((acc, obs) =>
    STATUS_RANK[obs.verificationStatus] < STATUS_RANK[acc]
      ? obs.verificationStatus
      : acc,
  'resolved');
}

function deriveLastVerifiedAt(observations: Observation[], fallback: string): string {
  const times = observations.flatMap((obs) =>
    obs.confirmations.map((vote) => vote.createdAt),
  );
  const latest = times.reduce<string | null>(
    (acc, iso) => (acc === null || Date.parse(iso) > Date.parse(acc) ? iso : acc),
    null,
  );
  return latest ?? fallback;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadInitialData);

  // 持久化：任意状态变化都写回 localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, schemaVersion: STORAGE_VERSION }));
    } catch {
      // 配额/隐私模式下静默降级为内存态
    }
  }, [data]);

  // 无障碍偏好同步到 <html data-*>，主题 CSS 据此切换
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.largeText = String(data.preferences.largeText);
    root.dataset.highContrast = String(data.preferences.highContrast);
    root.dataset.reducedMotion = String(data.preferences.reducedMotion);
  }, [
    data.preferences.largeText,
    data.preferences.highContrast,
    data.preferences.reducedMotion,
  ]);

  const store = useMemo<AppStore>(() => {
    const currentUser: SimulatedIdentity =
      data.demoUsers.find((user) => user.userId === data.currentUserId) ??
      data.demoUsers[0];

    const getPlace = (placeId: string): Place | undefined =>
      data.places.find((place) => place.id === placeId);

    const getObservation = (observationId: string): Observation | undefined =>
      data.observations.find((obs) => obs.id === observationId);

    const getObservationsForPlace = (placeId: string): Observation[] =>
      data.observations
        .filter((obs) => obs.placeId === placeId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    const getTimelineForPlace = (placeId: string): TimelineEvent[] =>
      data.timeline
        .filter((event) => event.placeId === placeId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    const getUserPoints = (userId: string): number =>
      data.pointRecords
        .filter((record) => record.userId === userId)
        .reduce((sum, record) => sum + record.delta, 0);

    const pushPointRecord = (
      records: PointRecord[],
      userId: string,
      userName: string,
      reason: PointRecord['reason'],
      observationId: string,
    ): void => {
      const rule = POINT_RULES[reason];
      if (rule.delta <= 0) {
        return;
      }
      records.push({
        id: uid('pt'),
        userId,
        userName,
        delta: rule.delta,
        reason,
        detail: rule.detail,
        relatedObservationId: observationId,
        createdAt: new Date().toISOString(),
      });
    };

    const refreshPlace = (
      places: Place[],
      placeId: string,
      allObservations: Observation[],
    ): void => {
      const place = places.find((item) => item.id === placeId);
      if (!place) {
        return;
      }
      const linked = allObservations.filter((obs) => obs.placeId === placeId);
      place.currentStatus = derivePlaceStatus(linked);
      place.lastVerifiedAt = deriveLastVerifiedAt(linked, place.lastVerifiedAt);
      place.observationIds = linked.map((obs) => obs.id);
    };

    const publishObservation: AppStore['publishObservation'] = (input) => {
      const now = new Date().toISOString();
      const place = resolveObservationPlace(data.places, input, uid('place'));
      const facilityLabel = FACILITY_META[input.facilityType].short;
      const issueLabel = ISSUE_META[input.issueType];

      const observation: Observation = {
        id: uid('obs'),
        placeId: place.id,
        photo: input.photo,
        capturedAt: input.capturedAt,
        coordinates: input.coordinates,
        facilityType: input.facilityType,
        issueType: input.issueType,
        description: input.description,
        standardTags: [...input.aiAnalysis.suggestedTags],
        standardReferences: input.aiAnalysis.standardReferences.map((ref) => ({ ...ref })),
        aiConfidence: input.aiAnalysis.confidence,
        verificationStatus: 'pending',
        reporterId: currentUser.userId,
        reporterName: currentUser.name,
        createdAt: now,
        confirmations: [],
        disputes: [],
        remediationUpdates: [],
      };

      const postTitle =
        input.issueType === 'available'
          ? `${place?.name ?? '地点'} · ${facilityLabel}正常可用`
          : `${place?.name ?? '地点'} · ${facilityLabel}${issueLabel}`;

      setData((prev) => {
        const next = structuredClone(prev);
        if (!next.places.some((item) => item.id === place.id)) next.places.push(structuredClone(place));
        const obs = { ...observation, id: observation.id } as Observation;
        next.observations.unshift(obs);

        next.posts.unshift({
          id: uid('post'),
          type: 'facility',
          author: {
            id: currentUser.userId,
            name: currentUser.name,
            role: currentUser.role,
          },
          title: postTitle,
          content: `${input.description}（${SIMULATION_LABELS.aiAnalysis}，结果仅供辅助，须由志愿者复核。）`,
          images: [input.photo],
          tags: obs.standardTags,
          placeId: place.id,
          observationId: obs.id,
          createdAt: now,
        });
        obs.postId = next.posts[0].id;

        next.timeline.unshift({
          id: uid('tl'),
          placeId: place.id,
          observationId: obs.id,
          type: 'observation_published',
          actorId: currentUser.userId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          message: `发布设施观察：${postTitle}`,
          statusAfter: 'pending',
          createdAt: now,
        });

        pushPointRecord(
          next.pointRecords,
          currentUser.userId,
          currentUser.name,
          'observation_published',
          obs.id,
        );
        refreshPlace(
          next.places,
          place.id,
          next.observations,
        );
        return next;
      });

      return observation;
    };

    const verifyObservation: AppStore['verifyObservation'] = (observationId, vote) => {
      const observation = data.observations.find((obs) => obs.id === observationId);
      if (!observation) {
        return { ok: false, reason: 'not_found' };
      }
      if (
        currentUser.role === 'institution' ||
        !['pending', 'community_verified', 'stale'].includes(observation.verificationStatus)
      ) {
        return { ok: false, reason: 'unavailable' };
      }
      const alreadyVoted =
        observation.confirmations.some((v) => v.userId === currentUser.userId) ||
        observation.disputes.some((v) => v.userId === currentUser.userId) ||
        observation.reporterId === currentUser.userId;
      if (alreadyVoted) {
        return { ok: false, reason: 'already_voted' };
      }

      // 纯计算本次投票后是否达到复核条件（setData 更新函数不保证同步执行，
      // 返回值不能依赖在更新函数中赋值）
      const willPromote =
        vote === 'confirm' &&
        ['pending', 'stale'].includes(observation.verificationStatus) &&
        observation.confirmations.length + 1 >= VERIFICATION_REQUIRED_CONFIRMATIONS;
      const resultStatus: VerificationStatus = willPromote
        ? 'community_verified'
        : observation.verificationStatus;

      setData((prev) => {
        const next = structuredClone(prev);
        const obs = next.observations.find((item) => item.id === observationId);
        if (!obs || getVerificationBlock(obs, currentUser)) {
          return prev;
        }
        const promote = vote === 'confirm' && ['pending', 'stale'].includes(obs.verificationStatus) &&
          obs.confirmations.length + 1 >= VERIFICATION_REQUIRED_CONFIRMATIONS;
        const now = new Date().toISOString();
        const voteRecord = {
          userId: currentUser.userId,
          userName: currentUser.name,
          vote,
          createdAt: now,
        };
        if (vote === 'confirm') {
          obs.confirmations.push(voteRecord);
        } else {
          obs.disputes.push(voteRecord);
        }

        next.timeline.unshift({
          id: uid('tl'),
          placeId: obs.placeId,
          observationId: obs.id,
          type: 'verified',
          actorId: currentUser.userId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          message:
            vote === 'confirm'
              ? `志愿者现场复核：与发布信息一致（确认 ${obs.confirmations.length}/${VERIFICATION_REQUIRED_CONFIRMATIONS}）`
              : '志愿者现场复核：信息有误，已记录异议',
          createdAt: now,
        });

        if (promote) {
          obs.verificationStatus = 'community_verified';
          next.timeline.unshift({
            id: uid('tl'),
            placeId: obs.placeId,
            observationId: obs.id,
            type: 'status_changed',
            actorId: currentUser.userId,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            message: `达到 ${VERIFICATION_REQUIRED_CONFIRMATIONS} 名不同志愿者独立确认，更新为“社区已复核”`,
            statusAfter: 'community_verified',
            createdAt: now,
          });
        }

        if (vote === 'confirm') {
          pushPointRecord(
            next.pointRecords,
            currentUser.userId,
            currentUser.name,
            'verification_confirmed',
            obs.id,
          );
        }
        refreshPlace(next.places, obs.placeId, next.observations);
        return next;
      });

      return { ok: true, status: resultStatus };
    };

    const addRemediationUpdate: AppStore['addRemediationUpdate'] = (
      observationId,
      input,
    ) => {
      if (currentUser.role !== 'institution') {
        // 只有模拟“场所负责人”身份可提交整改；界面需先切换身份
        return;
      }
      const observation = data.observations.find((obs) => obs.id === observationId);
      if (!observation) {
        return;
      }
      setData((prev) => {
        const next = structuredClone(prev);
        const obs = next.observations.find((item) => item.id === observationId);
        if (!obs) {
          return prev;
        }
        const now = new Date().toISOString();
        obs.remediationUpdates.push({
          id: uid('rm'),
          observationId: obs.id,
          authorId: currentUser.userId,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          message: input.message,
          photo: input.photo,
          statusAfter: 'remediation_pending',
          createdAt: now,
        });
        obs.verificationStatus = 'remediation_pending';
        next.timeline.unshift({
          id: uid('tl'),
          placeId: obs.placeId,
          observationId: obs.id,
          type: 'remediation',
          actorId: currentUser.userId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          message: `场所负责人提交整改反馈：${input.message}`,
          statusAfter: 'remediation_pending',
          createdAt: now,
        });
        refreshPlace(next.places, obs.placeId, next.observations);
        return next;
      });
    };

    const requestRecheck: AppStore['requestRecheck'] = (observationId) => {
      const observation = data.observations.find((obs) => obs.id === observationId);
      if (!observation) {
        return;
      }
      setData((prev) => {
        const next = structuredClone(prev);
        next.timeline.unshift({
          id: uid('tl'),
          placeId: observation.placeId,
          observationId: observation.id,
          type: 'recheck_requested',
          actorId: currentUser.userId,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          message: `请求附近志愿者现场复核（${SIMULATION_LABELS.localNotification}）`,
          createdAt: new Date().toISOString(),
        });
        return next;
      });
    };

    const startDemoRoute: AppStore['startDemoRoute'] = (routeId) => {
      setData((prev) => {
        const target =
          prev.routes.find((route) => route.id === routeId) ?? prev.routes[0];
        if (!target) {
          return prev;
        }
        return {
          ...prev,
          navigation: {
            status: 'running',
            routeId: target.id,
            view: 'map',
            soundOn: prev.navigation.soundOn,
            traveledMeters: 0,
            startedAt: new Date().toISOString(),
          },
        };
      });
    };

    const updateNavigation = (
      patch: Partial<AppData['navigation']>,
    ): void => {
      setData((prev) => ({ ...prev, navigation: { ...prev.navigation, ...patch } }));
    };

    const updatePreferences: AppStore['updatePreferences'] = (patch) => {
      setData((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, ...patch },
      }));
    };

    const updatePrivacySettings: AppStore['updatePrivacySettings'] = (patch) => {
      setData((prev) => ({
        ...prev,
        privacySettings: { ...prev.privacySettings, ...patch },
      }));
    };

    const switchUser: AppStore['switchUser'] = (userId) => {
      setData((prev) =>
        prev.demoUsers.some((user) => user.userId === userId)
          ? { ...prev, currentUserId: userId }
          : prev,
      );
    };

    const resetDemoData: AppStore['resetDemoData'] = () => {
      setData(buildSeedData());
    };

    return {
      ...data,
      currentUser,
      getPlace,
      getObservation,
      getObservationsForPlace,
      getTimelineForPlace,
      getUserPoints,
      redeemReward: (rewardId) => {
        const id = uid('reward');
        const createdAt = new Date().toISOString();
        setData((prev) => applyRewardRedemption(prev, rewardId, id, createdAt));
      },
      publishObservation,
      deletePost: (postId) => {
        if (!data.posts.some((post) => post.id === postId && post.author.id === currentUser.userId)) return false;
        setData((prev) => deleteOwnedPost(prev, postId));
        return true;
      },
      togglePostLike: (postId) => setData((prev) => togglePostLike(prev, postId, currentUser.userId)),
      addPostComment: (postId, content) => {
        const trimmed = content.trim();
        if (!trimmed || trimmed.length > COMMENT_MAX_LENGTH || !data.posts.some((post) => post.id === postId)) return false;
        const comment = { id: uid('comment'), content: trimmed,
          author: { id: currentUser.userId, name: currentUser.name, role: currentUser.role },
          createdAt: new Date().toISOString() };
        setData((prev) => appendPostComment(prev, postId, comment));
        return true;
      },
      publishCommunityPost: (input) => {
        const post = { ...input, id: uid('post'), author: { id: currentUser.userId, name: currentUser.name, role: currentUser.role }, createdAt: new Date().toISOString() };
        setData((prev) => ({ ...prev, posts: [post, ...prev.posts] }));
        return post;
      },
      verifyObservation,
      addRemediationUpdate,
      requestRecheck,
      startDemoRoute,
      pauseNavigation: () =>
        data.navigation.status === 'running' && updateNavigation({ status: 'paused' }),
      resumeNavigation: () =>
        data.navigation.status === 'paused' && updateNavigation({ status: 'running' }),
      finishNavigation: () => updateNavigation({ status: 'finished' }),
      setNavigationView: (view) => updateNavigation({ view }),
      toggleNavigationSound: () =>
        updateNavigation({ soundOn: !data.navigation.soundOn }),
      advanceNavigation: (meters) => {
        const route = data.routes.find((item) => item.id === data.navigation.routeId);
        if (!route || data.navigation.status !== 'running') {
          return;
        }
        const traveled = Math.min(
          Math.max(0, data.navigation.traveledMeters + meters),
          route.totalMeters,
        );
        updateNavigation({
          traveledMeters: traveled,
          status: traveled >= route.totalMeters ? 'finished' : 'running',
        });
      },
      updatePreferences,
      createHelpRequest: (placeId, need, message) => setData((prev) => createLocalHelp(prev,
        { id: uid('help'), placeId, need, message, now: new Date().toISOString() })),
      updateHelpRequest: (id, action) => setData((prev) => transitionLocalHelp(prev, id, action, new Date().toISOString())),
      updatePrivacySettings,
      switchUser,
      resetDemoData,
    };
  }, [data]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useAppStore 必须在 <AppStoreProvider> 内使用');
  }
  return store;
}

export type { VerifyResult };
