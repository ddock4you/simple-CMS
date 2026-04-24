'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { History } from 'lucide-react';

import { SUBPAGE_VERSION_LABEL_MAX_LENGTH } from '@simple-cms/types';

import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { useDialogDirtyGuard } from '@/shared/lib/useDialogDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import { useCreateSubpageVersion } from '../api/useVersionMutations';
import {
  createVersionSchema,
  type CreateVersionData,
} from '../model/versionSchemas';

interface SaveVersionButtonProps {
  subpageId: string;
  disabled?: boolean;
  size?: 'default' | 'sm';
  variant?: 'default' | 'secondary' | 'outline';
}

const MEMO_PLACEHOLDER = `예: hero 이미지 교체

- 홈 히어로 이미지를 신버전으로 교체
- 공지 블록 2개 추가`;

export function SaveVersionButton({
  subpageId,
  disabled,
  size = 'sm',
  variant = 'outline',
}: SaveVersionButtonProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCreateSubpageVersion(subpageId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, errors },
  } = useForm<CreateVersionData>({
    resolver: zodResolver(createVersionSchema),
    defaultValues: { label: '' },
  });

  // Dialog가 새로 열릴 때마다 입력 초기화 (Stage 7d 규약 A)
  useEffect(() => {
    if (open) reset({ label: '' });
  }, [open, reset]);

  const { safeOnOpenChange, confirmDialogProps } = useDialogDirtyGuard(
    isDirty,
    setOpen,
  );

  // Dialog가 외부 SubpageForm <form> 내부에 배치될 수 있어, submit 이벤트가
  // React 이벤트 버블링으로 외부 form까지 도달한다(포털 렌더와 무관). 외부 form의
  // onSubmit이 함께 실행되어 의도치 않은 메타 저장이 발사되는 것을 차단한다.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void handleSubmit((data) => {
      const payload: CreateVersionData = {
        label: data.label?.trim() ? data.label : null,
      };
      mutate(payload, {
        onSuccess: () => {
          reset({ label: '' });
          setOpen(false);
        },
      });
    })(e);
  };

  const labelValue = watch('label') ?? '';
  const charCount = labelValue.length;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <History aria-hidden />
        버전 저장
      </Button>
      <Dialog open={open} onOpenChange={safeOnOpenChange} disablePointerDismissal>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>버전 저장</DialogTitle>
            <DialogDescription>
              지금 상태의 본문과 설정을 하나의 버전으로 보관합니다. 메모는 선택이며
              깃 커밋 스타일로 작성할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="version-label">메모 (선택)</Label>
              <Textarea
                id="version-label"
                rows={8}
                placeholder={MEMO_PLACEHOLDER}
                {...register('label')}
                aria-invalid={errors.label ? 'true' : 'false'}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  깃 커밋 스타일 — 첫 줄은 요약, 빈 줄 이후는 본문 (모두 선택)
                </span>
                <span
                  className={
                    charCount > SUBPAGE_VERSION_LABEL_MAX_LENGTH
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }
                >
                  {charCount.toLocaleString()} / {SUBPAGE_VERSION_LABEL_MAX_LENGTH.toLocaleString()}
                </span>
              </div>
              {errors.label && (
                <p className="text-xs text-destructive">{errors.label.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => safeOnOpenChange(false)}
                disabled={isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '저장 중...' : '버전 저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmLeaveDialog {...confirmDialogProps} />
    </>
  );
}
