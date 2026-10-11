import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../../store';
import { REWARDS } from '../../../app/config/rewards';

export function PointsShopPage() {
  const store = useAppStore();
  const [category, setCategory] = useState('全部');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const confirmationRef = useRef<HTMLElement>(null);
  useEffect(() => { if (selectedId) confirmationRef.current?.focus(); }, [selectedId]);
  const balance = store.getUserPoints(store.currentUser.userId);
  const orders = store.redemptions.filter((item) => item.userId === store.currentUser.userId);
  const selected = REWARDS.find((item) => item.id === selectedId);
  const unavailable = (id: string, cost: number) => store.currentUser.role === 'institution' || balance < cost || orders.some((item) => item.rewardId === id);

  return <section className="contribution-page" aria-labelledby="shop-title">
    <header className="journey-section-head"><h2 id="shop-title">积分商店</h2><p className="journey-section-head__hint">让日常贡献，变成更有温度的回馈。</p></header>
    <div className="contribution-summary" aria-live="polite"><span>{store.currentUser.name} · 可用积分</span><strong>{balance} <small>分</small></strong><p>兑换仅扣除可用积分，不影响累计贡献排名。</p><Link to="/me">积分明细 →</Link></div>
    <p className="journey-footnote">模拟积分商店：不收集地址、不真实发货、不发放认证时长。每种奖励每位用户限演示兑换一次。</p>
    <div className="segmented" role="group" aria-label="奖励分类">{['全部', '书籍', '周边', '志愿时长'].map((label) => <button key={label} type="button" className={`segmented__btn${category === label ? ' is-active' : ''}`} aria-pressed={category === label} onClick={() => { setCategory(label); setSelectedId(null); }}>{label}</button>)}</div>
    <div className="reward-grid">{REWARDS.filter((item) => category === '全部' || item.category === category).map((item) => <article className="reward-card" key={item.id}>
      <div className="reward-card__cover" aria-hidden="true">{item.icon}</div><span className="journey-footnote">{item.category} · 模拟奖励</span><h3>{item.title}</h3><p>{item.description}</p>
      <div className="reward-card__action"><strong>{item.cost} 分</strong><button type="button" className="segmented__btn" disabled={unavailable(item.id, item.cost)} onClick={() => setSelectedId(item.id)} aria-label={`兑换${item.title}`}>{orders.some((order) => order.rewardId === item.id) ? '已申请' : store.currentUser.role === 'institution' ? '仅志愿者可兑换' : balance < item.cost ? `还差 ${item.cost - balance} 分` : '兑换'}</button></div>
    </article>)}</div>
    {selected && <section ref={confirmationRef} tabIndex={-1} className="reward-confirm" aria-labelledby="reward-confirm-title"><h3 id="reward-confirm-title">确认模拟兑换：{selected.title}</h3><p>将扣除 {selected.cost} 分，兑换后余额 {balance - selected.cost} 分。{selected.review ? '仅生成待审核申请，不代表获得 1 小时认证时长。' : '仅生成演示兑换记录，不会真实发货。'}</p><div className="segmented"><button type="button" className="segmented__btn" disabled={unavailable(selected.id, selected.cost)} onClick={() => { store.redeemReward(selected.id); setSelectedId(null); }}>确认兑换（{selected.cost} 分）</button><button type="button" className="segmented__btn" onClick={() => setSelectedId(null)}>取消</button></div></section>}
    <section className="points-history" aria-labelledby="redemption-title"><h3 id="redemption-title">我的兑换记录</h3><div aria-live="polite">{orders.length ? <ul>{orders.map((order) => <li key={order.id}><div><strong>{order.title}</strong><p>{order.status === 'review_pending' ? '模拟待机构审核 · 未认证时长' : '模拟兑换已登记 · 不实际发货'}</p><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString('zh-CN')}</time></div><strong className="points-delta">−{order.cost} 分</strong></li>)}</ul> : <p className="journey-footnote">还没有兑换记录。</p>}</div></section>
  </section>;
}
