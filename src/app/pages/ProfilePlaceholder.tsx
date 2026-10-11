import { Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { POINT_RULES } from '../config';
import { selectLeaderboard } from '../../features/journey/leaderboard';

const ROLE_LABELS: Record<string, string> = {
  disabled_person: '残障人士',
  volunteer: '志愿者',
  lead_volunteer: '志愿者',
  institution: '官方人士',
};

/** 个人积分、显示偏好与模拟身份管理。 */
export function ProfilePlaceholder() {
  const store = useAppStore();
  const records = store.pointRecords.filter((record) => record.userId === store.currentUser.userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const contribution = selectLeaderboard(store).find((entry) => entry.userId === store.currentUser.userId);
  const rank = contribution?.rank;
  const myPostCount = store.posts.filter((post) => post.author.id === store.currentUser.userId).length;

  return (
    <section className="contribution-page" aria-labelledby="profile-title">
      <header className="journey-section-head"><h2 id="profile-title">我的</h2><p className="journey-section-head__hint">{store.currentUser.name} · {ROLE_LABELS[store.currentUser.role]}</p></header>
      <Link className="my-posts-entry" to="/me/posts"><span><strong>我的帖子</strong><small>查看自己发布的内容，管理或删除帖子</small></span><span>{myPostCount} 篇 →</span></Link>
      <div className="contribution-summary" aria-live="polite"><span>我的可用积分</span><strong>{store.getUserPoints(store.currentUser.userId)} <small>分</small></strong><p>累计贡献 {contribution?.points ?? 0} 分 · {rank ? `共创贡献榜第 ${rank} 名` : '场所负责人不参与志愿者排名'}</p><Link to="/leaderboard">查看贡献排行榜 →</Link><Link to="/points-shop">积分商店 · 去兑换 →</Link></div>
      <section className="points-history" aria-labelledby="points-title"><h3 id="points-title">积分明细</h3>
        {records.length ? <ul>{records.map((record) => <li key={record.id}><div><strong>{POINT_RULES[record.reason]?.label ?? '贡献记录'}</strong><p>{record.detail}</p><time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString('zh-CN')}</time></div><strong className="points-delta">{record.delta > 0 ? '+' : ''}{record.delta} 分</strong></li>)}</ul> : <p className="journey-footnote">还没有积分记录，发布设施观察或完成独立复核后，会在这里显示。</p>}
        <p className="journey-footnote">本机演示积分，不代表认证志愿时长。</p>
      </section>
      <fieldset className="placeholder__tools"><legend>显示设置</legend><div className="profile-settings">{([
        ['largeText', '大字显示'], ['highContrast', '高对比度'], ['reducedMotion', '减少动画'],
        ['speechAssistance', '语音辅助（AI 回答朗读）'],
      ] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={store.preferences[key]} onChange={(event) => store.updatePreferences({ [key]: event.target.checked })} />{label}</label>)}</div></fieldset>
      <fieldset className="placeholder__tools">
        <legend>身份切换（本地模拟，非真实账号）</legend>
        <p>选择残障人士、志愿者或官方人士；求助入口和操作权限会随身份自动变化。</p>
        <div className="segmented" role="group" aria-label="选择当前模拟身份">
          {store.demoUsers.map((user) => (
            <button
              key={user.userId}
              type="button"
              className={
                user.userId === store.currentUser.userId
                  ? 'segmented__btn is-active'
                  : 'segmented__btn'
              }
              aria-pressed={user.userId === store.currentUser.userId}
              onClick={() => store.switchUser(user.userId)}
            >
              {user.name}
              <span className="segmented__role">{ROLE_LABELS[user.role] ?? user.role}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="reset-button"
        onClick={() => {
          store.resetDemoData();
        }}
      >
        重置为评委演示初始数据
      </button>
      <p className="placeholder__hint">重置只影响本机 localStorage，不发送任何网络请求。</p>
    </section>
  );
}
