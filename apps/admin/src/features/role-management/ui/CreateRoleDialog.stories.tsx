import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { CreateRoleDialog } from './CreateRoleDialog';

/**
 * authenticated decorator 실행 경로를 처음 돌려본 Stage 7g story.
 * Stage 7j에서 fetchStubDecorator 기반 submit 성공/실패 분기 play function 추가.
 */
const meta = {
  title: 'Admin/Features/Role/CreateRoleDialog',
  component: CreateRoleDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof CreateRoleDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SubmitSuccess: Story = {
  parameters: {
    fetchMock: {
      '/api/roles': {
        status: 201,
        body: {
          success: true,
          data: {
            id: 'role-new',
            name: 'Editor',
            description: null,
            permissions: {},
          },
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(await canvas.findByRole('button', { name: /새 역할/ }));

    const nameInput = await body.findByLabelText('역할명');
    await userEvent.type(nameInput, 'Editor');

    await userEvent.click(await body.findByRole('button', { name: '생성' }));

    await body.findByText('역할이 생성되었습니다.');

    await waitFor(() => {
      expect(body.queryByText('새 역할 추가')).not.toBeInTheDocument();
    });
  },
};

export const SubmitConflict: Story = {
  parameters: {
    fetchMock: {
      '/api/roles': {
        status: 409,
        body: {
          success: false,
          error: '이미 사용 중인 역할명입니다.',
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(await canvas.findByRole('button', { name: /새 역할/ }));

    const nameInput = await body.findByLabelText('역할명');
    await userEvent.type(nameInput, 'Admin');

    await userEvent.click(await body.findByRole('button', { name: '생성' }));

    await body.findByText('이미 사용 중인 역할명입니다.');

    await expect(body.getByText('새 역할 추가')).toBeInTheDocument();
  },
};
