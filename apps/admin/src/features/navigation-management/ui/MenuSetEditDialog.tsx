'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import { useDialogDirtyGuard } from '@/shared/lib/useDialogDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import type { NavigationMenuSlot } from '@simple-cms/db';

import {
  updateMenuSchema,
  type UpdateMenuData,
} from '../model/navigationSchemas';
import { SLOT_OPTIONS } from './slotLabels';
import { useUpdateMenuSet } from '../api/useNavigationMutations';

interface MenuSetEditDialogProps {
  menuId: string;
  name: string;
  description: string | null;
  slots: NavigationMenuSlot[];
}

export function MenuSetEditDialog({
  menuId,
  name,
  description,
  slots,
}: MenuSetEditDialogProps) {
  const [open, setOpen] = useState(false);
  const updateMutation = useUpdateMenuSet(menuId);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateMenuData>({
    resolver: zodResolver(updateMenuSchema),
    defaultValues: { name, description: description ?? '', slots },
  });

  useEffect(() => {
    if (open) {
      reset({ name, description: description ?? '', slots });
    }
  }, [open, name, description, slots, reset]);

  const onSubmit = (data: UpdateMenuData) => {
    updateMutation.mutate(data, {
      onSuccess: () => setOpen(false),
    });
  };

  const { safeOnOpenChange, confirmDialogProps } = useDialogDirtyGuard(
    isDirty,
    setOpen,
  );

  return (
    <Dialog open={open} onOpenChange={safeOnOpenChange} disablePointerDismissal>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Settings className="size-4" />
        메뉴 설정
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>메뉴 설정 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">메뉴 이름</Label>
              <Input
                id="edit-name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">설명</Label>
              <Textarea
                id="edit-description"
                {...register('description')}
                placeholder="메뉴 설명 (선택)"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>슬롯 배치</Label>
              <p className="text-xs text-muted-foreground">하나의 메뉴를 여러 슬롯에 배치할 수 있습니다.</p>
              <Controller
                name="slots"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-4">
                    {SLOT_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value?.includes(opt.value) ?? false}
                          onCheckedChange={(checked) => {
                            const current = field.value ?? [];
                            field.onChange(
                              checked
                                ? [...current, opt.value]
                                : current.filter((v) => v !== opt.value),
                            );
                          }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <ConfirmLeaveDialog {...confirmDialogProps} />
    </Dialog>
  );
}
