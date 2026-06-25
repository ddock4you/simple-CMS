import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '@/shared/ui/Button';
import { DialogToolbar } from '@/shared/ui/DialogToolbar';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
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
        <DialogContent bodyOnlyScroll>
          <DialogHeader>
            <DialogTitle>기본 Dialog</DialogTitle>
            <DialogDescription>
              Base-UI Dialog를 shadcn으로 래핑한 프로젝트 공용 컴포넌트입니다.
              외부 클릭/ESC 모두 닫기를 허용하는 기본 상태.
            </DialogDescription>
          </DialogHeader>
          <DialogToolbar
            right={
              <>
                <DialogClose render={<Button variant="outline">닫기</Button>} />
                <Button onClick={() => setOpen(false)}>저장</Button>
              </>
            }
          />
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              액션이 있는 일반 Dialog는 하단 footer 대신 DialogToolbar를 사용합니다.
            </p>
          </DialogBody>
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
        <DialogContent bodyOnlyScroll>
          <DialogHeader>
            <DialogTitle>외부 클릭 닫기 차단</DialogTitle>
            <DialogDescription>
              <code>disablePointerDismissal</code> prop을 켜면 배경/바깥 클릭으로
              Dialog가 닫히지 않습니다. ESC 키는 여전히 동작합니다.
            </DialogDescription>
          </DialogHeader>
          <DialogToolbar right={<Button onClick={() => setOpen(false)}>닫기</Button>} />
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              바깥 영역을 클릭해도 닫히지 않는 입력형 모달에서 사용합니다.
            </p>
          </DialogBody>
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
        <DialogContent bodyOnlyScroll>
          <DialogHeader>
            <DialogTitle>부모 Dialog</DialogTitle>
            <DialogDescription>
              아래 버튼으로 자식 Dialog를 열면 이 부모 Popup에 자동으로
              <code>data-nested-dialog-open</code> 속성이 부착되어 blur/opacity/
              scale 전환이 적용됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogToolbar
            right={
              <Button variant="outline" onClick={() => setParentOpen(false)}>
                닫기
              </Button>
            }
          />
          <DialogBody>
            <Button onClick={() => setChildOpen(true)}>자식 Dialog 열기</Button>
          </DialogBody>
        </DialogContent>
        {/* 자식 Dialog는 부모 Dialog의 children으로 렌더되어야 Base-UI가
            nested 관계로 인식하고 부모 Popup에 data-nested-dialog-open을 부착. */}
        <Dialog open={childOpen} onOpenChange={setChildOpen}>
          <DialogContent bodyOnlyScroll>
            <DialogHeader>
              <DialogTitle>자식 Dialog</DialogTitle>
              <DialogDescription>
                이 Dialog가 열린 동안 부모 Popup은 시각적으로 물러나야 합니다.
              </DialogDescription>
            </DialogHeader>
            <DialogToolbar
              right={<Button onClick={() => setChildOpen(false)}>자식 닫기</Button>}
            />
            <DialogBody>
              <p className="text-sm text-muted-foreground">
                중첩 Dialog도 액션이 있으면 DialogToolbar를 사용합니다.
              </p>
            </DialogBody>
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
        <DialogContent bodyOnlyScroll>
          <DialogHeader>
            <DialogTitle>이름 입력</DialogTitle>
            <DialogDescription>
              폼을 포함한 Dialog의 대표 사용 패턴입니다. mutation 없는 순수 UI
              시연.
            </DialogDescription>
          </DialogHeader>
          <DialogToolbar
            right={
              <>
                <DialogClose render={<Button variant="outline">취소</Button>} />
                <Button onClick={() => setOpen(false)}>저장</Button>
              </>
            }
          />
          <DialogBody>
            <div className="space-y-2">
              <Label htmlFor="demo-name">이름</Label>
              <Input
                id="demo-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
              />
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const WithForm: Story = {
  render: () => <WithFormDemo />,
};

function WithSizeLgDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>넓은 Dialog 열기 (size=lg)</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>크기 토큰 — lg (max-w-3xl)</DialogTitle>
            <DialogDescription>
              <code>{`size="lg"`}</code> prop으로 최대 너비를 max-w-3xl(48rem)로
              확장합니다. sm / md / lg / xl 4단계를 지원하며, prop 미지정 시
              기존 기본값(sm:max-w-sm)을 유지하여 하위 호환성을 보장합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded border p-3">
              <p className="font-medium">sm → max-w-md</p>
              <p className="text-muted-foreground">28rem</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-medium">md → max-w-lg</p>
              <p className="text-muted-foreground">32rem</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-medium">lg → max-w-3xl</p>
              <p className="text-muted-foreground">48rem</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-medium">xl → max-w-5xl</p>
              <p className="text-muted-foreground">64rem</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const WithSizeLg: Story = {
  render: () => <WithSizeLgDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /넓은 Dialog 열기/ }));

    const body = within(document.body);
    const popup = await body.findByRole('dialog');
    expect(popup.getAttribute('data-size')).toBe('lg');
  },
};

function BodyOnlyScrollDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>본문 스크롤 Dialog 열기</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent bodyOnlyScroll>
          <DialogHeader>
            <DialogTitle>본문만 스크롤 (bodyOnlyScroll)</DialogTitle>
            <DialogDescription>
              헤더와 툴바는 고정된 채 본문(<code>DialogBody</code>)만 스크롤됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogToolbar
            right={
              <>
                <DialogClose render={<Button variant="outline">취소</Button>} />
                <Button onClick={() => setOpen(false)}>확인</Button>
              </>
            }
          />
          <DialogBody>
            {Array.from({ length: 20 }).map((_, i) => (
              <p key={i} className="mb-3 text-sm text-muted-foreground">
                스크롤 테스트 항목 {i + 1}. 긴 목록이나 폼이 들어올 때 헤더와
                툴바가 화면에 고정되어 사용자가 항상 액션 버튼에 접근할 수 있습니다.
              </p>
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const BodyOnlyScroll: Story = {
  render: () => <BodyOnlyScrollDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /본문 스크롤 Dialog 열기/ }));

    const body = within(document.body);
    await body.findByRole('dialog');
    const dialogToolbar = document.querySelector('[data-slot="dialog-toolbar"]');
    const dialogBody = document.querySelector('[data-slot="dialog-body"]');
    expect(dialogToolbar).not.toBeNull();
    expect(dialogBody).not.toBeNull();
  },
};
