import type { Meta, StoryObj } from '@storybook/react';

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

export const Empty: Story = {
  args: {
    mode: 'create',
  },
};

export const WithCCLType1: Story = {
  args: {
    mode: 'edit',
    initialData: cclType1InitialData,
  },
};
