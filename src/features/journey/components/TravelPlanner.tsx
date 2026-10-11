import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../../store';
import { STATUS_META, isStale } from '../../../app/config';
import type { TravelNeeds } from '../travelPlanner';
import { distanceToWalkingPath, type WalkingState } from '../walking';
import './travelPlanner.css';

export function TravelPlanner({ destinationId, onRouteChange, walkingState }: { destinationId?: string; onRouteChange: (placeIds: string[]) => void; walkingState: WalkingState }) {
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState('place-student-center');
  const [destination, setDestination] = useState(destinationId && store.getPlace(destinationId) ? destinationId : 'place-library-east');
  const [needs, setNeeds] = useState<TravelNeeds>(() => ({ avoidStairs: store.preferences.avoidStairs, needsRamp: store.preferences.needsRamp, needsElevator: store.preferences.needsElevator }));
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  const reset = () => { setRequested(false); setError(''); onRouteChange([]); };
  const route = requested && walkingState.status === 'ready' ? walkingState.route : null;
  const nearby = route ? store.places.filter((place) => place.id === origin || place.id === destination ||
    distanceToWalkingPath(place.coordinates.lng!, place.coordinates.lat!, route.path) <= 100) : [];
  useEffect(() => {
    if (requested && (walkingState.status === 'ready' || walkingState.status === 'error')) {
      resultRef.current?.focus({ preventScroll: true }); resultRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [requested, walkingState.status]);

  return <aside className={`travel-planner${open ? ' is-open' : ''}`} aria-label="无障碍出行规划">
    <button type="button" className="travel-planner__toggle" aria-expanded={open} aria-controls="travel-planner-body" onClick={() => setOpen(!open)}>↗ 无障碍出行 <span>{open ? '收起 −' : '规划路线 +'}</span></button>
    {open && <div id="travel-planner-body" className="travel-planner__body">
      <p className="journey-footnote">高德普通步行路线＋社区风险提示 · 无障碍通行待核验</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (origin === destination) { reset(); setError('起点和终点相同，请选择不同地点。'); return; }
        if (!store.getPlace(origin) || !store.getPlace(destination)) { reset(); setError('请选择有效的起终点。'); return; }
        store.updatePreferences(needs); setError(''); setRequested(true); onRouteChange([origin, destination]);
      }}>
        <label>起点<select value={origin} onChange={(event) => { setOrigin(event.target.value); reset(); }}>{store.places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <button type="button" className="travel-planner__swap" onClick={() => { setOrigin(destination); setDestination(origin); reset(); }}>⇅ 交换起终点</button>
        <label>终点<select value={destination} onChange={(event) => { setDestination(event.target.value); reset(); }}>{store.places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <fieldset><legend>出行前需核验的需求</legend>{([
          ['avoidStairs', '需要避开台阶'], ['needsRamp', '需要坡道'], ['needsElevator', '需要电梯'],
        ] as const).map(([key, label]) => <label className="travel-planner__check" key={key}><input type="checkbox" checked={needs[key]} onChange={(event) => { setNeeds({ ...needs, [key]: event.target.checked }); reset(); }} />{label}</label>)}</fieldset>
        <p className="journey-footnote">这些需求不会改变高德步行规划结果，仅用于提醒人工核验。不能据此认定已避开台阶或适合轮椅。</p>
        <button type="submit" className="travel-planner__submit" disabled={requested && walkingState.status === 'loading'}>{requested && walkingState.status === 'loading' ? '正在规划…' : '规划高德步行路线'}</button>
      </form>
      <div ref={resultRef} className="travel-planner__result" tabIndex={-1} aria-live="polite">
        {error && <p role="alert" className="travel-planner__warning">{error}</p>}
        {requested && walkingState.status === 'error' && <p role="alert" className="travel-planner__warning">{walkingState.message} 未绘制模拟替代线，可点击规划重试。</p>}
        {route && <section aria-labelledby="travel-result-heading">
          <h3 id="travel-result-heading">高德步行路线</h3>
          <p><strong>{route.distance} 米</strong> · 高德预计步行 {Math.ceil(route.duration / 60)} 分钟（不是轮椅用时）</p>
          <p className="travel-planner__warning">普通步行路线，未验证无障碍通行。{needs.avoidStairs && '需确认是否存在台阶。'}{needs.needsRamp && '需确认坡道位置及通行情况。'}{needs.needsElevator && '需确认电梯位置、开放时间和运行情况。'}</p>
          <ol className="travel-planner__steps" aria-label="高德步行路线指引">{route.instructions.map((instruction, index) => <li key={index}>{instruction}</li>)}</ol>
          <h3>路线附近的社区记录</h3>
          <p className="journey-footnote">道路约 100 米内地点及起终点；来源为本机模拟观察，不保证记录覆盖完整，也不表示一定经过该设施。</p>
          {nearby.map((place) => { const latest = store.getObservationsForPlace(place.id)[0]; return <article className="travel-planner__risk" key={place.id}><strong>{place.name}</strong><p>{STATUS_META[place.currentStatus].label} · {isStale(place.lastVerifiedAt) ? '核验信息可能过期' : '仍需确认现场通行情况'}</p><time dateTime={place.lastVerifiedAt}>最近核验：{new Date(place.lastVerifiedAt).toLocaleDateString('zh-CN')}</time>{latest ? <p>最新观察：{latest.description}（{new Date(latest.createdAt).toLocaleDateString('zh-CN')}）</p> : <p>暂无现场观察，缺少通行证据。</p>}<Link to={`/places/${place.id}`}>查看记录与核验状态 →</Link></article>; })}
          <p className="journey-footnote">起终点按建筑或用户选点查询，并非已核验无障碍入口。本页是路线预览，不提供实时定位导航。</p>
        </section>}
      </div>
    </div>}
  </aside>;
}
