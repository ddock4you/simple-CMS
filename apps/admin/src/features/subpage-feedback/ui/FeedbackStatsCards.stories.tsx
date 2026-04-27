import type { Meta, StoryObj } from '@storybook/react';

import { FeedbackStatsCards } from './FeedbackStatsCards';

const meta = {
  title: 'Admin/Features/SubpageFeedback/StatsCards',
  component: FeedbackStatsCards,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FeedbackStatsCards>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NormalDistribution: Story = {
  args: {
    overall: {
      total: 240,
      positive: 168,
      negative: 72,
      positiveRate: 0.7,
      avgPerDay: 8,
    },
    periodDays: 30,
  },
};

export const Empty: Story = {
  args: {
    overall: {
      total: 0,
      positive: 0,
      negative: 0,
      positiveRate: 0,
      avgPerDay: 0,
    },
    periodDays: 30,
  },
};
