'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import { DialogToolbar } from '@/shared/ui/DialogToolbar';

import {
  createRoleSchema,
  type CreateRoleData,
} from '@/features/role-management/model/roleSchemas';
import { useCreateRole } from '@/features/role-management/api/useRoleMutations';

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const createRole = useCreateRole();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoleData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      permissions: {},
    },
  });

  const onSubmit = (data: CreateRoleData) => {
    createRole.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1 size-4" />
        새 역할
      </DialogTrigger>
      <DialogContent bodyOnlyScroll>
        <form onSubmit={handleSubmit(onSubmit)} className="contents">
          <DialogHeader>
            <DialogTitle>새 역할 추가</DialogTitle>
            <DialogDescription>
              역할을 생성한 후 권한 매트릭스에서 권한을 설정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogToolbar
            right={
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? '생성 중...' : '생성'}
              </Button>
            }
          />
          <DialogBody className="space-y-4 px-0">
            <div className="space-y-2">
            <Label htmlFor="name">역할명</Label>
            <Input id="name" placeholder="역할명을 입력하세요" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
            </div>
            <div className="space-y-2">
            <Label htmlFor="description">설명 (선택사항)</Label>
            <Input
              id="description"
              placeholder="역할 설명"
              {...register('description')}
            />
            </div>
          </DialogBody>
        </form>
      </DialogContent>
    </Dialog>
  );
}
