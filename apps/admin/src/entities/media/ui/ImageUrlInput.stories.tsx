import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ImageUrlInput } from './ImageUrlInput';

/**
 * `usePermission('media', 'read')`를 호출해 PermissionProvider가 필요하므로
 * authenticated decorator 적용 (기본 full-access permissions).
 *
 * 내부의 MediaPicker는 [라이브러리] 버튼 클릭 시 열린다.
 * Storybook에서 media 목록 fetch는 MSW(Stage 7h) 이전이라 빈 상태.
 */
const meta = {
  title: 'Admin/Entities/Media/ImageUrlInput',
  component: ImageUrlInput,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    onChange: fn(),
    category: 'home',
  },
} satisfies Meta<typeof ImageUrlInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UrlOnly: Story = {
  args: {
    value: '',
    mediaId: null,
    originalName: null,
  },
};

export const WithExternalUrl: Story = {
  args: {
    value: 'https://picsum.photos/800/400',
    mediaId: null,
    originalName: null,
  },
};

export const WithLibraryMedia: Story = {
  args: {
    value: '/uploads/home/example.png',
    mediaId: 'story-media-1',
    originalName: 'example.png',
  },
};
