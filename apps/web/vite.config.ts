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
    // 그 의존성인 tiptap 패키지군을 명시적으로 포함한다. pnpm에서는 tiptap이
    // web의 직접 dependency가 아니므로 Vite의 nested dependency 표기를 사용한다.
    include: [
      '@simple-cms/editor > @tiptap/html',
      '@simple-cms/editor > @tiptap/core',
      '@simple-cms/editor > @tiptap/starter-kit',
      '@simple-cms/editor > @tiptap/extension-color',
      '@simple-cms/editor > @tiptap/extension-highlight',
      '@simple-cms/editor > @tiptap/extension-link',
      '@simple-cms/editor > @tiptap/extension-placeholder',
      '@simple-cms/editor > @tiptap/extension-subscript',
      '@simple-cms/editor > @tiptap/extension-superscript',
      '@simple-cms/editor > @tiptap/extension-table',
      '@simple-cms/editor > @tiptap/extension-table-cell',
      '@simple-cms/editor > @tiptap/extension-table-header',
      '@simple-cms/editor > @tiptap/extension-table-row',
      '@simple-cms/editor > @tiptap/extension-task-item',
      '@simple-cms/editor > @tiptap/extension-task-list',
      '@simple-cms/editor > @tiptap/extension-text-align',
      '@simple-cms/editor > @tiptap/extension-text-style',
      'isomorphic-dompurify',
    ],
  },
});
