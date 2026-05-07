'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';
import { BooleanSwitchField } from '@/shared/ui/BooleanSwitchField';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';

import type { BoardDetail } from '../model/boardFilters';
import {
  createBoardSchema,
  updateBoardSchema,
  type CreateBoardData,
  type UpdateBoardData,
} from '../model/boardSchemas';
import {
  useCreateBoard,
  useUpdateBoard,
  useDeleteBoard,
} from '../api/useBoardMutations';
import { SlugField } from './SlugField';
import { DeleteBoardDialog } from './DeleteBoardDialog';

interface BoardFormProps {
  mode: 'create' | 'edit';
  initialData?: BoardDetail;
}

export function BoardForm({ mode, initialData }: BoardFormProps) {
  const createMutation = useCreateBoard();
  const updateMutation = useUpdateBoard(initialData?.id ?? '');
  const deleteMutation = useDeleteBoard();

  const isCreate = mode === 'create';
  const schema = isCreate ? createBoardSchema : updateBoardSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreateBoardData | UpdateBoardData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name ?? '',
      slug: initialData?.slug ?? '',
      description: initialData?.description ?? '',
      skinType: initialData?.skinType ?? 'LIST',
      isPublic: initialData?.isPublic ?? true,
    },
  });

  const name = watch('name') ?? '';
  const slug = watch('slug') ?? '';

  const handleSlugChange = useCallback(
    (newSlug: string) => {
      setValue('slug', newSlug, { shouldDirty: true });
    },
    [setValue],
  );

  const onSubmit = (data: CreateBoardData | UpdateBoardData) => {
    if (isCreate) {
      createMutation.mutate(data as CreateBoardData);
    } else {
      updateMutation.mutate(data as UpdateBoardData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const { confirmDialogProps: leaveDialogProps } = useDirtyGuard(isDirty);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader
        back={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/boards" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
        }
        title={isCreate ? '새 게시판' : '게시판 편집'}
      />
      <PageToolbar
        right={
          <>
            {!isCreate && initialData && (
              <DeleteBoardDialog
                name={initialData.name}
                isPending={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate(initialData.id)}
              />
            )}
            <Button type="submit" disabled={isPending || (!isDirty && !isCreate)}>
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">게시판 이름</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="게시판 이름"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <SlugField
                title={name}
                value={slug}
                onChange={handleSlugChange}
                isPublic={initialData?.isPublic ?? true}
                savedSlug={initialData?.slug}
              />
              {errors.slug && (
                <p className="text-sm text-destructive">
                  {errors.slug.message}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="게시판 설명 (선택)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>스킨 타입</Label>
                <Controller
                  name="skinType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <span>
                          {field.value === 'GALLERY' ? '갤러리형' : '목록형'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LIST">목록형</SelectItem>
                        <SelectItem value="GALLERY">갤러리형</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <BooleanSwitchField
                control={control}
                name="isPublic"
                label="공개 여부"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmLeaveDialog {...leaveDialogProps} />
    </form>
  );
}
