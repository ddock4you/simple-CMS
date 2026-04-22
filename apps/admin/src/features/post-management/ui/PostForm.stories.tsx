import type { Meta, StoryObj } from '@storybook/react';

import type { PostDetail } from '../model/postFilters';
import { PostForm } from './PostForm';

/**
 * `useQuery(boardOptionsQuery())`가 초기 렌더에서 fetch를 시도하지만
 * Storybook 환경에서는 MSW(Stage 7h) 이전이라 실패하고 `retry: false`로 즉시 종료.
 * 드롭다운은 "게시판 선택" placeholder만 표시 — smoke 범위에는 문제 없음.
 */
const draftPost: PostDetail = {
  id: 'story-post-1',
  title: '공지사항 초안',
  slug: 'notice-draft',
  boardId: 'story-board-1',
  boardName: '공지사항',
  boardSlug: 'notice',
  contentJson: null,
  status: 'DRAFT',
  authorId: 'story-author-1',
  authorName: '관리자',
  publishedAt: null,
  displayOrder: 1,
  createdAt: '2026-04-10T00:00:00.000Z',
  updatedAt: '2026-04-10T00:00:00.000Z',
};

const publishedPost: PostDetail = {
  ...draftPost,
  id: 'story-post-2',
  title: '공지사항 발행본',
  slug: 'notice-published',
  status: 'PUBLISHED',
  publishedAt: '2026-04-11T00:00:00.000Z',
  updatedAt: '2026-04-11T00:00:00.000Z',
};

const meta = {
  title: 'Admin/Features/Post/PostForm',
  component: PostForm,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof PostForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    mode: 'create',
  },
};

export const Draft: Story = {
  args: {
    mode: 'edit',
    initialData: draftPost,
  },
};

export const Published: Story = {
  args: {
    mode: 'edit',
    initialData: publishedPost,
  },
};
