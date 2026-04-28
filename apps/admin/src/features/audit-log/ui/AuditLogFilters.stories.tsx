import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { AuditLogFilters } from './AuditLogFilters';

const meta = {
  title: 'Admin/Features/AuditLog/AuditLogFilters',
  component: AuditLogFilters,
  parameters: {
    layout: 'padded',
    fetchMock: {
      '/api/users': {
        status: 200,
        body: {
          success: true,
          data: {
            users: [
              { id: 'user-1', name: '홍길동', username: 'hong' },
              { id: 'user-2', name: '김관리', username: 'kim' },
            ],
            total: 2,
          },
        },
      },
    },
  },
  args: {
    currentAction: 'ALL' as const,
    currentEntityType: null,
    currentUserId: null,
    currentFrom: null,
    currentTo: null,
  },
} satisfies Meta<typeof AuditLogFilters>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12i — 감사 로그 필터 UI 렌더 smoke 테스트.
 * DatePicker 2개 + 액션 Select + 대상 타입 Select + 사용자 Select 존재 확인.
 */
export const DefaultRender: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // DatePicker는 <button>으로 렌더 (placeholder 아님)
    expect(canvas.getByRole('button', { name: /시작일/ })).toBeInTheDocument();
    expect(canvas.getByRole('button', { name: /종료일/ })).toBeInTheDocument();
    expect(canvas.getByText('전체 액션')).toBeInTheDocument();
    expect(canvas.getByText('전체 대상')).toBeInTheDocument();
    expect(canvas.getByText('전체 사용자')).toBeInTheDocument();
  },
};

/**
 * Stage 12i — 특정 액션 필터가 선택된 상태 렌더.
 * CREATE 필터 적용 시 Select 트리거에 "생성" 표시.
 */
export const WithActionFilter: Story = {
  args: { currentAction: 'CREATE' as const },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('생성')).toBeInTheDocument();
  },
};
