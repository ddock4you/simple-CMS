'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1 size-4" />
        새 역할
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 역할 추가</DialogTitle>
          <DialogDescription>
            역할을 생성한 후 권한 매트릭스에서 권한을 설정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <DialogFooter>
            <Button type="submit" disabled={createRole.isPending}>
              {createRole.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
