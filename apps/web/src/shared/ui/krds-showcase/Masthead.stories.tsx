import type { Meta, StoryObj } from '@storybook/react';
import { Masthead } from 'krds-react';

/**
 * KRDS `Masthead` showcase — 정부 누리집 안내 배너.
 *
 * 실제 사용처: `apps/web/src/widgets/layout/ui/PageLayout.tsx`
 */
const meta = {
  title: 'Web/KRDS/Masthead',
  component: Masthead,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '대한민국 공식 전자정부 누리집 안내 배너. 모든 공개 웹 페이지 최상단에 고정.',
      },
    },
  },
} satisfies Meta<typeof Masthead>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  args: {
    text: '이 누리집은 대한민국 공식 전자정부 누리집입니다.',
  },
};
