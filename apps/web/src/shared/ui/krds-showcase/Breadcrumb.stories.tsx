import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb } from 'krds-react';

/**
 * KRDS `Breadcrumb` showcase.
 *
 * 실제 사용처:
 * - `apps/web/src/pages/post/ui/PostPage.tsx` (홈 > 게시판 > 게시글)
 * - `apps/web/src/pages/board/ui/BoardPage.tsx` (홈 > 게시판)
 * - `apps/web/src/pages/search/ui/SearchPage.tsx` (홈 > 검색)
 */
const meta = {
  title: 'Web/KRDS/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '현재 위치 표시. Post/Board/Search 페이지에서 사용.',
      },
    },
  },
  args: {
    ariaLabel: '현재 위치',
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HomeBoardPost: Story = {
  args: {
    items: [
      { text: '홈', href: '/' },
      { text: '공지사항', href: '/board/notice' },
      { text: '서비스 개편 안내', href: '/board/notice/renewal' },
    ],
  },
};

export const HomeSearch: Story = {
  args: {
    items: [
      { text: '홈', href: '/' },
      { text: '검색', href: '/search' },
    ],
  },
};
