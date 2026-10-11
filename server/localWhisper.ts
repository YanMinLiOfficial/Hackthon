import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

export function localWhisperPlugin(pythonPath?: string, modelPath?: string): Plugin {
  const python = pythonPath || join(homedir(), '.bilibili-mcp/asr/venv/bin/python');
  const model = modelPath || join(homedir(), '.bilibili-mcp/asr/models');
  let busy = false;
  const send = (res: ServerResponse, status: number, payload: unknown) => {
    if (res.destroyed) return;
    res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') { send(res, 405, { error: '仅支持 POST' }); return; }
    if (!existsSync(python) || !existsSync(join(model, 'model.bin'))) {
      send(res, 503, { error: '本机 Whisper 未配置，请设置 LOCAL_ASR_PYTHON 和 LOCAL_ASR_MODEL' }); return;
    }
    if (busy) { send(res, 429, { error: '本地识别正在处理，请稍后重试' }); return; }
    if (!/^audio\/(webm|mp4|ogg|wav|x-wav|mpeg)(;|$)/i.test(req.headers['content-type'] ?? '')) {
      send(res, 415, { error: '不支持的音频格式' }); return;
    }
    busy = true;
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 4 * 1024 * 1024) { send(res, 413, { error: '录音超过 4 MB' }); return; }
        chunks.push(Buffer.from(chunk));
      }
      if (!size) { send(res, 400, { error: '录音为空' }); return; }
      const result = await new Promise<string>((resolve, reject) => {
        const child = spawn(python, [join(process.cwd(), 'server/transcribe.py'), model], { stdio: ['pipe', 'pipe', 'pipe'] });
        const timer = setTimeout(() => child.kill(), 60_000);
        let output = '';
        const disconnected = () => { if (!res.writableEnded) child.kill(); };
        res.on('close', disconnected);
        child.stdout.on('data', (data: Buffer) => { output += data.toString(); });
        child.stderr.resume();
        child.stdin.on('error', () => { /* process exit handled below */ });
        child.on('error', (error) => { clearTimeout(timer); res.off('close', disconnected); reject(error); });
        child.on('close', (code) => {
          clearTimeout(timer); res.off('close', disconnected);
          if (code === 0) resolve(output); else reject(new Error('ASR failed'));
        });
        child.stdin.end(Buffer.concat(chunks));
      });
      const payload = JSON.parse(result) as { text: string; engine: string };
      if (typeof payload.text !== 'string') throw new Error('Invalid ASR output');
      send(res, 200, payload);
    } catch { send(res, 502, { error: '本地 Whisper 识别失败，请重录或检查模型环境（音频最长 25 秒）' }); }
    finally { busy = false; }
  };
  const install = (server: { middlewares: { use: (route: string, fn: typeof handler) => void } }) => {
    server.middlewares.use('/api/local-asr', handler);
  };
  return { name: 'local-whisper', configureServer: install, configurePreviewServer: install };
}
