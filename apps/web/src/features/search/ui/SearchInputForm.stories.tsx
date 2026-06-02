import type { Meta, StoryObj } from '@storybook/react';

import { SearchInputForm } from './SearchInputForm';

const meta = {
  title: 'Web/Features/SearchInputForm',
  component: SearchInputForm,
  parameters: { layout: 'padded' },
  args: {
    action: '/search',
    inputId: 'storybook-search-input',
    label: '통합검색',
    placeholder: '검색어를 입력해주세요.',
  },
} satisfies Meta<typeof SearchInputForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Large: Story = {
  args: {
    variant: 'large',
    className: 'max-w-[588px]',
  },
};

export const XLarge: Story = {
  args: {
    variant: 'xlarge',
    className: 'max-w-[792px]',
  },
};
