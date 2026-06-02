import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { GalleryCollectionSection } from './GalleryCollectionSection';

const meta = {
  title: 'Web/Features/HomeSection/GalleryCollectionSection',
  component: GalleryCollectionSection,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof GalleryCollectionSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CustomTabLabels: Story = {
  args: {
    section: {
      id: 'gallery-collection-1',
      sectionType: 'GALLERY_COLLECTION',
      config: {
        heading: '갤러리 모아보기',
        description: '주요 현장 사진과 콘텐츠를 한 곳에서 확인하세요.',
        boardIds: ['board-event', 'board-photo'],
        boardTabLabels: {
          'board-event': '행사 스케치',
          'board-photo': '현장 사진',
        },
        limit: 4,
      },
      moreHref: '/board/event',
      tabs: [
        {
          id: 'all',
          label: '전체',
          boardSlug: 'event',
          items: [
            {
              id: 'post-1',
              title: '봄맞이 지역 축제 현장',
              href: '/board/event/spring-festival',
              publishedAt: '2024-04-03T00:00:00.000Z',
              boardId: 'board-event',
              boardName: '행사 갤러리',
              thumbnailUrl: 'https://via.placeholder.com/640x360/2f6f5e/fff',
              thumbnailAlt: '봄맞이 지역 축제 현장',
            },
            {
              id: 'post-2',
              title: '주민 참여 프로그램 사진',
              href: '/board/photo/community-program',
              publishedAt: '2024-04-02T00:00:00.000Z',
              boardId: 'board-photo',
              boardName: '사진 게시판',
              thumbnailUrl: 'https://via.placeholder.com/640x360/36506c/fff',
              thumbnailAlt: '주민 참여 프로그램 사진',
            },
          ],
        },
        {
          id: 'board-event',
          label: '행사 스케치',
          boardSlug: 'event',
          items: [
            {
              id: 'post-1',
              title: '봄맞이 지역 축제 현장',
              href: '/board/event/spring-festival',
              publishedAt: '2024-04-03T00:00:00.000Z',
              boardId: 'board-event',
              boardName: '행사 갤러리',
              thumbnailUrl: 'https://via.placeholder.com/640x360/2f6f5e/fff',
              thumbnailAlt: '봄맞이 지역 축제 현장',
            },
          ],
        },
        {
          id: 'board-photo',
          label: '현장 사진',
          boardSlug: 'photo',
          items: [
            {
              id: 'post-2',
              title: '주민 참여 프로그램 사진',
              href: '/board/photo/community-program',
              publishedAt: '2024-04-02T00:00:00.000Z',
              boardId: 'board-photo',
              boardName: '사진 게시판',
              thumbnailUrl: 'https://via.placeholder.com/640x360/36506c/fff',
              thumbnailAlt: '주민 참여 프로그램 사진',
            },
          ],
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByRole('tab', { name: '전체' })).toBeInTheDocument();
    expect(
      canvas.getByRole('tab', { name: '행사 스케치' }),
    ).toBeInTheDocument();
    expect(canvas.getByRole('tab', { name: '현장 사진' })).toBeInTheDocument();
    expect(canvas.getByText('봄맞이 지역 축제 현장')).toBeInTheDocument();
    expect(canvas.getByText('2024. 04. 03.')).toBeInTheDocument();
    expect(canvas.queryByText('행사 갤러리')).not.toBeInTheDocument();
  },
};

export const EmptyActiveTab: Story = {
  args: {
    section: {
      ...CustomTabLabels.args.section,
      id: 'gallery-collection-empty',
      tabs: [
        {
          id: 'all',
          label: '전체',
          boardSlug: 'event',
          items: [],
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('표시할 게시글이 없습니다.')).toBeInTheDocument();
  },
};
