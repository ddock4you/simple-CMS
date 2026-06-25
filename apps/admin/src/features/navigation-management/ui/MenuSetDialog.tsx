'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NavigationMenuSlot } from '@simple-cms/db';

import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import { DialogToolbar } from '@/shared/ui/DialogToolbar';

import {
  createMenuSchema,
  type CreateMenuData,
} from '../model/navigationSchemas';
import { SLOT_OPTIONS } from './slotLabels';
import { useCreateMenuSet } from '../api/useNavigationMutations';

interface MenuSetDialogProps {
  defaultSlots?: NavigationMenuSlot[];
  redirectBasePath?: string;
  triggerLabel?: string;
}

export function MenuSetDialog({
  defaultSlots = [],
  redirectBasePath = '/navigation',
  triggerLabel = '새 메뉴',
}: MenuSetDialogProps) {
  const createMutation = useCreateMenuSet(redirectBasePath);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateMenuData>({
    resolver: zodResolver(createMenuSchema),
    defaultValues: { name: '', description: '', slots: defaultSlots },
  });

  const onSubmit = (data: CreateMenuData) => {
    createMutation.mutate(data, {
      onSuccess: () => reset({ name: '', description: '', slots: defaultSlots }),
    });
  };

  return (
    <Dialog>
      <DialogTrigger
        render={<Button />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent bodyOnlyScroll>
        <form onSubmit={handleSubmit(onSubmit)} className="contents">
          <DialogHeader>
            <DialogTitle>새 메뉴 생성</DialogTitle>
          </DialogHeader>
          <DialogToolbar
            right={
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? '생성 중...' : '생성'}
              </Button>
            }
          />
          <DialogBody className="space-y-4 px-0">
            <div className="space-y-2">
              <Label htmlFor="name">메뉴 이름</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Header Main"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
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
          </DialogBody>
        </form>
      </DialogContent>
    </Dialog>
  );
}
