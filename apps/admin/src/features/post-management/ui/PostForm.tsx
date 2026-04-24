'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
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
} from '@/shared/ui/shadcn/select';
import { TiptapEditor } from '@/shared/ui/TiptapEditor';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import type { PostDetail } from '../model/postFilters';
import {
  createPostSchema,
  updatePostSchema,
  type CreatePostData,
  type UpdatePostData,
} from '../model/postSchemas';
import {
  useCreatePost,
  useUpdatePost,
  useDeletePost,
} from '../api/usePostMutations';
import { boardOptionsQuery } from '../api/postQueries';
import { SlugField } from './SlugField';
import { DeletePostDialog } from './DeletePostDialog';

interface PostFormProps {
  mode: 'create' | 'edit';
  initialData?: PostDetail;
  defaultBoardId?: string;
}

export function PostForm({ mode, initialData, defaultBoardId }: PostFormProps) {
  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost(initialData?.id ?? '');
  const deleteMutation = useDeletePost();
  const { data: boards } = useQuery(boardOptionsQuery());

  const isCreate = mode === 'create';
  const schema = isCreate ? createPostSchema : updatePostSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreatePostData | UpdatePostData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title ?? '',
      slug: initialData?.slug ?? '',
      boardId: initialData?.boardId ?? defaultBoardId ?? '',
      seoTitle: initialData?.seoTitle ?? '',
      seoDescription: initialData?.seoDescription ?? '',
      contentJson: initialData?.contentJson ?? undefined,
      status: initialData?.status ?? 'DRAFT',
    },
  });

  const title = watch('title') ?? '';
  const slug = watch('slug') ?? '';
  const initialStatus = initialData?.status ?? 'DRAFT';

  const handleSlugChange = useCallback(
    (newSlug: string) => {
      setValue('slug', newSlug, { shouldDirty: true });
    },
    [setValue],
  );

  const onSubmit = (data: CreatePostData | UpdatePostData) => {
    if (isCreate) {
      createMutation.mutate(data as CreatePostData);
    } else {
      updateMutation.mutate(data as UpdatePostData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const { confirmDialogProps: leaveDialogProps } = useDirtyGuard(isDirty);

  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  const confirmPublish = useCallback(() => {
    setPublishConfirmOpen(false);
    setValue('status', 'PUBLISHED', { shouldDirty: true });
  }, [setValue]);

  const cancelPublish = useCallback(() => {
    setPublishConfirmOpen(false);
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/posts" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
          <h1 className="text-2xl font-bold">
            {isCreate ? '새 게시글' : '게시글 편집'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isCreate && initialData && (
            <DeletePostDialog
              title={initialData.title}
              isPending={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutate(initialData.id)}
            />
          )}
          <Button type="submit" disabled={isPending || (!isDirty && !isCreate)}>
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="게시글 제목"
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

              <div className="space-y-2">
                <Label>게시판</Label>
                <Controller
                  name="boardId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <span>
                          {boards?.find((b) => b.id === field.value)?.name ?? '게시판 선택'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {boards?.map((board) => (
                          <SelectItem key={board.id} value={board.id}>
                            {board.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.boardId && (
                  <p className="text-sm text-destructive">
                    {errors.boardId.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>콘텐츠</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="contentJson"
                control={control}
                render={({ field }) => (
                  <TiptapEditor
                    content={field.value}
                    onChange={(json) => field.onChange(json)}
                  />
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO 제목</Label>
                <Input
                  id="seoTitle"
                  {...register('seoTitle')}
                  placeholder="검색 결과에 표시될 제목 (비워두면 기본 제목 사용)"
                />
                {errors.seoTitle && (
                  <p className="text-sm text-destructive">
                    {errors.seoTitle.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO 설명</Label>
                <Textarea
                  id="seoDescription"
                  {...register('seoDescription')}
                  placeholder="검색 결과에 표시될 설명"
                  rows={3}
                />
                {errors.seoDescription && (
                  <p className="text-sm text-destructive">
                    {errors.seoDescription.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>발행</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>상태</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(next) => {
                        if (
                          isDirty &&
                          next === 'PUBLISHED' &&
                          field.value === 'DRAFT'
                        ) {
                          setPublishConfirmOpen(true);
                          return;
                        }
                        field.onChange(next);
                      }}
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
              </div>
            </CardContent>
          </Card>

          {!isCreate && initialData?.authorName && (
            <Card>
              <CardHeader>
                <CardTitle>작성자</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {initialData.authorName}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmLeaveDialog {...leaveDialogProps} />
      <ConfirmLeaveDialog
        open={publishConfirmOpen}
        onConfirm={confirmPublish}
        onCancel={cancelPublish}
        title="저장하지 않은 변경사항도 함께 발행됩니다"
        description={
          initialStatus === 'DRAFT'
            ? '편집 중인 제목·본문 등이 발행 상태로 저장됩니다. 계속하시겠습니까?'
            : '편집 중인 내용이 발행 상태로 저장됩니다. 계속하시겠습니까?'
        }
        confirmLabel="발행으로 변경"
        cancelLabel="취소"
      />
    </form>
  );
}
