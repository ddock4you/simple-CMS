'use client';

import { useState } from 'react';
import type { UserStatus } from '@simple-cms/db';

import { Button } from '@/shared/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import {
  useApproveUser,
  useRejectUser,
  useSuspendUser,
  useReactivateUser,
} from '@/features/user-management/api/useUserMutations';

interface UserActionButtonsProps {
  userId: string;
  status: UserStatus;
  isSelf: boolean;
}

export function UserActionButtons({
  userId,
  status,
  isSelf,
}: UserActionButtonsProps) {
  const [open, setOpen] = useState(false);
  const approve = useApproveUser();
  const reject = useRejectUser();
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();

  if (status === 'PENDING') {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => approve.mutate(userId)}
          disabled={approve.isPending}
        >
          {approve.isPending ? '처리 중...' : '승인'}
        </Button>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger
            render={
              <Button
                size="sm"
                variant="destructive"
                disabled={reject.isPending}
              />
            }
          >
            거절
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>가입 거절</AlertDialogTitle>
              <AlertDialogDescription>
                이 사용자의 가입을 거절하시겠습니까? 이 작업은 되돌릴 수
                없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  reject.mutate(userId);
                  setOpen(false);
                }}
              >
                거절
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (status === 'ACTIVE') {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              size="sm"
              variant="destructive"
              disabled={isSelf || suspend.isPending}
            />
          }
        >
          정지
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 정지</AlertDialogTitle>
            <AlertDialogDescription>
              이 사용자를 정지하시겠습니까? 해당 사용자의 모든 활성 세션이 즉시
              종료됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                suspend.mutate(userId);
                setOpen(false);
              }}
            >
              정지
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (status === 'SUSPENDED') {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => reactivate.mutate(userId)}
        disabled={reactivate.isPending}
      >
        {reactivate.isPending ? '처리 중...' : '해제'}
      </Button>
    );
  }

  return null;
}
