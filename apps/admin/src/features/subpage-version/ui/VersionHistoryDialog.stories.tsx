import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { VersionHistoryDialog } from './VersionHistoryDialog';

function HistoryDialogHarness(
  props: Omit<React.ComponentProps<typeof VersionHistoryDialog>, 'open' | 'onOpenChange'>,
) {
  const [open, setOpen] = useState(true);
  return (
    <VersionHistoryDialog
      {...props}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

const meta = {
  title: 'Admin/Features/SubpageVersion/VersionHistoryDialog',
  component: HistoryDialogHarness,
  parameters: {
    layout: 'fullscreen',
    authenticated: true,
  },
  args: {
    subpageId: 'story-subpage',
    onViewDetail: () => {},
    onRollbackClick: () => {},
  },
} satisfies Meta<typeof HistoryDialogHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions': {
        status: 200,
        body: {
          success: true,
          data: { items: [], total: 0, page: 1, pageSize: 20 },
        },
      },
    },
  },
};

export const WithItems: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'v-1',
                subpageId: 'story-subpage',
                createdAt: '2026-04-20T10:00:00.000Z',
                createdBy: {
                  id: 'user-1',
                  username: 'admin',
                  name: '김관리',
                },
                label: 'hero 이미지 교체\n\n- 히어로 이미지를 신버전으로 교체\n- 공지 블록 2개 추가',
                sourceAction: 'MANUAL',
                isPinned: true,
              },
              {
                id: 'v-2',
                subpageId: 'story-subpage',
                createdAt: '2026-04-18T14:30:00.000Z',
                createdBy: {
                  id: 'user-2',
                  username: 'editor',
                  name: '이편집',
                },
                label: null,
                sourceAction: 'AUTO_PUBLISH',
                isPinned: false,
              },
              {
                id: 'v-3',
                subpageId: 'story-subpage',
                createdAt: '2026-04-15T09:15:00.000Z',
                createdBy: null,
                label: null,
                sourceAction: 'PRE_ROLLBACK',
                isPinned: false,
              },
            ],
            total: 3,
            page: 1,
            pageSize: 20,
          },
        },
      },
    },
  },
};
