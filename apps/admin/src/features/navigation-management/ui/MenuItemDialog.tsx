'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';
import { BooleanSwitchField } from '@/shared/ui/BooleanSwitchField';
import { useDialogDirtyGuard } from '@/shared/lib/useDialogDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';
import { DialogToolbar } from '@/shared/ui/DialogToolbar';

import type { MenuItemNode } from '../model/navigationFilters';
import {
  createMenuItemSchema,
  type CreateMenuItemData,
} from '../model/navigationSchemas';
import { subpageOptionsQuery, boardOptionsForNavQuery } from '../api/navigationQueries';

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMenuItemData) => void;
  isPending: boolean;
  parentId?: string | null;
  editItem?: MenuItemNode | null;
}

export function MenuItemDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  parentId = null,
  editItem,
}: MenuItemDialogProps) {
  const { data: subpages } = useQuery(subpageOptionsQuery());
  const { data: boards } = useQuery(boardOptionsForNavQuery());

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateMenuItemData>({
    resolver: zodResolver(createMenuItemSchema),
    defaultValues: {
      parentId: editItem ? undefined : parentId,
      label: '',
      itemType: parentId ? 'SUBPAGE' : 'GROUP',
      subpageId: null,
      boardId: null,
      url: null,
      isVisible: true,
      openInNewTab: false,
      startDate: null,
      endDate: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      reset({
        label: editItem.label,
        itemType: editItem.itemType,
        subpageId: editItem.subpageId,
        boardId: editItem.boardId,
        url: editItem.url,
        isVisible: editItem.isVisible,
        openInNewTab: editItem.openInNewTab,
        startDate: editItem.startDate?.slice(0, 16) ?? null,
        endDate: editItem.endDate?.slice(0, 16) ?? null,
      });
    } else {
      reset({
        parentId,
        label: '',
        itemType: parentId ? 'SUBPAGE' : 'GROUP',
        subpageId: null,
        boardId: null,
        url: null,
        isVisible: true,
        openInNewTab: false,
        startDate: null,
        endDate: null,
      });
    }
  }, [open, editItem, parentId, reset]);

  const itemType = watch('itemType');

  useEffect(() => {
    if (itemType !== 'SUBPAGE') setValue('subpageId', null);
    if (itemType !== 'BOARD') setValue('boardId', null);
    if (itemType !== 'EXTERNAL' && itemType !== 'CUSTOM') setValue('url', null);
    if (itemType === 'GROUP') setValue('openInNewTab', false);
  }, [itemType, setValue]);

  // Auto-fill label when entity is selected
  const handleSubpageChange = (subpageId: string) => {
    setValue('subpageId', subpageId);
    const subpage = subpages?.find((s) => s.id === subpageId);
    if (subpage && !editItem) {
      setValue('label', subpage.title);
    }
  };

  const handleBoardChange = (boardId: string) => {
    setValue('boardId', boardId);
    const board = boards?.find((b) => b.id === boardId);
    if (board && !editItem) {
      setValue('label', board.name);
    }
  };

  const handleFormSubmit = (data: CreateMenuItemData) => {
    onSubmit(data);
  };

  const { safeOnOpenChange, confirmDialogProps } = useDialogDirtyGuard(
    isDirty,
    onOpenChange,
  );

  return (
    <Dialog open={open} onOpenChange={safeOnOpenChange} disablePointerDismissal>
      <DialogContent size="md" bodyOnlyScroll>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="contents">
          <DialogHeader>
            <DialogTitle>{editItem ? '메뉴 항목 수정' : '메뉴 항목 추가'}</DialogTitle>
          </DialogHeader>
          <DialogToolbar
            right={
              <Button type="submit" disabled={isPending}>
                {isPending ? '저장 중...' : editItem ? '수정' : '추가'}
              </Button>
            }
          />

          <DialogBody className="space-y-4 px-0">
            <div className="space-y-2">
              <Label>항목 타입</Label>
              <Controller
                name="itemType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <span>
                        {field.value === 'SUBPAGE' && '서브 페이지'}
                        {field.value === 'BOARD' && '게시판'}
                        {field.value === 'EXTERNAL' && '외부 링크'}
                        {field.value === 'CUSTOM' && '커스텀 경로'}
                        {field.value === 'GROUP' && '메뉴 그룹'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GROUP">메뉴 그룹</SelectItem>
                      <SelectItem value="SUBPAGE">서브 페이지</SelectItem>
                      <SelectItem value="BOARD">게시판</SelectItem>
                      <SelectItem value="EXTERNAL">외부 링크</SelectItem>
                      <SelectItem value="CUSTOM">커스텀 경로</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {itemType === 'SUBPAGE' && (
              <div className="space-y-2">
                <Label>서브 페이지</Label>
                <Controller
                  name="subpageId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => handleSubpageChange(v ?? '')}
                    >
                      <SelectTrigger>
                        <span>
                          {subpages?.find((s) => s.id === field.value)?.title ?? '선택'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {subpages?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {itemType === 'BOARD' && (
              <div className="space-y-2">
                <Label>게시판</Label>
                <Controller
                  name="boardId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => handleBoardChange(v ?? '')}
                    >
                      <SelectTrigger>
                        <span>
                          {boards?.find((b) => b.id === field.value)?.name ?? '선택'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {boards?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {(itemType === 'EXTERNAL' || itemType === 'CUSTOM') && (
              <div className="space-y-2">
                <Label htmlFor="url">
                  {itemType === 'EXTERNAL' ? 'URL' : '경로'}
                </Label>
                <Input
                  id="url"
                  {...register('url')}
                  placeholder={itemType === 'EXTERNAL' ? 'https://example.com' : '/search'}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="label">라벨</Label>
              <Input
                id="label"
                {...register('label')}
                placeholder="메뉴에 표시될 이름"
              />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <BooleanSwitchField
                control={control}
                name="isVisible"
                label="공개"
              />
              {itemType !== 'GROUP' && (
                <BooleanSwitchField
                  control={control}
                  name="openInNewTab"
                  label="새 탭에서 열기"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">시작일 (선택)</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...register('startDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">종료일 (선택)</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...register('endDate')}
                />
              </div>
            </div>
          </DialogBody>
        </form>
      </DialogContent>
      <ConfirmLeaveDialog {...confirmDialogProps} />
    </Dialog>
  );
}
