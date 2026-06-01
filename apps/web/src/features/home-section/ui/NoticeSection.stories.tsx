import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { NoticeSection } from './NoticeSection';

const meta = {
  title: 'Web/Features/HomeSection/NoticeSection',
  component: NoticeSection,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof NoticeSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithImportant: Story = {
  args: {
    section: {
      id: 'notice-1',
      sectionType: 'NOTICE',
      config: {
        heading: '공지 알림',
        description: null,
        boardId: 'board-1',
        limit: 4,
      },
      boardName: '공지사항',
      boardSlug: 'notice',
      featuredItem: {
        id: 'post-important',
        title: '[충남 부여군] 무인민원발급기 서비스 운영 일시 중단 안내',
        href: '/board/notice/maintenance',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
        description: '중요 공지 요약입니다.',
      },
      items: Array.from({ length: 4 }, (_, index) => ({
        id: `post-${index}`,
        title: [
          '남서울대학교 동계방학 중 운영시간 단축 안내',
          '웨스트민스터신학대학원대학교 민원 발급시간 조정안내',
          'Microsoft Edge 최신버전에서 정부24 증명서의 PDF 저장 방법 안내',
          '자동차배출가스 종합전산시스템 전산작업에 따른 일부 서비스 중단 안내',
        ][index],
        href: `/board/notice/post-${index}`,
        publishedAt: new Date('2024-01-02T00:00:00Z'),
        description:
          '콘텐츠 영역 최대 2줄까지 콘텐츠 영역 최대 2줄까지 콘텐츠 영역 최대 2줄까지',
      })),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('공지 알림')).toBeInTheDocument();
    expect(canvas.getByText('공지')).toBeInTheDocument();
    expect(canvas.getByRole('link', { name: /더보기/ })).toHaveAttribute(
      'href',
      '/board/notice',
    );
    expect(
      canvas.getByText('남서울대학교 동계방학 중 운영시간 단축 안내'),
    ).toBeInTheDocument();
  },
};

export const WithoutImportant: Story = {
  args: {
    section: {
      ...WithImportant.args.section,
      id: 'notice-2',
      featuredItem: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByText('공지')).not.toBeInTheDocument();
    expect(
      canvas.getByText('남서울대학교 동계방학 중 운영시간 단축 안내'),
    ).toBeInTheDocument();
  },
};

export const LegacyManualItems: Story = {
  args: {
    section: {
      id: 'notice-legacy',
      sectionType: 'NOTICE',
      config: {
        heading: '공지 알림',
        description: null,
        boardId: null,
        limit: 2,
        items: [
          { label: '수동 공지 항목', url: '/p/about', date: '2024-01-01' },
          { label: '외부 링크 공지', url: 'https://example.com', date: null },
        ],
      },
      boardName: null,
      boardSlug: null,
      featuredItem: null,
      items: [],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('수동 공지 항목')).toBeInTheDocument();
    expect(
      canvas.queryByRole('link', { name: /더보기/ }),
    ).not.toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: {
    section: {
      id: 'notice-empty',
      sectionType: 'NOTICE',
      config: {
        heading: '공지 알림',
        description: null,
        boardId: 'board-1',
        limit: 4,
      },
      boardName: '공지사항',
      boardSlug: 'notice',
      featuredItem: null,
      items: [],
    },
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('section')).toBeNull();
  },
};
