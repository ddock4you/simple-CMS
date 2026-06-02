import type { Meta, StoryObj } from '@storybook/react';

import { BoardPage } from './BoardPage';

const navigationBranch = {
  rootLabel: '게시판',
  items: [],
  breadcrumbItems: [{ text: '공지사항', href: '/board/notice' }],
};

const basePosts = {
  total: 3,
  regularTotal: 3,
  totalPages: 1,
  page: 1,
  pageSize: 20,
};

const galleryItems = [
  {
    id: 'post-featured',
    title: '직접 선택한 썸네일 게시글',
    slug: 'featured-thumbnail',
    isImportant: false,
    publishedAt: new Date('2026-06-01T00:00:00.000Z'),
    thumbnailUrl: '/uploads/post-thumbnail/featured.jpg',
    thumbnailAlt: '직접 선택한 썸네일',
    author: { name: '관리자' },
  },
  {
    id: 'post-fallback',
    title: '본문 첫 이미지 fallback 게시글',
    slug: 'content-fallback',
    isImportant: false,
    publishedAt: new Date('2026-05-30T00:00:00.000Z'),
    thumbnailUrl: '/uploads/content/first-image.jpg',
    thumbnailAlt: '본문 첫 이미지',
    author: { name: '관리자' },
  },
  {
    id: 'post-placeholder',
    title: '이미지가 없는 게시글',
    slug: 'no-image',
    isImportant: false,
    publishedAt: new Date('2026-05-28T00:00:00.000Z'),
    thumbnailUrl: null,
    thumbnailAlt: null,
    author: null,
  },
];

const meta = {
  title: 'Web/Pages/BoardPage',
  component: BoardPage,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    query: '',
    navigationBranch,
  },
} satisfies Meta<typeof BoardPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GalleryWithThumbnails: Story = {
  args: {
    board: {
      name: '갤러리 게시판',
      slug: 'gallery',
      description:
        '대표 이미지와 본문 fallback 이미지를 확인하는 갤러리형 게시판입니다.',
      skinType: 'GALLERY',
    },
    posts: {
      ...basePosts,
      items: galleryItems,
    },
  },
};

export const GalleryWithoutImage: Story = {
  args: {
    board: {
      name: '이미지 없는 갤러리 게시판',
      slug: 'gallery-empty-image',
      description: null,
      skinType: 'GALLERY',
    },
    posts: {
      ...basePosts,
      total: 1,
      regularTotal: 1,
      items: [galleryItems[2]],
    },
  },
};

export const ListSkin: Story = {
  args: {
    board: {
      name: '목록형 게시판',
      slug: 'notice',
      description: '목록형은 썸네일을 표시하지 않습니다.',
      skinType: 'LIST',
    },
    posts: {
      ...basePosts,
      items: galleryItems,
    },
  },
};
