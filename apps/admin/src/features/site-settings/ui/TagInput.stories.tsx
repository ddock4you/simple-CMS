import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TagInput } from './TagInput';

const meta = {
  title: 'Admin/Features/Settings/TagInput',
  component: TagInput,
  parameters: {
    layout: 'padded',
  },
  args: {
    value: [],
    onChange: fn(),
  },
} satisfies Meta<typeof TagInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12h — Enter 키로 태그 추가 시 onChange 호출 회귀 방어.
 * value prop은 fn()으로 실제 업데이트 안 되므로 호출 인자 검증.
 */
export const AddTagOnEnter: Story = {
  args: {
    value: [],
    onChange: fn(),
    placeholder: '.jpg, .png 형식으로 입력 후 Enter',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.type(input, '.webm');
    await userEvent.keyboard('{Enter}');
    expect(args.onChange).toHaveBeenCalledWith(['.webm']);
  },
};

/**
 * Stage 12h — X 버튼 클릭으로 태그 제거 시 onChange 호출 회귀 방어.
 */
export const RemoveTag: Story = {
  args: {
    value: ['.jpg', '.png'],
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const removeButtons = canvas.getAllByRole('button');
    await userEvent.click(removeButtons[0]);
    expect(args.onChange).toHaveBeenCalledWith(['.png']);
  },
};
