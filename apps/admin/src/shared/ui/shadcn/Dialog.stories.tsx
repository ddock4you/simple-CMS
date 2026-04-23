import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';

/**
 * 프로젝트 커스텀 래퍼 shadcn Dialog의 자체 규약 시연 (Stage 7d).
 * - 중첩 Dialog 자동 흐림: Base-UI가 부모 Popup에 부착하는 `data-nested-dialog-open`
 *   속성을 Tailwind 선택자로 활용해 blur/opacity/scale 전환
 * - `disablePointerDismissal`: Base-UI `DialogRoot.Props`를 spread 전달하므로
 *   호출자가 opt-in (ESC는 항상 유지)
 *
 * NestedDialog play는 속성 존재 assert만 수행 — Tailwind 클래스 매핑 시각 회귀는
 * 별도 visual regression 도구가 필요하며 Stage 7i 범위 외.
 */
const meta = {
  title: 'Admin/Shared/Dialog',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function BasicDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Dialog 열기</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기본 Dialog</DialogTitle>
            <DialogDescription>
              Base-UI Dialog를 shadcn으로 래핑한 프로젝트 공용 컴포넌트입니다.
              외부 클릭/ESC 모두 닫기를 허용하는 기본 상태.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">닫기</Button>}
            />
            <Button onClick={() => setOpen(false)}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Basic: Story = {
  render: () => <BasicDemo />,
};

function DisablePointerDismissalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>외부 클릭 차단 Dialog 열기</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        disablePointerDismissal
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>외부 클릭 닫기 차단</DialogTitle>
            <DialogDescription>
              <code>disablePointerDismissal</code> prop을 켜면 배경/바깥 클릭으로
              Dialog가 닫히지 않습니다. ESC 키는 여전히 동작합니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const DisablePointerDismissal: Story = {
  render: () => <DisablePointerDismissalDemo />,
};

function NestedDialogDemo() {
  const [parentOpen, setParentOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setParentOpen(true)}>부모 Dialog 열기</Button>
      <Dialog open={parentOpen} onOpenChange={setParentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>부모 Dialog</DialogTitle>
            <DialogDescription>
              아래 버튼으로 자식 Dialog를 열면 이 부모 Popup에 자동으로
              <code>data-nested-dialog-open</code> 속성이 부착되어 blur/opacity/
              scale 전환이 적용됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button onClick={() => setChildOpen(true)}>
              자식 Dialog 열기
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setParentOpen(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
        {/* 자식 Dialog는 부모 Dialog의 children으로 렌더되어야 Base-UI가
            nested 관계로 인식하고 부모 Popup에 data-nested-dialog-open을 부착. */}
        <Dialog open={childOpen} onOpenChange={setChildOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>자식 Dialog</DialogTitle>
              <DialogDescription>
                이 Dialog가 열린 동안 부모 Popup은 시각적으로 물러나야 합니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setChildOpen(false)}>자식 닫기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Dialog>
    </>
  );
}

export const NestedDialog: Story = {
  render: () => <NestedDialogDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '부모 Dialog 열기' }));

    const body = within(document.body);
    const childTrigger = await body.findByRole('button', {
      name: '자식 Dialog 열기',
    });
    await userEvent.click(childTrigger);

    await waitFor(() => {
      const parentPopup = document.querySelector(
        '[data-slot="dialog-content"][data-nested-dialog-open]',
      );
      expect(parentPopup).not.toBeNull();
    });
  },
};

function WithFormDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  return (
    <>
      <Button onClick={() => setOpen(true)}>폼 Dialog 열기</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이름 입력</DialogTitle>
            <DialogDescription>
              폼을 포함한 Dialog의 대표 사용 패턴입니다. mutation 없는 순수 UI
              시연.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="demo-name">이름</Label>
            <Input
              id="demo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
            />
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">취소</Button>}
            />
            <Button onClick={() => setOpen(false)}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const WithForm: Story = {
  render: () => <WithFormDemo />,
};
