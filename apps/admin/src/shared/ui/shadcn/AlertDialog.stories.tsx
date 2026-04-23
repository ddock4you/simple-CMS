import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { fn } from 'storybook/test';

import { Button } from '@/shared/ui/shadcn/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/shared/ui/shadcn/alert-dialog';

/**
 * 프로젝트 커스텀 래퍼 shadcn AlertDialog 자체 규약 시연.
 * - Base-UI v1.3.0 `AlertDialogRoot`는 내부에서 `disablePointerDismissal: true`를
 *   강제하고 Props 타입에서 Omit → 호출자는 별도 설정 불필요. 배경/바깥 클릭
 *   닫기가 자동 차단됨 (삭제 확인 실수 방지)
 * - `data-nested-dialog-open` 속성 기반 중첩 시각 전환은 Dialog와 공유
 * - `size="default" | "sm"` 두 레이아웃 지원, `AlertDialogMedia`는 아이콘 슬롯
 */
const meta = {
  title: 'Admin/Shared/AlertDialog',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function ConfirmDeleteDemo({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        삭제 확인 AlertDialog 열기
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 데이터가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const ConfirmDelete: Story = {
  render: () => <ConfirmDeleteDemo onConfirm={fn()} />,
};

function WithMediaDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>아이콘 포함 AlertDialog 열기</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle />
            </AlertDialogMedia>
            <AlertDialogTitle>상태 전환 안내</AlertDialogTitle>
            <AlertDialogDescription>
              발행 상태로 전환하면 공개 웹에 즉시 노출됩니다. 저장하지 않은
              변경사항이 함께 발행되므로 확인 후 진행해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => setOpen(false)}>
              발행으로 전환
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const WithMedia: Story = {
  render: () => <WithMediaDemo />,
};
