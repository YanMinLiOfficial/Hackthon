export type VoiceCommand = 'enable' | 'disable' | 'read' | 'stop' | 'question';

export function classifyVoiceCommand(text: string): VoiceCommand {
  const normalized = text.replace(/[\s，。！？、,.!?]/g, '');
  if (/^(请|帮我)?(打开|开启|启用)语音辅助(功能)?$/.test(normalized)) return 'enable';
  if (/^(请|帮我)?(关闭|关掉|禁用)语音辅助(功能)?$/.test(normalized)) return 'disable';
  if (/^(请|帮我)?(朗读|读一下)(回答|答案)$/.test(normalized)) return 'read';
  if (/^(请)?(停止朗读|停止播报|别读了)$/.test(normalized)) return 'stop';
  return 'question';
}

export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function recognitionConstructor(): (new () => Recognition) | undefined {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function speak(text: string): boolean {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
