import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { RestoreVersionAlertDialog } from './RestoreVersionAlertDialog';

function RestoreDialogHarness(
  props: Omit<React.ComponentProps<typeof RestoreVersionAlertDialog>, 'open' | 'onOpenChange'>,
) {
  const [open, setOpen] = useState(true);
  return (
    <RestoreVersionAlertDialog
      {...props}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

const VERSION_NO_DANGLING = {
  id: 'v-restore-1',
  subpageId: 'story-subpage',
  createdAt: '2026-04-20T10:00:00.000Z',
  createdBy: { id: 'user-1', username: 'admin', name: '김관리' },
  label: 'hero 이미지 교체',
  sourceAction: 'MANUAL' as const,
  isPinned: false,
  snapshot: {
    meta: {
      title: '공공 데이터',
      slug: 'public-data',
      seoTitle: null,
      seoDescription: null,
      status: 'PUBLISHED',
      cclType: null,
      cclAi: false,
      featuredImageId: null,
      displayOrder: 0,
    },
    blocks: [],
  },
  danglingMediaIds: [],
};

const VERSION_WITH_DANGLING = {
  ...VERSION_NO_DANGLING,
  danglingMediaIds: ['media-a', 'media-b', 'media-c'],
};

const meta = {
  title: 'Admin/Features/SubpageVersion/RestoreVersionAlertDialog',
  component: RestoreDialogHarness,
  parameters: {
    layout: 'centered',
    authenticated: true,
  },
  args: {
    subpageId: 'story-subpage',
    versionId: 'v-restore-1',
    subpageRevision: 5,
    isPending: false,
    onConfirm: () => {},
  },
} satisfies Meta<typeof RestoreDialogHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions/v-restore-1': {
        status: 200,
        body: { success: true, data: VERSION_NO_DANGLING },
      },
    },
  },
};

export const WithDanglingMedia: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions/v-restore-1': {
        status: 200,
        body: { success: true, data: VERSION_WITH_DANGLING },
      },
    },
  },
};
