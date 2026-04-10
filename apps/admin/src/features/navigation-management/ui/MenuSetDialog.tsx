'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/ui/shadcn/button';
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

import {
  createMenuSchema,
  type CreateMenuData,
} from '../model/navigationSchemas';
import { useCreateMenuSet } from '../api/useNavigationMutations';

export function MenuSetDialog() {
  const createMutation = useCreateMenuSet();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateMenuData>({
    resolver: zodResolver(createMenuSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = (data: CreateMenuData) => {
    createMutation.mutate(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <Dialog>
      <DialogTrigger
        render={<Button />}
      >
        새 메뉴
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>새 메뉴 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
