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
 * Stage 12f — CTA 섹션 폼 분기 검증.
 * sectionType='CTA'일 때 CtaSectionForm이 마운트되고
 * "버튼 라벨 *" 필드가 노출되는지 회귀 방어.
 */
export const EditCta: Story = {
  args: { section: makeSection('CTA') },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: /콜투액션.*섹션 편집/ }),
    ).toBeInTheDocument();
    expect(body.getByLabelText('버튼 라벨 *')).toBeInTheDocument();
  },
};

/**
 * Stage 12f — SHORTCUT 섹션 폼 분기 검증.
 * ShortcutFields가 마운트되어 "바로가기 (최대 8개)" 라벨이 보이는지 확인.
 */
export const EditShortcut: Story = {
  args: { section: makeSection('SHORTCUT') },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: /바로가기.*섹션 편집/ }),
    ).toBeInTheDocument();
    expect(body.getByText('바로가기 (최대 8개)')).toBeInTheDocument();
  },
};

/**
 * Stage 12f — NOTICE 섹션 폼 분기 검증.
 * NoticeFields가 마운트되어 "공지 항목 (최대 5개)" 라벨이 보이는지 확인.
 */
export const EditNotice: Story = {
  args: { section: makeSection('NOTICE') },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: /공지사항.*섹션 편집/ }),
    ).toBeInTheDocument();
    expect(body.getByText('공지 항목 (최대 5개)')).toBeInTheDocument();
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

/**
 * Stage 12f — RECOMMENDED 섹션 폼 분기 검증 (스모크).
 * RecommendedSectionForm이 마운트되어 올바른 타이틀이 렌더링되는지 확인.
 */
export const EditRecommended: Story = {
  args: { section: makeSection('RECOMMENDED') },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: /추천 콘텐츠.*섹션 편집/ }),
    ).toBeInTheDocument();
    expect(body.getByRole('button', { name: '저장' })).toBeInTheDocument();
  },
};
