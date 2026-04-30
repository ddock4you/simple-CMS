import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import { Plus, Search } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';

import { PageToolbar } from './PageToolbar';

const meta = {
  title: 'Admin/Shared/PageToolbar',
  component: PageToolbar,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof PageToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const FilterButtons = () => (
  <div className="flex gap-2">
    {['전체', '초안', '발행'].map((label) => (
      <Button key={label} variant="outline" size="sm">
        {label}
      </Button>
    ))}
  </div>
);

const SearchInput = () => (
  <div className="relative">
    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
    <Input className="pl-8" placeholder="검색..." />
  </div>
);

const NewButton = () => (
  <Button size="sm">
    <Plus className="size-4" />
    새 항목
  </Button>
);

export const Default: Story = {
  args: {
    left: <FilterButtons />,
    right: <NewButton />,
  },
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByTestId('page-toolbar');
    expect(toolbar).toBeInTheDocument();
  },
};

export const LeftOnly: Story = {
  args: {
    left: <FilterButtons />,
  },
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByTestId('page-toolbar');
    expect(toolbar).toBeInTheDocument();
  },
};

export const RightOnly: Story = {
  args: {
    right: <NewButton />,
  },
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByTestId('page-toolbar');
    expect(toolbar).toBeInTheDocument();
  },
};

export const MobileCollapseDefault: Story = {
  args: {
    left: <FilterButtons />,
    right: <NewButton />,
  },
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByTestId('page-toolbar');
    expect(toolbar).toBeInTheDocument();

    // Storybook 기본 뷰포트(1280px)는 md+(768px↑) — inline 슬롯이 보이고 Sheet 트리거는 숨김
    // 필터 버튼과 새 항목 버튼이 인라인으로 표시됨을 검증
    expect(within(toolbar).getByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: '새 항목' })).toBeInTheDocument();

    // md+ 뷰포트에서 Sheet 트리거 버튼은 DOM에 없어야 함 (md:hidden)
    expect(within(toolbar).queryByRole('button', { name: /검색·필터/ })).not.toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: /관리/ })).not.toBeInTheDocument();
  },
};

export const MobileCollapseLeftFalse: Story = {
  args: {
    left: <SearchInput />,
    right: <NewButton />,
    mobileCollapseLeft: false,
  },
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByTestId('page-toolbar');
    expect(toolbar).toBeInTheDocument();
    // mobileCollapseLeft=false이면 검색·필터 트리거 버튼 없음
    const filterTrigger = within(toolbar).queryByRole('button', {
      name: /검색·필터/,
    });
    expect(filterTrigger).not.toBeInTheDocument();
  },
};

export const Sticky: Story = {
  args: {
    left: <FilterButtons />,
    right: <NewButton />,
    sticky: true,
  },
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByTestId('page-toolbar');
    const style = window.getComputedStyle(toolbar);
    expect(style.position).toBe('sticky');
    // 14a-3: border-b 제거 후 shadow-sm이 sticky 분기에서 적용됨을 보장
    expect(style.boxShadow).not.toBe('none');
  },
};

export const NonSticky: Story = {
  args: {
    left: <FilterButtons />,
    right: <NewButton />,
    sticky: false,
  },
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByTestId('page-toolbar');
    const style = window.getComputedStyle(toolbar);
    expect(style.position).not.toBe('sticky');
  },
};

export const Full: Story = {
  args: {
    left: (
      <div className="flex gap-2">
        <FilterButtons />
        <SearchInput />
      </div>
    ),
    right: (
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          내보내기
        </Button>
        <NewButton />
      </div>
    ),
    mobileLeftLabel: '필터 · 검색',
    mobileRightLabel: '액션',
  },
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByTestId('page-toolbar');
    expect(toolbar).toBeInTheDocument();
  },
};
