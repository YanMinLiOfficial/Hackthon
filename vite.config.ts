import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用相对 base，构建产物可在任意静态服务器/子路径下离线演示。
export default defineConfig({
  base: './',
  plugins: [react()],
});
