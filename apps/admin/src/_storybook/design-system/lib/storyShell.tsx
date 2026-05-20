'use client';

import type { Decorator } from '@storybook/react';

/**
 * Design System stories 공용 outer 패딩.
 *
 * 모든 stories의 meta.decorators에 등록하여 viewport edge ↔ 콘텐츠 사이 여백을 통일한다.
 * 각 stories는 자체 max-width + mx-auto만 결정하고 outer padding은 책임지지 않는다.
 *
 * - 모바일: px-6 py-8 (24px / 32px)
 * - 데스크톱: md:px-10 md:py-12 (40px / 48px)
 */
export const storyShellDecorator: Decorator = (Story) => (
  <div className="px-6 py-8 md:px-10 md:py-12">
    <Story />
  </div>
);
