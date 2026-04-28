import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from 'storybook/test';

import { MediaPagination } from './MediaPagination';

const meta = {
  title: 'Admin/Entities/Media/MediaPagination',
  component: MediaPagination,
  parameters: {
    layout: 'padded',
  },
  args: {
    pageSize: 10,
    total: 25,
    onPageChange: fn(),
  },
} satisfies Meta<typeof MediaPagination>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12h — 1페이지: 이전 버튼 disabled, 다음 버튼 활성 회귀 방어.
 */
export const FirstPageNavigation: Story = {
  args: { page: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: /이전/ })).toBeDisabled();
    expect(canvas.getByRole('button', { name: /다음/ })).not.toBeDisabled();
  },
};

/**
 * Stage 12h — 마지막 페이지(3/3): 이전 버튼 활성, 다음 버튼 disabled 회귀 방어.
 */
export const LastPageNavigation: Story = {
  args: { page: 3 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: /이전/ })).not.toBeDisabled();
    expect(canvas.getByRole('button', { name: /다음/ })).toBeDisabled();
  },
};
