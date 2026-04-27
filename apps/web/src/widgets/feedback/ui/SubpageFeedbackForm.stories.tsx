import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { SubpageFeedbackForm } from './SubpageFeedbackForm';

const meta = {
  title: 'Web/Widgets/SubpageFeedback/Form',
  component: SubpageFeedbackForm,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof SubpageFeedbackForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 초기 상태 — 네/아니오 chip만 노출되고 Q1·Q2는 가려져 있다.
 */
export const Default: Story = {
  args: {
    subpageId: 'story-default',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const yes = canvas.getByRole('radio', { name: /네/ });
    const no = canvas.getByRole('radio', { name: /아니오/ });
    expect(yes).toBeInTheDocument();
    expect(no).toBeInTheDocument();
    expect(canvas.queryByText(/만족하셨나요\?/)).not.toBeInTheDocument();
  },
};

/**
 * "네" 선택 → Q1 체크박스 3개 + Q2 자유 텍스트가 노출되는지 검증.
 */
export const PositiveQuestionsVisible: Story = {
  args: {
    subpageId: 'story-positive',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: /네/ }));
    expect(
      canvas.getByText(/이 페이지의 어떤 점에 만족하셨나요\?/),
    ).toBeInTheDocument();
    expect(canvas.getByLabelText('필요한 정보를 찾음')).toBeInTheDocument();
    expect(canvas.getByLabelText('내용이 마음에 듦')).toBeInTheDocument();
    expect(canvas.getByLabelText('내용을 이해하기 쉬움')).toBeInTheDocument();
    expect(
      canvas.getByPlaceholderText('내용을 입력하세요'),
    ).toBeInTheDocument();
  },
};

/**
 * "아니오" 선택 → Q1(긍정 이유)는 노출되지 않고 Q2(자유 텍스트)만 노출되는지 검증.
 */
export const NegativeNoPositiveReasons: Story = {
  args: {
    subpageId: 'story-negative',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: /아니오/ }));
    expect(
      canvas.queryByText(/이 페이지의 어떤 점에 만족하셨나요\?/),
    ).not.toBeInTheDocument();
    expect(
      canvas.getByPlaceholderText('내용을 입력하세요'),
    ).toBeInTheDocument();
  },
};

/**
 * preview 세션 — UI는 노출하되 평가완료 버튼이 disabled.
 */
export const PreviewSubmitDisabled: Story = {
  args: {
    subpageId: 'story-preview',
    previewMode: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: /네/ }));
    const submit = canvas.getByRole('button', { name: '평가완료' });
    expect(submit).toBeDisabled();
    expect(
      canvas.getByText('미리보기 모드에서는 피드백을 제출할 수 없습니다.'),
    ).toBeInTheDocument();
  },
};

/**
 * 24h 내 이미 제출한 사용자 — localStorage marker가 있으면 처음부터 감사 메시지만 노출되고 form은 렌더되지 않는다.
 */
export const SubmittedThankYou: Story = {
  args: {
    subpageId: 'story-submitted',
  },
  decorators: [
    (Story) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'feedback_submitted_story-submitted',
          JSON.stringify({ submittedAt: Date.now() }),
        );
      }
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      await canvas.findByText('의견을 남겨주셔서 감사합니다.'),
    ).toBeInTheDocument();
    expect(
      canvas.queryByRole('radio', { name: /네/ }),
    ).not.toBeInTheDocument();
  },
};
