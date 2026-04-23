import { useQuery } from '@tanstack/react-query';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { HomeSectionListItem } from '@simple-cms/types';

import { homeKeys } from '@/shared/api/queryKeys';
import { useReorderHomeSections } from '@/features/home-management/api/useHomeMutations';

const MOCK_SECTIONS: HomeSectionListItem[] = [
  {
    id: 'section-a',
    sectionType: 'HERO',
    title: 'Section A (Hero)',
    isVisible: true,
    displayOrder: 0,
    configJson: {},
    updatedAt: '2026-04-23T00:00:00Z',
  },
  {
    id: 'section-b',
    sectionType: 'RECOMMENDED',
    title: 'Section B (Recommended)',
    isVisible: true,
    displayOrder: 1,
    configJson: {},
    updatedAt: '2026-04-23T00:00:00Z',
  },
  {
    id: 'section-c',
    sectionType: 'SHORTCUT',
    title: 'Section C (Shortcut)',
    isVisible: true,
    displayOrder: 2,
    configJson: {},
    updatedAt: '2026-04-23T00:00:00Z',
  },
];

/**
 * `useReorderHomeSections`의 optimistic update + rollback 경로를 검증하는 probe.
 *
 * Stage 7j — fetchStubDecorator로 `/api/home/reorder`를 500으로 응답해 onError의
 * rollback이 실제 DOM에 반영되는지 확인. SectionList가 dnd-kit pointer 이벤트만
 * 지원하고 화살표 버튼 UI가 없어 Playwright에서 재현 불안정 → 훅 단독 검증 patten.
 */
function ReorderProbe() {
  const { data: sections = [] } = useQuery({
    queryKey: homeKeys.lists(),
    queryFn: () => Promise.resolve(MOCK_SECTIONS),
    initialData: MOCK_SECTIONS,
    staleTime: Infinity,
  });
  const reorderMutation = useReorderHomeSections();

  const swapTopTwo = () => {
    if (sections.length < 2) return;
    const next = [...sections];
    [next[0], next[1]] = [next[1], next[0]];
    reorderMutation.mutate({
      sections: next.map((s, i) => ({ id: s.id, displayOrder: i })),
    });
  };

  return (
    <div className="space-y-4 font-mono text-sm">
      <button
        type="button"
        onClick={swapTopTwo}
        data-testid="swap-top-two"
        className="rounded bg-primary px-3 py-2 text-primary-foreground"
      >
        상위 2개 교체
      </button>
      <p data-testid="mutation-status">
        {reorderMutation.isPending
          ? 'pending'
          : reorderMutation.isError
            ? 'error'
            : 'idle'}
      </p>
      <ul data-testid="section-list" className="space-y-1">
        {sections.map((s) => (
          <li key={s.id}>
            [{s.displayOrder}] {s.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

const meta = {
  title: 'Admin/Features/Home/SectionReorderProbe',
  component: ReorderProbe,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof ReorderProbe>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Reorder500: Story = {
  parameters: {
    authenticated: true,
    fetchMock: {
      '/api/home/reorder': {
        status: 500,
        body: { success: false, error: '순서 변경에 실패했습니다.' },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const firstItem = () =>
      within(canvas.getByTestId('section-list')).getAllByRole('listitem')[0];

    await expect(firstItem()).toHaveTextContent('Section A');
    await expect(canvas.getByTestId('mutation-status')).toHaveTextContent('idle');

    await userEvent.click(canvas.getByTestId('swap-top-two'));

    await waitFor(() => {
      expect(canvas.getByTestId('mutation-status')).toHaveTextContent('error');
    });

    await body.findByText('순서 변경에 실패했습니다.');

    await expect(firstItem()).toHaveTextContent('Section A');
  },
};
