import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../../store';
import { HELP_NEEDS, HELP_STATUS, nearbyDemoVolunteers, canRespondToHelp, helpEntryLabel } from '../../../store/helpRequests';
import { formatDateTime, ROLE_LABELS } from '../format';
import './help.css';

export function HelpPage() {
  const store = useAppStore();
  const requester = store.currentUser.role === 'disabled_person';
  const [placeId, setPlaceId] = useState(store.places[0]?.id ?? '');
  const [need, setNeed] = useState<string>(HELP_NEEDS[0]);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState('');
  const nearby = useMemo(() => nearbyDemoVolunteers(store, placeId), [store, placeId]);
  const active = store.helpRequests.find((item) => item.requesterId === store.currentUserId && ['pending', 'accepted'].includes(item.status));
  const visible = store.helpRequests.filter((item) => item.requesterId === store.currentUserId || item.recipientIds.includes(store.currentUserId));
  const name = (id?: string) => store.demoUsers.find((user) => user.userId === id)?.name ?? '未知身份';

  return <section className="help-page" aria-labelledby="help-title">
    <header><span className="journey-section-head__hint">社区协助 · 本地演示 · {ROLE_LABELS[store.currentUser.role]}</span><h2 id="help-title">{helpEntryLabel(store.currentUser.role)}</h2><p>{requester ? '告诉附近的志愿者和官方人士，你需要什么帮助。' : '查看分配给你的求助通知，确认能够协助后接单。'}</p></header>
    <p className="help-warning">模拟通知：只在当前浏览器内流转，不会真实推送、定位志愿者或保证响应。非紧急救援，请勿用它处理紧急情况。</p>
    {requester && <form className="help-panel" onSubmit={(event) => {
      event.preventDefault();
      if (!confirmed || active || !placeId) return;
      store.createHelpRequest(placeId, need, message);
      setNotice(nearby.length ? `求助已记录，已生成 ${nearby.length} 位附近响应人员的模拟通知。` : '求助已记录，模拟范围内暂无响应人员；未发送通知。');
      setConfirmed(false); setMessage('');
    }}>
      <h3>发起求助</h3>
      <label>你所在的地点（手动确认，非 GPS 定位）<select value={placeId} onChange={(event) => { setPlaceId(event.target.value); setConfirmed(false); }} required>
        {store.places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
      </select></label>
      <label>需要什么帮助<select value={need} onChange={(event) => setNeed(event.target.value)}>
        {HELP_NEEDS.map((item) => <option key={item}>{item}</option>)}
      </select></label>
      <label>补充说明（可选，请勿填写电话、精确住址等隐私信息）<textarea value={message} maxLength={500} rows={3} onChange={(event) => setMessage(event.target.value)} /></label>
      <p>附近响应人员：志愿者及官方人士，演示位置，1.5 公里内最多 3 人；距离为直线估算，不代表到达时间。</p>
      {nearby.length ? <ul>{nearby.map(({ user, distance }) => <li key={user.userId}>{user.name}（{ROLE_LABELS[user.role]}） · 约 {distance} 米（模拟）</li>)}</ul> : <p>暂无匹配的模拟响应人员，可保留求助记录。</p>}
      <label className="help-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />我已确认地点，并知道这是非紧急、本地模拟求助。</label>
      <button type="submit" disabled={!confirmed || Boolean(active) || !placeId}>发送求助（模拟）</button>
      {active && <p>你已有一条进行中的求助，请先完成或取消。</p>}
    </form>}
    <p role="status">{notice}</p>
    <section className="help-panel" aria-labelledby="help-inbox"><h3 id="help-inbox">{requester ? '我的求助' : '待响应与已接单'} · 模拟通知</h3>
      <p>当前演示身份：{store.currentUser.name}（{ROLE_LABELS[store.currentUser.role]}）。<Link to="/me">前往“我的”切换身份</Link></p>
      {!visible.length && <p>暂无求助或通知。</p>}
      {visible.map((item) => <article className="help-request" key={item.id}>
        <h4>{item.need} · {HELP_STATUS[item.status]}</h4>
        <p>地点：{store.getPlace(item.placeId)?.name ?? '地点已不可用'}（地点级信息，不展示精确坐标）</p>
        <p>发起人：{name(item.requesterId)} · {formatDateTime(item.createdAt)}</p>
        {item.message && <p>{item.message}</p>}
        <p>通知范围：{item.recipientIds.length} 位模拟响应人员；{item.volunteerId ? `接单人：${name(item.volunteerId)}` : '尚无人接单'}</p>
        <div className="help-actions">
          {item.status === 'pending' && item.requesterId !== store.currentUserId && item.recipientIds.includes(store.currentUserId) && canRespondToHelp(store.currentUser.role) &&
            <button type="button" onClick={() => { store.updateHelpRequest(item.id, 'accept'); setNotice('已接单（模拟），请在现实中确认协助能力与双方意愿。'); }}>我愿意协助 · 接单</button>}
          {item.status === 'accepted' && [item.requesterId, item.volunteerId].includes(store.currentUserId) &&
            <button type="button" onClick={() => { store.updateHelpRequest(item.id, 'complete'); setNotice('求助已标记完成（模拟）。'); }}>标记已完成</button>}
          {['pending', 'accepted'].includes(item.status) && item.requesterId === store.currentUserId &&
            <button type="button" onClick={() => { store.updateHelpRequest(item.id, 'cancel'); setNotice('求助已取消。'); }}>取消求助</button>}
        </div>
      </article>)}
    </section>
  </section>;
}
