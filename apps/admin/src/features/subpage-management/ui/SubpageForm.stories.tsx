import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import type { SubpageDetail } from '../model/subpageFilters';
import { SubpageForm } from './SubpageForm';

const cclType1InitialData: SubpageDetail = {
  id: 'story-subpage-1',
  title: '공공 데이터 소개',
  slug: 'public-data-intro',
  seoTitle: '공공 데이터 소개 | Simple CMS',
  seoDescription: '정부 공공 데이터의 개요와 활용 안내',
  status: 'PUBLISHED',
  publishedAt: '2026-04-01T00:00:00.000Z',
  cclType: 'TYPE_1',
  cclAi: true,
  displayOrder: 1,
  revision: 0,
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

const meta = {
  title: 'Admin/Features/Subpage/SubpageForm',
  component: SubpageForm,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof SubpageForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 7h 작업 1 — CCL 라디오 → AI 체크박스 superRefine 조건부 활성화 검증.
 * 초기 cclType=null이면 AI 체크박스 disabled. TYPE_1 라디오 선택 시 enabled 전환 →
 * 사용자가 AI 체크 가능. superRefine의 "null + true 조합 차단" 전제 조건이 UI에서
 * 강제되는지 회귀 방어.
 */
export const Empty: Story = {
  args: {
    mode: 'create',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const aiCheckbox = canvas.getByLabelText('AI 학습·활용 가능 표시');

    // 1. 초기: cclType=null → AI 체크박스 disabled
    expect(aiCheckbox).toBeDisabled();

    // 2. "제1유형" 라디오 선택 → cclType=TYPE_1
    await userEvent.click(canvas.getByLabelText('제1유형'));

    // 3. AI 체크박스 활성화(disabled 해제) 확인
    expect(aiCheckbox).not.toBeDisabled();
  },
};

export const WithCCLType1: Story = {
  args: {
    mode: 'edit',
    initialData: cclType1InitialData,
  },
};
