import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from 'storybook/test';
import type { HomeSectionListItem } from '@simple-cms/types';

import { SectionEditDialog } from './SectionEditDialog';

function makeSection(
  sectionType: HomeSectionListItem['sectionType'],
): HomeSectionListItem {
  return {
    id: `story-section-${sectionType.toLowerCase()}`,
    sectionType,
    title: `${sectionType} 섹션`,
    isVisible: true,
    displayOrder: 0,
    configJson: {},
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

const meta = {
  title: 'Admin/Features/Home/SectionEditDialog',
  component: SectionEditDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    open: true,
    onOpenChange: fn(),
    section: null,
  },
} satisfies Meta<typeof SectionEditDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12f — NOTICE 섹션 폼 분기 검증.
 * NoticeFields가 마운트되어 대표 게시판 선택 필드가 보이는지 확인.
 */
export const EditNotice: Story = {
  args: { section: makeSection('NOTICE') },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: /대표 게시판.*섹션 편집/ }),
    ).toBeInTheDocument();
    expect(body.getByText('대표 게시판 선택 *')).toBeInTheDocument();
  },
};

export const EditGalleryCollection: Story = {
  args: {
    section: {
      ...makeSection('GALLERY_COLLECTION'),
      configJson: {
        heading: '갤러리 모아보기',
        description: null,
        boardIds: ['board-event'],
        boardTabLabels: { 'board-event': '행사 스케치' },
        limit: 4,
      },
    },
  },
  parameters: {
    fetchMock: {
      '/api/home/references': {
        status: 200,
        body: {
          success: true,
          data: {
            boards: [{ id: 'board-event', name: '행사 갤러리' }],
          },
        },
      },
    },
  },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', {
        name: /갤러리 모아보기.*섹션 편집/,
      }),
    ).toBeInTheDocument();
    expect(body.getByText('게시판 선택 *')).toBeInTheDocument();
    expect(await body.findByLabelText('공개 탭 이름')).toHaveValue(
      '행사 스케치',
    );
  },
};

/**
 * 자주찾는 메뉴 섹션 폼 분기 검증.
 * 메뉴 관리와 유사한 연결 타입 + 아이콘 이미지 입력 UI가 노출되는지 확인.
 */
export const EditFrequentMenu: Story = {
  args: { section: makeSection('FREQUENT_MENU') },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: /자주찾는 메뉴.*섹션 편집/ }),
    ).toBeInTheDocument();
    expect(body.getByText('메뉴 항목')).toBeInTheDocument();
    expect(
      body.getByText(
        '최대 6개까지 등록할 수 있습니다. 시작일/종료일은 사용하지 않습니다.',
      ),
    ).toBeInTheDocument();
  },
};

/**
 * Stage 12f — HERO 섹션 폼 분기 검증 (스모크).
 * HeroSectionForm이 마운트되어 저장 버튼과 함께 올바른 타이틀이 렌더링되는지 확인.
 */
export const EditHero: Story = {
  args: { section: makeSection('HERO') },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: /히어로.*섹션 편집/ }),
    ).toBeInTheDocument();
    expect(body.getByRole('button', { name: '저장' })).toBeInTheDocument();
  },
};
