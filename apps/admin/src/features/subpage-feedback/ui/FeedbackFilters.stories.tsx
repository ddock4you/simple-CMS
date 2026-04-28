import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { FeedbackFilters } from './FeedbackFilters';

const MOCK_SUBPAGE_OPTIONS = [
  { id: 'sp-1', title: '소개 페이지', slug: 'about' },
  { id: 'sp-2', title: '공지사항 안내', slug: 'notice-info' },
];

const meta = {
  title: 'Admin/Features/Feedback/FeedbackFilters',
  component: FeedbackFilters,
  parameters: { layout: 'padded' },
  args: {
    currentRating: 'ALL',
    currentSubpageId: null,
    currentFrom: null,
    currentTo: null,
    currentQ: null,
    subpageOptions: MOCK_SUBPAGE_OPTIONS,
  },
} satisfies Meta<typeof FeedbackFilters>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12i — 필터 UI 렌더 smoke 테스트.
 * DatePicker 2개 + 평가 Select + 서브페이지 Select + 검색 Input 존재 확인.
 */
export const DefaultRender: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // DatePicker는 <button>으로 렌더 (placeholder 아님)
    expect(canvas.getByRole('button', { name: /시작일/ })).toBeInTheDocument();
    expect(canvas.getByRole('button', { name: /종료일/ })).toBeInTheDocument();
    expect(canvas.getByPlaceholderText('코멘트 검색')).toBeInTheDocument();
    expect(canvas.getByText('평가 전체')).toBeInTheDocument();
    expect(canvas.getByText('서브페이지 전체')).toBeInTheDocument();
  },
};

/**
 * Stage 12i — 검색 입력 필드 타이핑 회귀 방어.
 * 검색어 입력 후 엔터 시 폼 submit (router.push 호출).
 */
export const SearchQueryInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText('코멘트 검색');
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, '불편해요');
    expect(searchInput).toHaveValue('불편해요');
    await userEvent.keyboard('{Enter}');
    // router.push는 storybook 환경에서 no-op — 에러 없이 완료되어야 함
  },
};
