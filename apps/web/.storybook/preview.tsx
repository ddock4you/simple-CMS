/**
 * CSS import 순서 엄수 — app/layout.tsx 재현.
 * krds-react가 먼저 로드되어야 globals.css의 Tailwind utility가
 * `@layer krds-base` 위에 올라가며 override 가능해진다.
 */
import 'krds-react/dist/index.css';
import '../app/globals.css';

import type { Preview } from '@storybook/react';

// web은 Server Component 중심이라 전역 Provider 없음.
// Pretendard CDN은 `.storybook/preview-head.html`에서 <link>로 삽입.
const preview: Preview = {
  parameters: {
    layout: 'padded',
  },
};

export default preview;
