import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { deepSeekProxyPlugin } from './server/deepseekProxy';
import { localWhisperPlugin } from './server/localWhisper';

// 使用相对 base，构建产物可在任意静态服务器/子路径下离线演示。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [
      react(),
      deepSeekProxyPlugin(env.DEEPSEEK_API_KEY ?? '', env.DEEPSEEK_MODEL || 'deepseek-flash'),
      localWhisperPlugin(env.LOCAL_ASR_PYTHON, env.LOCAL_ASR_MODEL),
    ],
  };
});
