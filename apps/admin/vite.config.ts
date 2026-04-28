import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // Storybook browser-mode vitest 실행 중 dnd-kit deps가 처음 등장할 때
    // Vite가 on-the-fly 최적화 후 reload를 트리거해 테스트가 실패하는 문제 방지.
    include: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  },
});
