import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AI_DISCLAIMER, FACILITY_META, ISSUE_META, POINT_RULES, POST_TYPE_META, SIMULATION_LABELS, STANDARD_TAGS } from '../../../app/config';
import { SAMPLE_PHOTOS, STANDARD_REFERENCES } from '../../../data';
import { useAppStore } from '../../../store';
import type { AiAnalysis, FacilityType, GeoCoordinates, IssueType, PostType } from '../../../types';
import { ObservationLocationPicker } from '../components/ObservationLocationPicker';
import { validatePublish } from '../publishValidation';
import './publish.css';

const PRESETS: Record<string, { facility: FacilityType; issue: IssueType; description: string }> = {
  'sample-ramp': { facility: 'ramp', issue: 'occupied', description: '坡道通行区域被共享单车占用，轮椅经过时需要绕行，希望现场人员协助清理。' },
  'sample-elevator': { facility: 'elevator', issue: 'other', description: '演示记录：电梯门开启，轿厢内可见扶手；按钮高度、门宽和实际可用性需要现场确认。' },
  'sample-tactile': { facility: 'tactile_paving', issue: 'blocked', description: '演示记录：盲道被纸箱与路锥阻挡，影响连续通行，需要清理并由志愿者现场复核。' },
  'sample-restroom': { facility: 'accessible_restroom', issue: 'other', description: '演示记录：卫生间可见扶手、坐便器及通行空间，尺寸和实际可用性需要现场确认。' },
};

function localTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** 重新编码本地图片以控制持久化体积，同时移除原始 EXIF。 */
async function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片。');
  if (file.size > 10 * 1024 * 1024) throw new Error('图片不能超过 10 MB。');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 900 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法处理图片，请使用示例照片。');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } finally { URL.revokeObjectURL(url); }
}

export function PublishPage() {
  const store = useAppStore();
  const [params] = useSearchParams();
  const [type, setType] = useState<PostType>('facility');
  const [placeId, setPlaceId] = useState(() => store.getPlace(params.get('placeId') ?? '')?.id ?? store.places[0]?.id ?? '');
  const [observationCoordinates, setObservationCoordinates] = useState<GeoCoordinates | null>(null);
  const [locationDirty, setLocationDirty] = useState(false);
  const [step, setStep] = useState(1);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPoiId, setNewPoiId] = useState<string | undefined>();
  const [photoId, setPhotoId] = useState('sample-ramp');
  const [photo, setPhoto] = useState(SAMPLE_PHOTOS[0].src);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [capturedAt, setCapturedAt] = useState(localTime);
  const [facility, setFacility] = useState<FacilityType>('ramp');
  const [issue, setIssue] = useState<IssueType>('occupied');
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ placeId?: string } | null>(null);
  const submitting = useRef(false);
  const photoRequest = useRef(0);
  const place = store.getPlace(placeId);
  const steps = ['添加照片', type === 'facility' ? '地点与描述' : '标题与正文', type === 'facility' ? '分析与确认' : '标签与确认'];
  useEffect(() => { stepHeading.current?.focus(); }, [step]);

  function validate(throughStep: number) {
    const invalid = validatePublish({ isFacility: type === 'facility', photo, hasPlace: Boolean(place), newPlaceName, hasCoordinates: Boolean(observationCoordinates), locationDirty, title, description, capturedAt, hasAnalysis: Boolean(analysis), confirmed }, throughStep);
    if (invalid) { setStep(invalid.step); setError(invalid.message); return false; }
    setError(''); return true;
  }

  function nextStep() {
    if (!validate(step)) return;
    if (step === 1 && type === 'facility' && !description.trim()) setDescription(PRESETS[photoId]?.description ?? '');
    if (step === 2 && type === 'facility' && !analysis) analyze();
    setStep((current) => Math.min(3, current + 1));
  }

  function selectSample(id: string) {
    photoRequest.current += 1;
    setBusy(false);
    const sample = SAMPLE_PHOTOS.find((item) => item.id === id)!;
    if (description === PRESETS[photoId]?.description) setDescription('');
    setPhotoId(id); setPhoto(sample.src); setAnalysis(null); setConfirmed(false); setError('');
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++photoRequest.current;
    setBusy(true); setError('');
    try {
      const image = await preparePhoto(file);
      if (request !== photoRequest.current) return;
      setPhoto(image); setPhotoId('custom'); setAnalysis(null); setConfirmed(false);
    } catch (e) { if (request === photoRequest.current) setError(e instanceof Error ? e.message : '图片读取失败'); }
    finally { if (request === photoRequest.current) setBusy(false); }
  }

  function analyze() {
    const preset = PRESETS[photoId];
    const detectedFacility = preset?.facility ?? facility;
    const detectedIssue = preset?.issue ?? issue;
    setFacility(detectedFacility); setIssue(detectedIssue);
    const summary = preset?.description ?? '自选照片尚未接入视觉识别，请人工选择设施和问题类型，并描述现场情况。';
    if (!description.trim() && preset) setDescription(summary);
    const suggestedTags = [detectedFacility === 'ramp' ? '#坡道' : `#${FACILITY_META[detectedFacility].label}`, ...(detectedIssue === 'occupied' ? ['#通道占用'] : []), '#需要复核'].filter((tag) => STANDARD_TAGS.includes(tag));
    setTags(suggestedTags);
    setAnalysis({ facilityType: detectedFacility, issueType: detectedIssue, detectedLabel: FACILITY_META[detectedFacility].label, issueSummary: summary, confidence: preset ? 0.88 : 0, suggestedTags, standardReferences: STANDARD_REFERENCES.filter((ref) => ref.category === detectedFacility).map((ref) => ({ ...ref })), simulated: true, generatedAt: new Date().toISOString(), disclaimer: AI_DISCLAIMER });
    setConfirmed(false); setError('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || busy || success) return;
    if (step < 3) { nextStep(); return; }
    setError('');
    const content = description.trim();
    if (!validate(3)) return;
    const captureTime = Date.parse(capturedAt);
    submitting.current = true;
    try {
      // 发布前先检查存储容量，避免本地大图使所有数据无法持久化。
      const probeKey = 'wuai-publish-storage-check';
      window.localStorage.setItem(probeKey, JSON.stringify({ ...store, extraImages: [photo, photo] }));
      window.localStorage.removeItem(probeKey);
    } catch { submitting.current = false; setError('浏览器存储空间不足或不可用，请改用示例照片，或释放存储空间后再发布。'); return; }
    try {
      let publishedPlaceId: string | undefined;
      if (type === 'facility' && analysis) {
        const observation = store.publishObservation({ placeId, newPlace: !place ? { name: newPlaceName, amapPoiId: newPoiId } : undefined, photo, capturedAt: new Date(captureTime).toISOString(), coordinates: { ...(observationCoordinates ?? place!.coordinates) }, facilityType: facility, issueType: issue, description: content, aiAnalysis: { ...analysis, facilityType: facility, issueType: issue, suggestedTags: tags, standardReferences: STANDARD_REFERENCES.filter((ref) => ref.category === facility).map((ref) => ({ ...ref })) } });
        publishedPlaceId = observation.placeId;
      } else if (type !== 'facility') {
        store.publishCommunityPost({ type, title: title.trim(), content, images: photo ? [photo] : [], tags });
      }
      setSuccess({ placeId: publishedPlaceId });
    } catch (e) { submitting.current = false; setError(e instanceof Error ? e.message : '发布失败，请重试。'); }
  }

  if (success) return <section className="publish-success" aria-labelledby="publish-success-title">
    <span className="publish-success__icon" aria-hidden="true">✓</span>
    <h2 id="publish-success-title">发布成功</h2>
    <p>{success.placeId ? `观察已加入${store.getPlace(success.placeId)?.name ?? newPlaceName}的时间线，状态为“待核验”。模拟贡献积分 +${POINT_RULES.observation_published.delta}。` : '你的分享已出现在社区，其他人可以在对应分类中找到它。'}</p>
    <p className="publish-muted">数据仅保存在当前浏览器，不会同步到其他设备。设施观察需由其他志愿者现场复核。</p>
    <div className="publish-actions"><Link className="primary-button" to="/">查看社区</Link>{success.placeId && <Link className="ghost-button" to={`/places/${success.placeId}`}>查看地点记录</Link>}<button className="ghost-button" onClick={() => { submitting.current = false; setSuccess(null); setStep(1); setDescription(''); setTitle(''); setAnalysis(null); setConfirmed(false); setObservationCoordinates(null); setLocationDirty(false); setCapturedAt(localTime()); }}>再发布一条</button></div>
  </section>;

  return <section className="publish-page" aria-labelledby="publish-title">
    <header className="publish-header"><div><p className="publish-eyebrow">记录现场 · 分享经验</p><h2 id="publish-title">发布你的发现</h2><p className="publish-muted">让一个人的发现，成为更多人的出行参考。</p></div><span className="tag-chip">{store.currentUser.name}</span></header>
    <form onSubmit={submit} noValidate>
      <fieldset className="publish-topics"><legend className="visually-hidden">选择帖子分类</legend>{(Object.keys(POST_TYPE_META) as PostType[]).map((value) => <label key={value} className={type === value ? 'is-selected' : ''}><input type="radio" name="post-type" value={value} checked={type === value} onChange={() => { setType(value); setStep(1); setConfirmed(false); setError(''); }} />{POST_TYPE_META[value].label}</label>)}</fieldset>
      <ol className="publish-steps" aria-label="发布进度">{steps.map((label, index) => <li key={index} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'is-current' : step > index + 1 ? 'is-complete' : ''}><span aria-hidden="true">{step > index + 1 ? '✓' : index + 1}</span>{label}</li>)}</ol>
      <h3 ref={stepHeading} tabIndex={-1} className="publish-step-heading">第 {step} 步 / {steps[step - 1]}</h3>
      <div className="publish-grid publish-grid--steps">
        <section hidden={step !== 1} className="publish-panel" aria-labelledby="photo-heading"><h3 id="photo-heading">选择一张照片</h3><div className="publish-preview">{photo ? <img src={photo} alt={photoId === 'custom' ? '待发布的自选图片预览' : SAMPLE_PHOTOS.find((item) => item.id === photoId)?.label} /> : <p>添加一张照片，让分享更直观</p>}<span>{photoId === 'custom' ? '本地照片' : 'AI 生成 · 演示图'}</span></div>
          <label className="publish-upload">{busy ? '正在处理图片…' : '选择本地照片'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} /></label><p className="publish-muted">JPG / PNG / WebP，最大 10 MB；图片仅在本机处理。</p>
          <fieldset className="publish-samples"><legend>或使用示例照片</legend>{SAMPLE_PHOTOS.map((sample) => <label key={sample.id} className={photoId === sample.id ? 'is-selected' : ''}><input type="radio" name="sample-photo" checked={photoId === sample.id} onChange={() => selectSample(sample.id)} /><img src={sample.src} alt="" /><span>{sample.label}</span></label>)}</fieldset>
          <p className="publish-muted">示例照片由 AI 生成，非现场采集，不代表真实地点状态。</p>
          {type !== 'facility' && photo && <button type="button" className="ghost-button" onClick={() => { setPhoto(''); setPhotoId(''); }}>不使用照片</button>}
          <div className="publish-privacy"><strong>照片隐私</strong><p>本地照片会压缩并移除原始 EXIF。当前未实现人脸 / 车牌模糊，请使用不含可识别个人信息的图片。</p></div>
        </section>
        <section hidden={step === 1} className="publish-panel" aria-labelledby="content-heading"><h3 id="content-heading">{steps[step - 1]}</h3>
          <div hidden={step !== 2} className="publish-step-fields">
          {type === 'facility' ? <><label className="publish-field">关联地点<select value={placeId} onChange={(e) => { setPlaceId(e.target.value); setObservationCoordinates(null); setLocationDirty(false); setConfirmed(false); setNewPlaceName(''); setNewPoiId(undefined); if (!e.target.value) setLocationOpen(true); }}>{store.places.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="">搜索或标注其他地点…</option></select></label>
            {!place && <label className="publish-field">地点名称<input maxLength={80} value={newPlaceName} placeholder="例如：10 栋南侧入口" onChange={(event) => { setNewPlaceName(event.target.value); setNewPoiId(undefined); setConfirmed(false); }} /><small>发布时自动关联同一 POI 或附近同名档案，否则创建新档案。</small></label>}
            <p className="publish-muted">{!place && !observationCoordinates ? '请搜索地点或地图选点，并确认观察位置。' : <>{observationCoordinates ? '本次观察使用已确认的手选位置' : '本次观察默认使用地点中心，可在下方调整'}：{(observationCoordinates ?? place?.coordinates)?.lng?.toFixed(6)}, {(observationCoordinates ?? place?.coordinates)?.lat?.toFixed(6)}。</>}</p>
            <details className="publish-location" open={locationOpen} onToggle={(event) => setLocationOpen(event.currentTarget.open)}><summary>地图选点：设置更准确的观察位置</summary>{locationOpen && <ObservationLocationPicker key={placeId} coordinates={observationCoordinates ?? place?.coordinates ?? store.places[0]?.coordinates ?? { x: 50, y: 50 }} isConfirmed={Boolean(observationCoordinates) && !locationDirty} onChange={() => { setLocationDirty(true); setConfirmed(false); }} onPlaceSelect={!place ? (selected) => { setNewPlaceName(selected.name); setNewPoiId(selected.amapPoiId); setObservationCoordinates(null); setLocationDirty(true); setConfirmed(false); } : undefined} onConfirm={(coordinates) => { setObservationCoordinates(coordinates); setLocationDirty(false); setConfirmed(false); setError(''); }} />}</details>
            <label className="publish-field">拍摄时间（手动确认）<input type="datetime-local" value={capturedAt} onChange={(e) => { setCapturedAt(e.target.value); setConfirmed(false); }} /></label></> : <label className="publish-field">标题<input maxLength={60} placeholder="给你的分享起一个清晰的标题" value={title} onChange={(e) => setTitle(e.target.value)} /><small>{title.length} / 60</small></label>}
          <label className="publish-field">{type === 'facility' ? '现场描述' : '分享正文'}<textarea rows={5} maxLength={2000} placeholder={type === 'facility' ? '描述在哪里、发现什么、对通行有什么影响…' : '分享知识、使用方法或亲身经验…'} value={description} onChange={(e) => { setDescription(e.target.value); setConfirmed(false); }} /><small>{description.length} / 2000</small></label>
          </div>
          <div hidden={step !== 3} className="publish-step-fields">
          <div className="publish-review"><strong>本次发布</strong><p>{type === 'facility' ? `${place?.name ?? newPlaceName} · ${locationDirty ? '位置尚未确认' : observationCoordinates ? '位置已确认' : '使用地点默认位置'}` : title}</p><p>{description}</p>{type === 'facility' && <small>拍摄时间：{capturedAt.replace('T', ' ')}</small>}</div>
          {type === 'facility' && <><button type="button" className="publish-ai-button" onClick={analyze} disabled={busy || !photo}>✦ {analysis ? '重新分析照片' : 'AI 模拟分析照片'}</button><p className="publish-muted">示例照片返回预设结果；自选照片需人工标注。</p>
            {analysis && <div className="publish-analysis" aria-live="polite"><strong>{SIMULATION_LABELS.aiAnalysis}</strong><p>{analysis.issueSummary}</p>{photoId !== 'custom' && <p>模拟置信度 {Math.round(analysis.confidence * 100)}% · 不代表实际检测准确率</p>}<div className="publish-row"><label className="publish-field">设施类型<select value={facility} onChange={(e) => { setFacility(e.target.value as FacilityType); setConfirmed(false); }}>{(Object.keys(FACILITY_META) as FacilityType[]).map((key) => <option key={key} value={key}>{FACILITY_META[key].label}</option>)}</select></label><label className="publish-field">问题情况<select value={issue} onChange={(e) => { setIssue(e.target.value as IssueType); setConfirmed(false); }}>{(Object.keys(ISSUE_META) as IssueType[]).map((key) => <option key={key} value={key}>{ISSUE_META[key]}</option>)}</select></label></div>{STANDARD_REFERENCES.filter((ref) => ref.category === facility).map((ref) => <div className="publish-standard" key={ref.id}><strong>{ref.title}</strong><p>{ref.excerpt}</p><small>{ref.source} · {SIMULATION_LABELS.standards}</small></div>)}<p>{AI_DISCLAIMER}</p></div>}
          </>}
          <fieldset className="publish-tags"><legend>主题标签（可多选）</legend>{STANDARD_TAGS.map((tag) => <label key={tag} className={tags.includes(tag) ? 'is-selected' : ''}><input type="checkbox" checked={tags.includes(tag)} onChange={(e) => { setTags(e.target.checked ? [...tags, tag] : tags.filter((item) => item !== tag)); setConfirmed(false); }} />{tag}</label>)}</fieldset>
          {type === 'facility' && <label className="publish-confirm"><input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setError(''); }} />我已人工检查本帖：照片、地点、描述和分析结果均已核对；发布后仍需其他志愿者复核。</label>}
          </div>
        </section>
      </div>
      <footer className="publish-footer"><div><p>发布到「{POST_TYPE_META[type].label}」</p><small className="publish-muted">{type === 'facility' ? '同一地点沿用原有大头针，新观察进入时间线。' : '分享将出现在首页及对应分类。'}</small></div><div className="publish-actions">{step > 1 && <button type="button" className="ghost-button" onClick={() => { setStep(step - 1); setError(''); }}>上一步</button>}<button type="submit" className="primary-button" disabled={busy}>{step < 3 ? `下一步：${steps[step]}` : `发布${type === 'facility' ? '观察' : '分享'}`}</button></div></footer>
      {error && <p className="publish-error" role="alert">{error}</p>}
    </form>
  </section>;
}
