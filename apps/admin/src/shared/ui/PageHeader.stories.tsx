import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { Plus, ArrowLeft, Settings } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';

import { PageHeader } from './PageHeader';

const meta = {
  title: 'Admin/Shared/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '대시보드',
  },
};

export const WithDescription: Story = {
  args: {
    title: '서브 페이지',
    description: '서브 페이지를 관리합니다.',
  },
};

export const WithBack: Story = {
  args: {
    back: (
      <Button variant="ghost" size="sm" type="button">
        <ArrowLeft className="size-4" />
        목록으로
      </Button>
    ),
    title: '서브 페이지 편집',
    description: '기본 정보, 발행 상태, SEO를 관리합니다.',
  },
};

export const WithActions: Story = {
  args: {
    title: '서브 페이지',
    description: '서브 페이지를 관리합니다.',
    actions: (
      <Button type="button" size="sm">
        <Plus className="size-4" />
        새 서브 페이지
      </Button>
    ),
  },
};

export const WithTabs: Story = {
  args: {
    title: '사이트 설정',
    tabs: (
      <nav className="flex gap-1">
        {['도메인', '보안', '업로드', '권한', '브랜딩', 'SEO'].map((t) => (
          <button
            key={t}
            type="button"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted first:bg-muted first:text-foreground"
          >
            {t}
          </button>
        ))}
      </nav>
    ),
  },
};

export const Full: Story = {
  args: {
    back: (
      <Button variant="ghost" size="sm" type="button">
        <ArrowLeft className="size-4" />
        목록으로
      </Button>
    ),
    title: '서브 페이지 편집',
    description: '기본 정보, 발행 상태, SEO를 한 번에 저장합니다.',
    actions: (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" type="button">
          <Settings className="size-4" />
          추가 설정
        </Button>
        <Button size="sm" type="button">
          저장
        </Button>
      </div>
    ),
  },
};

export const Sticky: Story = {
  args: {
    title: '대시보드',
    description: 'md+(768px↑) 뷰포트에서 sticky 동작을 검증합니다.',
    sticky: true,
  },
  play: async ({ canvasElement }) => {
    const header = within(canvasElement).getByTestId('page-header');
    const style = window.getComputedStyle(header);
    if (window.innerWidth >= 768) {
      expect(style.position).toBe('sticky');
    } else {
      expect(style.position).not.toBe('sticky');
    }
  },
};

export const NonSticky: Story = {
  args: {
    title: '모달 내 헤더 (sticky 비활성)',
    description: '모달이나 특수 레이아웃에서 sticky 없이 사용.',
    sticky: false,
  },
  play: async ({ canvasElement }) => {
    const header = within(canvasElement).getByTestId('page-header');
    const style = window.getComputedStyle(header);
    expect(style.position).not.toBe('sticky');
  },
};
