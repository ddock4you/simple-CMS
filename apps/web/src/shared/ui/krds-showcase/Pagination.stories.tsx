import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from 'krds-react';
import { fn } from 'storybook/test';

/**
 * KRDS `Pagination` showcase.
 *
 * 실제 사용처: `apps/web/src/shared/ui/PaginationNav.tsx`
 * 이 프로젝트는 `boundaryCount={1}`, `siblingCount={1}` 고정.
 */
const meta = {
  title: 'Web/KRDS/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '게시판/검색 페이지네이션. `apps/web/src/shared/ui/PaginationNav.tsx`에서 useRouter로 ?page= 쿼리 파라미터 조작.',
      },
    },
  },
  args: {
    onChange: fn(),
    boundaryCount: 1,
    siblingCount: 1,
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Page5Of10: Story = {
  args: {
    totalPages: 10,
    currentPage: 5,
  },
};

export const FirstPage: Story = {
  args: {
    totalPages: 10,
    currentPage: 1,
  },
};

export const LastPage: Story = {
  args: {
    totalPages: 10,
    currentPage: 10,
  },
};
