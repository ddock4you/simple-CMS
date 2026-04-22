import type { Meta, StoryObj } from '@storybook/react';

import { KoglFooter } from './KoglFooter';

/**
 * 공공누리(KOGL) 라이선스 마크. `cclType === null`이면 표시 안 함.
 * 실제 마크 이미지는 `apps/web/public/assets/kogl/`에 배치 (운영이 공식 사이트에서 다운로드).
 * 이미지가 없는 환경에서는 빈 alt 박스로 렌더됨 — smoke 범위에는 무방.
 */
const meta = {
  title: 'Web/Widgets/KoglFooter',
  component: KoglFooter,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof KoglFooter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Type0: Story = {
  args: {
    cclType: 'TYPE_0',
    cclAi: false,
  },
};

export const Type1: Story = {
  args: {
    cclType: 'TYPE_1',
    cclAi: false,
  },
};

export const Type2: Story = {
  args: {
    cclType: 'TYPE_2',
    cclAi: false,
  },
};

export const Type3: Story = {
  args: {
    cclType: 'TYPE_3',
    cclAi: false,
  },
};

export const Type4: Story = {
  args: {
    cclType: 'TYPE_4',
    cclAi: false,
  },
};

export const WithAI: Story = {
  args: {
    cclType: 'TYPE_1',
    cclAi: true,
  },
};

export const Hidden: Story = {
  args: {
    cclType: null,
    cclAi: false,
  },
};
