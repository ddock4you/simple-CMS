import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { BoardForm } from './BoardForm';

const meta = {
  title: 'Admin/Features/Board/BoardForm',
  component: BoardForm,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof BoardForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12i — 게시판 생성 폼 기본 렌더 + 이름 입력 smoke 테스트.
 * create 모드에서 저장 버튼은 처음부터 활성화(isCreate=true → disabled 조건 비적용).
 * 이름 필드에 값 입력 후 값 반영 확인.
 */
export const CreateModeNameInput: Story = {
  args: { mode: 'create' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nameInput = canvas.getByLabelText(/게시판 이름|이름/);
    const saveBtn = canvas.getByRole('button', { name: '저장' });

    // create 모드: 저장 버튼은 처음부터 활성화
    expect(saveBtn).not.toBeDisabled();
    await userEvent.click(nameInput);
    await userEvent.type(nameInput, '공지사항');
    await waitFor(() => expect(nameInput).toHaveValue('공지사항'));
  },
};

/**
 * Stage 12i — 편집 모드에서 초기 데이터 렌더 확인.
 */
export const EditModeInitialData: Story = {
  args: {
    mode: 'edit',
    initialData: {
      id: 'board-1',
      name: '공지사항',
      slug: 'notice',
      description: '공지사항 게시판',
      skinType: 'LIST' as const,
      isPublic: true,
      displayOrder: 1,
      postCount: 3,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByDisplayValue('공지사항')).toBeInTheDocument();
    expect(canvas.getByDisplayValue('notice')).toBeInTheDocument();
  },
};
