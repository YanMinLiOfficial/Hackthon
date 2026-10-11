import { Link, useParams } from 'react-router-dom';
import {
  AI_DISCLAIMER,
  FACILITY_META,
  ISSUE_META,
  SIMULATION_LABELS,
  STATUS_META,
  isStale,
} from '../../../app/config';
import type { Observation, TimelineEvent } from '../../../types';
import { useAppStore } from '../../../store';
import { StatusBadge } from '../components/StatusBadge';
import { ObservationReview } from '../components/ObservationReview';
import { formatConfidence, formatDateTime, formatDate, ROLE_LABELS } from '../format';

function ObservationCard({ observation }: { observation: Observation }) {
  return (
    <article className="observation-card">
      <div className="observation-card__media">
        {observation.photo ? (
          <img src={observation.photo} alt={observation.description} />
        ) : (
          <div className="post-card__no-image" style={{ aspectRatio: '3 / 2' }}>
            该观察暂无照片
          </div>
        )}
        <StatusBadge status={observation.verificationStatus} />
      </div>
      <div className="observation-card__body">
        {observation.photo.includes('generated-') && <p className="journey-footnote">AI 生成演示图，非现场采集照片；图中设施不代表实际地点状态或标准合规结论。</p>}
        <p>{observation.description}</p>
        <dl className="observation-card__meta">
          <dt>设施类型</dt>
          <dd>{FACILITY_META[observation.facilityType].label}</dd>
          <dt>问题情况</dt>
          <dd>{ISSUE_META[observation.issueType]}</dd>
          <dt>拍摄时间</dt>
          <dd>
            <time dateTime={observation.capturedAt}>
              {formatDateTime(observation.capturedAt)}
            </time>
          </dd>
          <dt>发布人</dt>
          <dd>
            {observation.reporterName} · {formatDateTime(observation.createdAt)}
          </dd>
        </dl>

        <div className="post-card__tags" aria-label="标准标签">
          {observation.standardTags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        <p className="ai-note">
          <span>{SIMULATION_LABELS.aiAnalysis} · 置信度 {formatConfidence(observation.aiConfidence)}</span>
          <span>{AI_DISCLAIMER}</span>
        </p>

        {observation.standardReferences.map((ref) => (
          <div className="standard-box" key={ref.id}>
            <span className="standard-box__code">
              {ref.clauseCode} · {ref.title}
            </span>
            <span>{ref.excerpt}</span>
            <span className="standard-box__sample">
              来源：{ref.source}（{SIMULATION_LABELS.standards}）
            </span>
          </div>
        ))}

        <ObservationReview observation={observation} />
      </div>
    </article>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  return (
    <li className="timeline__item">
      <p>{event.message}</p>
      <p className="timeline__meta">
        <span className="timeline__role">
          {ROLE_LABELS[event.actorRole]} · {event.actorName}
        </span>
        <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
        {event.statusAfter && (
          <span>→ {STATUS_META[event.statusAfter].label}</span>
        )}
      </p>
    </li>
  );
}

/**
 * 地点详情（项目负责人所有）：地点档案 + 该地点全部观察（多次观察即时间线，
 * 绝不生成重复大头针）+ 状态变化时间线。
 */
export function PlaceDetailPage() {
  const { placeId } = useParams<{ placeId: string }>();
  const store = useAppStore();

  if (!placeId) {
    return (
      <p className="empty-note">
        未指定地点。<Link to="/">返回首页</Link>
      </p>
    );
  }

  const place = store.getPlace(placeId);
  if (!place) {
    return (
      <section className="placeholder">
        <h2 className="placeholder__title">找不到该地点</h2>
        <p className="placeholder__note">
          地点可能已被重置演示数据移除。请从
          <Link to="/map">地图</Link>或<Link to="/">首页</Link>重新进入。
        </p>
      </section>
    );
  }

  const observations = store.getObservationsForPlace(placeId);
  const timeline = store.getTimelineForPlace(placeId);
  const stale = isStale(place.lastVerifiedAt);

  return (
    <section aria-labelledby="place-heading">
      <nav className="detail-back-row" aria-label="返回路径">
        <Link className="ghost-button" to={`/map?placeId=${place.id}`}>
          ← 返回地图
        </Link>
        <Link className="ghost-button" to="/">
          返回首页
        </Link>
      </nav>

      <header className="detail-header">
        <div className="detail-header__title-row">
          <h2 id="place-heading" className="detail-header__title">
            {place.name}
          </h2>
          <StatusBadge status={place.currentStatus} />
        </div>
        <p className="detail-header__category">地点类别：{place.category}</p>
        <div className="detail-header__features" aria-label="无障碍设施">
          {place.accessibilityFeatures.map((feature) => (
            <span className="feature-chip" key={feature}>
              {feature}
            </span>
          ))}
        </div>
        <p className="detail-header__verified">
          最近核验：<time dateTime={place.lastVerifiedAt}>{formatDate(place.lastVerifiedAt)}</time>
          {stale && ' · 距上次核验较久，信息可能过期，建议请求附近志愿者复核'}
        </p>
      </header>

      {place.sceneImage && <figure className="place-scene">
        <img src={place.sceneImage} alt="书院入口及坡道的 AI 场景示意，非该地点实拍" decoding="async" />
        <figcaption>AI 生成 · 地点场景示意，非{place.name}实拍，不代表设施状态或核验记录。</figcaption>
      </figure>}

      <section className="section-block" aria-labelledby="observations-heading">
        <h3 id="observations-heading" className="section-block__title">
          现场观察（{observations.length}）
        </h3>
        {observations.length === 0 ? (
          <p className="empty-note">该地点暂无观察记录。</p>
        ) : (
          observations.map((observation) => (
            <ObservationCard key={observation.id} observation={observation} />
          ))
        )}
      </section>

      <section className="section-block" aria-labelledby="timeline-heading">
        <h3 id="timeline-heading" className="section-block__title">
          地点时间线
        </h3>
        {timeline.length === 0 ? (
          <p className="empty-note">暂无状态变化记录。</p>
        ) : (
          <ol className="timeline">
            {timeline.map((event) => (
              <TimelineRow key={event.id} event={event} />
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
