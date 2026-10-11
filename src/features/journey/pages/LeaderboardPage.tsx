import { Link } from 'react-router-dom';
import { useAppStore } from '../../../store';
import { selectLeaderboard } from '../leaderboard';

export function LeaderboardPage() {
  const store = useAppStore();
  const entries = selectLeaderboard(store);
  const mine = entries.find((entry) => entry.userId === store.currentUser.userId);
  return (
    <section className="contribution-page" aria-labelledby="leaderboard-title">
      <header className="journey-section-head"><h2 id="leaderboard-title">共创贡献榜</h2><p className="journey-section-head__hint">每一条观察、每一次独立复核，都让出行信息更可靠。</p></header>
      <div className="contribution-summary"><span>我的累计贡献积分</span><strong>{mine?.points ?? 0} <small>分</small></strong><p>{mine ? `志愿者榜第 ${mine.rank} 名` : '场所负责人不参与志愿者排名'}</p><Link to="/me">查看我的积分明细 →</Link><Link to="/points-shop">积分商店 · 去兑换 →</Link></div>
      <p className="journey-footnote">本机演示积分 · 按累计积分排名，同分并列；不代表认证志愿时长。</p>
      <div className="leaderboard-list" role="list" aria-label="志愿者累计积分排名">
        {entries.map((entry) => <div role="listitem" key={entry.userId} className={`leaderboard-row${entry.userId === store.currentUser.userId ? ' is-current' : ''}`}>
          <span className="leaderboard-rank" aria-label={`第 ${entry.rank} 名`}>{entry.rank}</span>
          <span className="post-card__avatar" aria-hidden="true">{entry.name.slice(0, 1)}</span>
          <span className="leaderboard-name">{entry.name}{entry.userId === store.currentUser.userId && <small>（我）</small>}</span>
          <strong>{entry.points} <small>分</small></strong>
        </div>)}
        {entries.length === 0 && <p>暂无志愿者贡献记录。</p>}
      </div>
    </section>
  );
}
