import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import { useDirtyGuard } from './useDirtyGuard';

/**
 * `useDirtyGuard` 훅의 document click capture 동작을 검증하는 probe.
 *
 * Stage 7h 작업 1 — 실제 폼(SubpageForm/PostForm/BoardForm/PopupForm 등)에
 * 동일 훅이 연결되므로 이 probe가 통과하면 해당 폼들의 dirty guard 동작도 OK.
 *
 * 검증 포인트:
 * - isDirty=true + 내부 origin 링크 클릭 → ConfirmLeaveDialog 렌더
 * - `<a target="_blank">` / `download` / `mailto:` / 외부 origin은 가드 skip (향후 확장)
 * - Storybook canvas는 iframe이므로 링크 href는 `/dashboard`처럼 iframe path와
 *   다른 pathname이어야 가드의 same-path 필터(useDirtyGuard 95-98행)를 통과해 dialog 트리거
 */
function DirtyGuardProbe({ isDirty }: { isDirty: boolean }) {
  const { confirmDialogProps } = useDirtyGuard(isDirty);

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <p style={{ marginBottom: 8 }}>
        <strong>isDirty</strong> = {isDirty ? 'true' : 'false'}
      </p>
      <p style={{ marginBottom: 8, color: '#6b7280' }}>
        아래 링크를 클릭하면 dirty 상태에서만 ConfirmLeaveDialog가 뜬다.
      </p>
      <a
        href="/dashboard"
        data-testid="internal-link"
        style={{ color: '#2563eb', textDecoration: 'underline' }}
      >
        대시보드로 이동 (internal /dashboard)
      </a>
      <ConfirmLeaveDialog {...confirmDialogProps} />
    </div>
  );
}

const meta = {
  title: 'Admin/Shared/DirtyGuardProbe',
  component: DirtyGuardProbe,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DirtyGuardProbe>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * isDirty=false — 가드 미등록. 링크 클릭해도 dialog 안 뜸.
 * smoke 렌더만 검증 (play function 없음).
 */
export const Clean: Story = {
  args: { isDirty: false },
};

/**
 * isDirty=true — document click capture 활성.
 * internal 링크 클릭 → ConfirmLeaveDialog 제목이 body portal에 렌더되어야 함.
 */
export const DirtyTriggersDialog: Story = {
  args: { isDirty: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByTestId('internal-link'));

    // ConfirmLeaveDialog(AlertDialog 기반)는 body portal에 렌더되므로
    // canvasElement 범위가 아닌 document.body 범위에서 find.
    const body = within(document.body);
    expect(
      await body.findByText('저장하지 않은 변경사항이 있습니다'),
    ).toBeInTheDocument();
    expect(await body.findByRole('button', { name: '머무르기' })).toBeInTheDocument();
    expect(await body.findByRole('button', { name: '나가기' })).toBeInTheDocument();
  },
};
