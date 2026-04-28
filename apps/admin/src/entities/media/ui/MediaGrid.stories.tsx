import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import type { MediaListItem } from '@simple-cms/types';

import { MediaGrid } from './MediaGrid';

const makeMedia = (id: string, mimeType: string): MediaListItem => ({
  id,
  filename: `${id}.${mimeType.split('/')[1]}`,
  originalFilename: `${id}.${mimeType.split('/')[1]}`,
  mimeType,
  size: 12345,
  url: `/uploads/${id}`,
  alt: null,
  contentHash: null,
  uploadedById: null,
  uploadedBy: null,
  createdAt: '2025-01-01T00:00:00.000Z',
});

const meta = {
  title: 'Admin/Entities/Media/MediaGrid',
  component: MediaGrid,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof MediaGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12h — items 빈 배열 시 빈 상태 문구 회귀 방어.
 */
export const EmptyState: Story = {
  args: { items: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('조건에 맞는 미디어가 없습니다.')).toBeInTheDocument();
  },
};

/**
 * Stage 12h — acceptMimeTypes 불일치 카드 disabled 회귀 방어.
 * PNG는 허용, SVG는 비허용 → SVG 카드 button disabled.
 */
export const MimeTypeDisabledCard: Story = {
  args: {
    items: [makeMedia('png-1', 'image/png'), makeMedia('svg-1', 'image/svg+xml')],
    acceptMimeTypes: ['image/png'],
    disabledReason: '이 형식은 선택할 수 없습니다.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = canvas.getAllByRole('button');
    const disabledButtons = buttons.filter(
      (btn) => (btn as HTMLButtonElement).disabled,
    );
    expect(disabledButtons).toHaveLength(1);
  },
};
