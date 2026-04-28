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
    // Storybook browser-mode vitest 실행 중 tiptap/dompurify deps가 처음 등장할 때
    // Vite가 on-the-fly 최적화 후 reload를 트리거해 브라우저 세션이 disconnect되는 문제 방지.
    // @simple-cms/editor가 workspace package(source)라 entry 분석에서 누락되므로
    // 그 의존성인 tiptap 패키지군을 명시적으로 포함 (admin @dnd-kit 수정과 동일 패턴).
    include: [
      '@tiptap/html',
      '@tiptap/core',
      '@tiptap/starter-kit',
      '@tiptap/extension-color',
      '@tiptap/extension-highlight',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-subscript',
      '@tiptap/extension-superscript',
      '@tiptap/extension-table',
      '@tiptap/extension-table-cell',
      '@tiptap/extension-table-header',
      '@tiptap/extension-table-row',
      '@tiptap/extension-task-item',
      '@tiptap/extension-task-list',
      '@tiptap/extension-text-align',
      '@tiptap/extension-text-style',
      'isomorphic-dompurify',
    ],
  },
});
