/**
 * CSS import 순서 엄수 — app/layout.tsx 재현.
 * 정규화된 KRDS CSS가 먼저 로드되어야 globals.css의 Tailwind utility가
 * `@layer krds-base` 위에 올라가며 override 가능해진다.
 */
import '../app/krds-normalized.css';
import '../app/globals.css';

import type { Preview } from '@storybook/react';

// web은 Server Component 중심이라 전역 Provider 없음.
// Pretendard CDN은 `.storybook/preview-head.html`에서 <link>로 삽입.
// `nextjs.appDirectory: true`는 `usePathname()`/`useRouter()` 등 next/navigation 훅을
// 쓰는 Client Component(RightSidebar 등)가 Storybook 환경에서 동작하도록 mock 제공.
const preview: Preview = {
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
