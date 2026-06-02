import type { Meta, StoryObj } from '@storybook/react';

import { SearchResultItem } from './SearchResultItem';

const meta = {
  title: 'Web/Pages/SearchResultItem',
  component: SearchResultItem,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <ul className="m-0 max-w-[960px] list-none p-0">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof SearchResultItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Subpage: Story = {
  args: {
    item: {
      id: 'subpage-1',
      type: 'subpage',
      title: '퇴직급여 안내 페이지',
      excerpt:
        '퇴직급여는 근로자가 상당한 기간을 근속하고 퇴직할 경우 지급되는 연금 또는 일시금입니다.',
      slug: 'retirement-guide',
      publishedAt: new Date('2026-06-01T00:00:00.000Z'),
      score: 1,
      boardName: null,
      boardSlug: null,
    },
  },
};

export const Post: Story = {
  args: {
    item: {
      id: 'post-1',
      type: 'post',
      title: '정부혁신과 적극행정 우수사례를 확산합니다',
      excerpt:
        '외국인 근로자 퇴직금 자동환급제는 사전 등록 계좌에 퇴직금을 자동 지급하는 제도입니다.',
      slug: 'innovation-case',
      publishedAt: new Date('2026-05-20T00:00:00.000Z'),
      score: 1,
      boardName: '공지사항',
      boardSlug: 'notice',
    },
  },
};
