import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { SaveVersionButton } from './SaveVersionButton';

const meta = {
  title: 'Admin/Features/SubpageVersion/SaveVersionButton',
  component: SaveVersionButton,
  parameters: {
    layout: 'centered',
    authenticated: true,
  },
  args: {
    subpageId: 'story-subpage',
  },
} satisfies Meta<typeof SaveVersionButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

/**
 * 빈 메모로 저장하는 기본 플로우. `label`이 null로 POST되어도 서버가 허용해야 한다.
 */
export const OpenSaveSuccessEmptyLabel: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions': {
        status: 201,
        body: {
          success: true,
          data: { id: 'version-new' },
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(await canvas.findByRole('button', { name: /버전 저장/ }));

    await body.findByText('버전 저장', { selector: 'h2, h3' }).catch(() => null);
    const submitButtons = await body.findAllByRole('button', {
      name: '버전 저장',
    });
    // 마지막 버튼이 Dialog 내 submit (첫 번째는 trigger)
    const submit = submitButtons[submitButtons.length - 1];
    await userEvent.click(submit);

    await body.findByText('버전이 저장되었습니다.');
  },
};

/**
 * 깃 커밋 스타일 메모(subject + body) 입력 후 저장 → 성공 토스트.
 */
export const OpenSaveSuccessWithMemo: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions': {
        status: 201,
        body: {
          success: true,
          data: { id: 'version-new' },
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(
      await canvas.findByRole('button', { name: /버전 저장/ }),
    );

    const memoInput = await body.findByLabelText(/메모/);
    await userEvent.type(
      memoInput,
      'hero 이미지 교체{enter}{enter}- 히어로 이미지를 신버전으로 교체',
    );

    const submitButtons = await body.findAllByRole('button', {
      name: '버전 저장',
    });
    const submit = submitButtons[submitButtons.length - 1];
    await userEvent.click(submit);

    await body.findByText('버전이 저장되었습니다.');

    await waitFor(() => {
      expect(body.queryByLabelText(/메모/)).not.toBeInTheDocument();
    });
  },
};
