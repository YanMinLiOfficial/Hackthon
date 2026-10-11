import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Observation } from '../../../types';
import { useAppStore } from '../../../store';
import { getVerificationBlock } from '../../../store/verification';
import { VERIFICATION_REQUIRED_CONFIRMATIONS, POINT_RULES } from '../../../app/config';

export function ObservationReview({ observation }: { observation: Observation }) {
  const store = useAppStore();
  const [message, setMessage] = useState('');
  const blocked = getVerificationBlock(observation, store.currentUser);
  const submit = (vote: 'confirm' | 'dispute') => {
    const result = store.verifyObservation(observation.id, vote);
    if (!result.ok) { setMessage('未能提交，请检查当前身份和复核状态。'); return; }
    setMessage(vote === 'dispute' ? '已记录异议，未增加确认人数或积分。' :
      `${result.status === 'community_verified' ? '已记录确认，当前为社区已复核。' : '已记录确认，等待另一位志愿者独立复核。'}本机模拟积分 +${POINT_RULES.verification_confirmed.delta}。`);
  };
  return <section className="observation-review" aria-label="独立复核">
    <h4>志愿者独立复核</h4>
    <p>独立确认 {observation.confirmations.length}/{VERIFICATION_REQUIRED_CONFIRMATIONS} 人 · 异议 {observation.disputes.length} 条</p>
    <p className="journey-footnote">当前模拟身份：{store.currentUser.name}。请在现场核对后再提交；演示操作仅保存在本机。</p>
    <div className="observation-review__actions">
      <button type="button" className="primary-button" disabled={!!blocked} onClick={() => submit('confirm')}>现场一致</button>
      <button type="button" className="ghost-button" disabled={!!blocked} onClick={() => submit('dispute')}>信息有误</button>
      <Link to="/me" className="ghost-button">切换模拟身份</Link>
    </div>
    {blocked && <p className="journey-footnote">{blocked}</p>}
    <p className="observation-review__message" role="status">{message}</p>
    {!!observation.confirmations.length && <p className="journey-footnote">已确认：{observation.confirmations.map((vote) => vote.userName).join('、')}</p>}
    {!!observation.disputes.length && <p className="journey-footnote">异议来自：{observation.disputes.map((vote) => vote.userName).join('、')}。异议不会自动清除问题或标记已解决。</p>}
  </section>;
}
