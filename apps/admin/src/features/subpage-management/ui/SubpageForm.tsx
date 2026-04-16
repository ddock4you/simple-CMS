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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/shadcn/select';

import type { SubpageDetail } from '../model/subpageFilters';
import {
  createSubpageSchema,
  updateSubpageSchema,
  type CreateSubpageData,
  type UpdateSubpageData,
} from '../model/subpageSchemas';
import {
  useCreateSubpage,
  useUpdateSubpage,
  useDeleteSubpage,
} from '../api/useSubpageMutations';
import { SlugField } from './SlugField';
import { DeleteSubpageDialog } from './DeleteSubpageDialog';

interface SubpageFormProps {
  mode: 'create' | 'edit';
  initialData?: SubpageDetail;
}

export function SubpageForm({ mode, initialData }: SubpageFormProps) {
  const createMutation = useCreateSubpage();
  const updateMutation = useUpdateSubpage(initialData?.id ?? '');
  const deleteMutation = useDeleteSubpage();

  const isCreate = mode === 'create';
  const schema = isCreate ? createSubpageSchema : updateSubpageSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreateSubpageData | UpdateSubpageData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title ?? '',
      slug: initialData?.slug ?? '',
      seoTitle: initialData?.seoTitle ?? '',
      seoDescription: initialData?.seoDescription ?? '',
      status: initialData?.status ?? 'DRAFT',
    },
  });

  const title = watch('title') ?? '';
  const slug = watch('slug') ?? '';

  const handleSlugChange = useCallback(
    (newSlug: string) => {
      setValue('slug', newSlug, { shouldDirty: true });
    },
    [setValue],
  );

  const onSubmit = (data: CreateSubpageData | UpdateSubpageData) => {
    if (isCreate) {
      createMutation.mutate(data as CreateSubpageData);
    } else {
      updateMutation.mutate(data as UpdateSubpageData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/subpages" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
          <h1 className="text-2xl font-bold">
            {isCreate ? '새 서브 페이지' : '서브 페이지 편집'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isCreate && initialData && (
            <DeleteSubpageDialog
              title={initialData.title}
              isPending={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutate(initialData.id)}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>페이지 정보</CardTitle>
          <CardDescription>
            기본 정보, 발행 상태, SEO를 한 번에 저장합니다. 블록은 변경 즉시
            별도로 저장됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                기본 정보
              </h3>
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="서브 페이지 제목"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <SlugField
                title={title}
                value={slug}
                onChange={handleSlugChange}
                isPublished={initialData?.status === 'PUBLISHED'}
                savedSlug={initialData?.slug}
              />
              {errors.slug && (
                <p className="text-sm text-destructive">
                  {errors.slug.message}
                </p>
              )}
            </section>

            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  발행
                </h3>
                <Label>상태</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <span>
                          {field.value === 'PUBLISHED' ? '발행' : '초안'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">초안</SelectItem>
                        <SelectItem value="PUBLISHED">발행</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  SEO
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">SEO 제목</Label>
                  <Input
                    id="seoTitle"
                    {...register('seoTitle')}
                    placeholder="검색 결과에 표시될 제목"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seoDescription">SEO 설명</Label>
                  <Textarea
                    id="seoDescription"
                    {...register('seoDescription')}
                    placeholder="검색 결과에 표시될 설명"
                    rows={3}
                  />
                </div>
              </section>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="submit"
            disabled={isPending || (!isDirty && !isCreate)}
          >
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
