import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AI_DISCLAIMER, SIMULATION_LABELS } from '../../app/config';
import { useAppStore } from '../../store';
import { formatDateTime } from '../journey/format';
import { askDeepSeek } from './api';
import { buildGroundingSources, buildLocalFallback, integrateLocalInformation, PRESET_QUESTIONS } from './grounding';
import type { GroundedAiAnswer } from './types';
import { classifyVoiceCommand, speak, stopSpeaking } from './voice';
import { recordLocally } from './localRecorder';
import './ai.css';

export function AskAiPage() {
  const store = useAppStore();
  const sources = useMemo(() => buildGroundingSources(store), [store]);
  const integrated = useMemo(() => integrateLocalInformation(store), [store]);
  const sourceMap = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const [question, setQuestion] = useState<string>(PRESET_QUESTIONS[0]);
  const [answer, setAnswer] = useState<GroundedAiAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recorderRef = useRef<{ stop(): void; cancel(): void } | null>(null);
  const voicePending = useRef(false);
  const mounted = useRef(true);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const busyRef = useRef(false);
  const speechEnabled = Boolean(store.preferences.speechAssistance);
  const speechEnabledRef = useRef(speechEnabled);
  speechEnabledRef.current = speechEnabled;
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false;
    abortRef.current?.abort();
    recorderRef.current?.cancel();
    stopSpeaking();
  }; }, []);
  useEffect(() => { if (!speechEnabled) stopSpeaking(); }, [speechEnabled]);

  const ask = async (text: string) => {
    const normalized = text.trim();
    if (normalized.length < 2 || busyRef.current) return;
    if (normalized.length > 500) { setVoiceNotice('问题超过 500 字，请缩短后发送。'); return; }
    busyRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setNotice('');
    try {
      const result = await askDeepSeek(normalized, sources, controller.signal);
      if (!controller.signal.aborted) {
        setAnswer(result);
        if (speechEnabledRef.current) speak(`${result.summary}。${result.details.join('。')}`);
      }
    } catch {
      if (controller.signal.aborted) return;
      const result = buildLocalFallback(normalized, sources);
      setAnswer(result);
      if (speechEnabledRef.current) speak(`这是本地模拟回答。${result.summary}。${result.details.join('。')}`);
      setNotice('DeepSeek 未连接或请求失败，已使用本地证据生成确定性演示回答。');
    } finally {
      if (abortRef.current === controller) { busyRef.current = false; setLoading(false); }
    }
  };

  const submit = (event: React.FormEvent) => { event.preventDefault(); void ask(question); };
  const readAnswer = () => {
    if (!speechEnabledRef.current) { setVoiceNotice('请先打开语音辅助。'); return; }
    if (!answer) { setVoiceNotice('还没有可朗读的回答。'); return; }
    if (!speak(`${answer.mode === 'local_fallback' ? '本地模拟回答。' : ''}${answer.summary}。${answer.details.join('。')}`)) setVoiceNotice('此浏览器不支持朗读。');
  };
  const handleVoice = (text: string) => {
    setVoiceNotice(`识别到：${text}`);
    switch (classifyVoiceCommand(text)) {
      case 'enable':
        speechEnabledRef.current = true;
        store.updatePreferences({ speechAssistance: true });
        if (!speak('语音辅助已开启。这里可以查询社区的无障碍信息。')) setVoiceNotice('语音辅助已开启，但此浏览器不支持朗读。');
        break;
      case 'disable':
        speechEnabledRef.current = false;
        store.updatePreferences({ speechAssistance: false });
        stopSpeaking(); setVoiceNotice('语音辅助已关闭。'); break;
      case 'read': readAnswer(); break;
      case 'stop': stopSpeaking(); setVoiceNotice('已停止朗读。'); break;
      default: setQuestion(text); void ask(text);
    }
  };
  const startListening = async () => {
    if (voicePending.current || busyRef.current) return;
    voicePending.current = true; setVoiceBusy(true);
    setVoiceTranscript('');
    stopSpeaking();
    try {
      setVoiceNotice('正在请求麦克风权限…');
      const recording = await recordLocally(
        (text) => { if (mounted.current) { setVoiceTranscript(text); setVoiceNotice('识别完成，请核对文字后确认执行。'); } },
        (text) => { if (mounted.current) setVoiceNotice(text); },
        (value) => { if (mounted.current) setListening(value); },
        () => { recorderRef.current = null; voicePending.current = false; if (mounted.current) setVoiceBusy(false); },
      );
      if (!mounted.current) recording.cancel(); else recorderRef.current = recording;
    } catch (error) {
      voicePending.current = false;
      if (mounted.current) {
        setVoiceBusy(false); setListening(false);
        setVoiceNotice(error instanceof DOMException && error.name === 'NotAllowedError'
          ? '麦克风权限被拒绝，请在浏览器设置中允许，或使用文字输入。'
          : error instanceof Error ? error.message : '无法启动录音，请使用文字输入。');
      }
    }
  };

  const cited = answer?.sourceIds.map((id) => sourceMap.get(id)).filter(Boolean) ?? [];

  return (
    <section className="ai-page" aria-labelledby="ai-heading">
      <header className="ai-page__header">
        <span className="ai-page__eyebrow">有来源的无障碍检索</span>
        <h2 id="ai-heading">直接问 AI</h2>
        <p>回答只使用当前社区的地点、观察帖和标准示例，并展示更新时间与核验状态。</p>
      </header>

      <details className="ai-answer">
        <summary>本地自动整合：{store.places.length} 个地点 · {store.observations.length} 条观察 · {store.posts.length} 篇帖子</summary>
        <p>上传、复核和整改后自动更新；问答读取全部本地文字记录。图片不参与识别，异议不会自动裁决。</p>
        {integrated.map(({ place, observations, posts, pending, disputed, latest }) => (
          <article key={place.id}>
            <h3><Link to={`/places/${place.id}`}>{place.name}</Link></h3>
            <p>{observations.length} 条观察 · {posts.length} 篇关联帖子 · {pending.length} 条待处理 · {disputed.length} 条存在异议</p>
            <p>最新上传：{latest ? formatDateTime(latest.createdAt) : '暂无'}（不等于已核验）</p>
            {latest && <p>{latest.description}</p>}
          </article>
        ))}
      </details>

      <div className="ai-presets" aria-label="预设问题">
        {PRESET_QUESTIONS.map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>
        ))}
      </div>

      <form className="ai-form" onSubmit={submit}>
        <label htmlFor="ai-question">你想了解什么？</label>
        <div className="ai-form__row">
          <textarea
            id="ai-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="例如：工学院入口轮椅能进入吗？"
          />
          <button type="submit" disabled={loading || voiceBusy || question.trim().length < 2}>
            {loading ? '正在检索…' : '发送'}
          </button>
        </div>
      </form>

      <div className="ai-presets" role="group" aria-label="语音辅助控制">
        <button type="button" disabled={loading || (voiceBusy && !listening)} aria-pressed={listening} onClick={() => listening ? recorderRef.current?.stop() : void startListening()}>{listening ? '结束语音输入' : voiceBusy ? '本地识别中…' : '麦克风 · 语音输入'}</button>
        <label><input type="checkbox" checked={speechEnabled} onChange={(event) => {
          store.updatePreferences({ speechAssistance: event.target.checked });
          if (event.target.checked) {
            setVoiceNotice(speak('语音辅助已开启。') ? '语音辅助已开启。' : '语音辅助已开启，但此浏览器不支持朗读。');
          } else { stopSpeaking(); setVoiceNotice('语音辅助已关闭。'); }
        }} />语音辅助（回答自动朗读）</label>
        <button type="button" disabled={!answer || !speechEnabled} onClick={readAnswer}>朗读回答</button>
        <button type="button" onClick={() => { stopSpeaking(); setVoiceNotice('已停止朗读。'); }}>停止朗读</button>
      </div>
      <p>点击麦克风录一次，结束后由本机 Whisper 转文字，核对并确认后执行。可说“打开语音辅助”“关闭语音辅助”“朗读回答”“停止朗读”；其他内容确认后作为问题发送 AI。首次需要麦克风授权；录音仅发送到本机服务、不落盘，确认的问题文字会发送 DeepSeek。</p>
      <p role="status">{voiceNotice}</p>
      {voiceTranscript && <div className="ai-form">
        <label htmlFor="voice-transcript">识别结果（可修改，确认后才执行指令或提问）</label>
        <textarea id="voice-transcript" value={voiceTranscript} maxLength={500} rows={2} onChange={(event) => setVoiceTranscript(event.target.value)} />
        <div className="ai-presets">
          <button type="button" disabled={loading || voiceBusy || !voiceTranscript.trim()} onClick={() => {
            const text = voiceTranscript.trim(); setVoiceTranscript(''); handleVoice(text);
          }}>确认执行识别结果</button>
          <button type="button" onClick={() => { setVoiceTranscript(''); setVoiceNotice('已取消，不执行。'); }}>取消</button>
        </div>
      </div>}

      <div className="ai-safety-note">
        <strong>{answer?.mode === 'deepseek' ? `DeepSeek 实时回答${answer.model ? ` · ${answer.model}` : ''}` : SIMULATION_LABELS.aiQa}</strong>
        <span>{AI_DISCLAIMER}</span>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {notice && <p className="ai-notice">{notice}</p>}
        {answer && (
          <article className="ai-answer">
            <h3>结论</h3>
            <p className="ai-answer__summary">{answer.summary}</p>
            <ul>{answer.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            <p className="ai-answer__time">生成时间：{formatDateTime(answer.generatedAt)}</p>

            <h3>引用来源</h3>
            <div className="ai-sources">
              {cited.map((source) => source && (
                <article className="ai-source" key={source.id}>
                  <span>{source.type === 'place' ? '地点' : source.type === 'post' ? '社区帖子' : '标准示例'}</span>
                  <h4>{source.title}</h4>
                  {source.status && <p>核验状态：{source.status}</p>}
                  {source.updatedAt && <p>更新时间：{formatDateTime(source.updatedAt)}</p>}
                  <p>{source.excerpt}</p>
                  {source.type === 'place' && <Link to={`/places/${source.entityId}`}>查看地点档案</Link>}
                </article>
              ))}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
