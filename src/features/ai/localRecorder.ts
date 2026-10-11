/** Browser microphone capture -> local Vite ASR only; never browser cloud recognition. */
export async function recordLocally(onText: (text: string) => void, onStatus: (text: string) => void,
  onRecording: (value: boolean) => void, onSettled: () => void): Promise<{ stop(): void; cancel(): void }> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('此浏览器不支持录音，请使用文字输入。');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let recorder: MediaRecorder;
  try {
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
      .find((type) => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch (error) { stream.getTracks().forEach((track) => track.stop()); throw error; }
  const chunks: Blob[] = [];
  const controller = new AbortController();
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const release = () => { clearTimeout(timer); stream.getTracks().forEach((track) => track.stop()); };
  recorder.onstop = async () => {
    release(); onRecording(false);
    if (cancelled) return;
    onStatus('正在由本机 Whisper 识别…');
    const timeout = setTimeout(() => controller.abort(), 65_000);
    try {
      const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' });
      const response = await fetch('/api/local-asr', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob, signal: controller.signal });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || '本地识别失败');
      if (!cancelled) {
        if (payload.text?.trim()) onText(payload.text.trim()); else onStatus('没有识别到语音，请重试。');
      }
    } catch (error) { if (!cancelled) onStatus(error instanceof Error ? error.message : '本地识别失败'); }
    finally { clearTimeout(timeout); onSettled(); }
  };
  recorder.onerror = () => { cancelled = true; release(); onRecording(false); onStatus('录音失败，请重试。'); onSettled(); };
  try { recorder.start(); } catch (error) { release(); throw error; }
  onRecording(true); onStatus('正在录音，点击结束后由本机识别（最长 20 秒）。');
  timer = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, 20_000);
  return {
    stop() { if (recorder.state !== 'inactive') recorder.stop(); },
    cancel() { cancelled = true; controller.abort(); release(); if (recorder.state !== 'inactive') recorder.stop(); },
  };
}
