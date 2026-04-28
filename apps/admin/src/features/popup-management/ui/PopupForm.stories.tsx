import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { PopupForm } from './PopupForm';

const meta = {
  title: 'Admin/Features/Popup/PopupForm',
  component: PopupForm,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof PopupForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12i — 팝업 제목 입력 시 저장 버튼 활성화 회귀 방어.
 * mode='create', 기본 CONTENT 타입. isDirty 기반 버튼 활성화 검증.
 */
export const CreateContentType: Story = {
  args: { mode: 'create' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const titleInput = canvas.getByLabelText(/제목/);
    const saveBtn = canvas.getByRole('button', { name: '저장' });

    expect(saveBtn).toBeDisabled();
    await userEvent.click(titleInput);
    await userEvent.type(titleInput, '신규 팝업');
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
  },
};

/**
 * Stage 12i — 편집 모드 초기 데이터 렌더 확인.
 */
export const EditModeInitialData: Story = {
  args: {
    mode: 'edit',
    initialData: {
      id: 'popup-1',
      title: '이벤트 안내',
      popupType: 'CONTENT' as const,
      isVisible: true,
      startDate: null,
      endDate: null,
      displayOrder: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      contentJson: null,
      content: null,
      imageUrl: null,
      imageAlt: null,
      imageMediaId: null,
      linkUrl: null,
      buttonLabel: null,
      hasContent: false,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByDisplayValue('이벤트 안내')).toBeInTheDocument();
  },
};
