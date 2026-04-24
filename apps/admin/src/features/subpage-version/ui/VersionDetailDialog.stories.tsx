import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { VersionDetailDialog } from './VersionDetailDialog';

function DetailDialogHarness(
  props: Omit<React.ComponentProps<typeof VersionDetailDialog>, 'open' | 'onOpenChange'>,
) {
  const [open, setOpen] = useState(true);
  return (
    <VersionDetailDialog {...props} open={open} onOpenChange={setOpen} />
  );
}

const MOCK_VERSION_BASE = {
  id: 'v-detail-1',
  subpageId: 'story-subpage',
  createdAt: '2026-04-20T10:00:00.000Z',
  createdBy: { id: 'user-1', username: 'admin', name: '김관리' },
  sourceAction: 'MANUAL' as const,
  isPinned: false,
};

const MOCK_SUBPAGE = {
  id: 'story-subpage',
  title: '공공 데이터 소개',
  slug: 'public-data-intro',
  seoTitle: null,
  seoDescription: null,
  status: 'PUBLISHED',
  publishedAt: '2026-04-01T00:00:00.000Z',
  cclType: 'TYPE_1',
  cclAi: false,
  displayOrder: 0,
  revision: 5,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-04-20T10:00:00.000Z',
};

const MOCK_BLOCKS: unknown[] = [];

const meta = {
  title: 'Admin/Features/SubpageVersion/VersionDetailDialog',
  component: DetailDialogHarness,
  parameters: {
    layout: 'fullscreen',
    authenticated: true,
  },
  args: {
    subpageId: 'story-subpage',
    versionId: 'v-detail-1',
    onRollbackClick: () => {},
  },
} satisfies Meta<typeof DetailDialogHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Minimal: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions/v-detail-1': {
        status: 200,
        body: {
          success: true,
          data: {
            ...MOCK_VERSION_BASE,
            label: null,
            snapshot: {
              meta: {
                title: MOCK_SUBPAGE.title,
                slug: MOCK_SUBPAGE.slug,
                seoTitle: null,
                seoDescription: null,
                status: 'PUBLISHED',
                cclType: 'TYPE_1',
                cclAi: false,
                featuredImageId: null,
                displayOrder: 0,
              },
              blocks: [],
            },
            danglingMediaIds: [],
          },
        },
      },
      '/api/subpages/story-subpage': {
        status: 200,
        body: { success: true, data: MOCK_SUBPAGE },
      },
      '/api/subpages/story-subpage/blocks': {
        status: 200,
        body: { success: true, data: MOCK_BLOCKS },
      },
    },
  },
};

export const WithMemo: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions/v-detail-1': {
        status: 200,
        body: {
          success: true,
          data: {
            ...MOCK_VERSION_BASE,
            label:
              'hero 이미지 교체\n\n- 히어로 이미지를 신버전으로 교체\n- 공지 블록 2개 추가\n- 푸터 링크 정리',
            snapshot: {
              meta: {
                title: '공공 데이터 소개 (이전 제목)',
                slug: MOCK_SUBPAGE.slug,
                seoTitle: 'SEO 제목 구버전',
                seoDescription: null,
                status: 'DRAFT',
                cclType: 'TYPE_1',
                cclAi: false,
                featuredImageId: null,
                displayOrder: 0,
              },
              blocks: [],
            },
            danglingMediaIds: [],
          },
        },
      },
      '/api/subpages/story-subpage': {
        status: 200,
        body: { success: true, data: MOCK_SUBPAGE },
      },
      '/api/subpages/story-subpage/blocks': {
        status: 200,
        body: { success: true, data: MOCK_BLOCKS },
      },
    },
  },
};

export const WithDanglingMedia: Story = {
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage/versions/v-detail-1': {
        status: 200,
        body: {
          success: true,
          data: {
            ...MOCK_VERSION_BASE,
            label: '이미지 리디자인',
            snapshot: {
              meta: {
                title: MOCK_SUBPAGE.title,
                slug: MOCK_SUBPAGE.slug,
                seoTitle: null,
                seoDescription: null,
                status: 'PUBLISHED',
                cclType: 'TYPE_1',
                cclAi: false,
                featuredImageId: null,
                displayOrder: 0,
              },
              blocks: [],
            },
            danglingMediaIds: ['media-deleted-1', 'media-deleted-2'],
          },
        },
      },
      '/api/subpages/story-subpage': {
        status: 200,
        body: { success: true, data: MOCK_SUBPAGE },
      },
      '/api/subpages/story-subpage/blocks': {
        status: 200,
        body: { success: true, data: MOCK_BLOCKS },
      },
    },
  },
};
