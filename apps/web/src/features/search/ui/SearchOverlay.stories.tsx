'use client';

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { SearchOverlay } from './SearchOverlay';

function SearchOverlayDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-[520px]">
      <button
        type="button"
        className="rounded-[4px] bg-[#063a74] px-[16px] py-[8px] text-white"
        onClick={() => setOpen(true)}
      >
        통합검색 열기
      </button>
      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

const meta = {
  title: 'Web/Features/SearchOverlay',
  component: SearchOverlayDemo,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SearchOverlayDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
