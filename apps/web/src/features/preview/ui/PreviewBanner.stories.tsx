import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { PreviewBanner } from './PreviewBanner';

const meta = {
  title: 'Web/Features/Preview/PreviewBanner',
  component: PreviewBanner,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PreviewBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12i — 미리보기 배너 기본 렌더.
 * label과 "미리보기 종료" 버튼이 존재하는지 확인.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('status')).toBeInTheDocument();
    expect(canvas.getByText(/미리보기 모드 — DRAFT 포함/)).toBeInTheDocument();
    expect(canvas.getByRole('button', { name: '미리보기 종료' })).toBeInTheDocument();
  },
};

/**
 * Stage 12i — 커스텀 label 렌더.
 */
export const CustomLabel: Story = {
  args: { label: '서브 페이지 미리보기' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText(/서브 페이지 미리보기 — DRAFT 포함/)).toBeInTheDocument();
  },
};

/**
 * Stage 12i — "미리보기 종료" 버튼 클릭 시 로딩 상태 전환.
 * fetch('/api/preview/exit')가 호출되고 버튼이 "종료 중..."으로 변경.
 * Storybook 환경에서는 fetch no-op이므로 에러 없이 완료되어야 함.
 */
export const ExitButtonLoading: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const exitBtn = canvas.getByRole('button', { name: '미리보기 종료' });
    await userEvent.click(exitBtn);
    // 클릭 후 버튼이 disabled + "종료 중..." 텍스트로 변경
    expect(canvas.getByRole('button', { name: '종료 중...' })).toBeDisabled();
  },
};
