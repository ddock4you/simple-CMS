import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { UploadSettingsForm } from './UploadSettingsForm';

const meta = {
  title: 'Admin/Features/Settings/UploadSettingsForm',
  component: UploadSettingsForm,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof UploadSettingsForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12h — 허용 확장자 TagInput에 Enter로 태그 추가 → 저장 버튼 활성화 회귀 방어.
 * query 미응답 시 defaultValues([]) 기준 isDirty 판정.
 */
export const ExtensionTagAdded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const extInput = canvas.getByPlaceholderText(
      '.jpg, .png, .pdf 형식으로 입력 후 Enter',
    );
    await userEvent.click(extInput);
    await userEvent.type(extInput, '.webm');
    await userEvent.keyboard('{Enter}');
    const saveBtn = canvas.getByRole('button', { name: '저장' });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
  },
};
