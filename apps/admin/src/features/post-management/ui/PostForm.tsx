'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminLink as Link } from '@/shared/ui/AdminLink';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ImageOff, Library, X } from 'lucide-react';
import { extractTextFromTiptap } from '@simple-cms/editor';
import type { MediaListItem, UploadMediaResponse } from '@simple-cms/types';

import { Button } from '@/shared/ui/Button';
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
import { TiptapEditor } from '@/entities/editor/ui/TiptapEditor';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { BooleanSwitchField } from '@/shared/ui/BooleanSwitchField';
import { MediaPicker } from '@/entities/media/ui/MediaPicker';
import { MediaUploadButton } from '@/entities/media/ui/MediaUploadButton';
import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

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
import { DeletePostDialog } from './DeletePostDialog';

interface PostFormProps {
  mode: 'create' | 'edit';
  initialData?: PostDetail;
  defaultBoardId?: string;
}

const POST_THUMBNAIL_ACCEPT_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

interface ThumbnailSelection {
  id: string;
  url: string;
  alt: string | null;
  originalFilename: string | null;
}

export function PostForm({ mode, initialData, defaultBoardId }: PostFormProps) {
  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost(initialData?.id ?? '');
  const deleteMutation = useDeletePost();
  const { data: boards } = useQuery(boardOptionsQuery());
  const canReadMedia = usePermission('media', 'read');

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
      boardId: initialData?.boardId ?? defaultBoardId ?? '',
      seoTitle: initialData?.seoTitle ?? '',
      seoDescription: initialData?.seoDescription ?? '',
      contentJson: initialData?.contentJson ?? undefined,
      featuredImageId: initialData?.featuredImageId ?? null,
      isImportant: initialData?.isImportant ?? false,
      status: initialData?.status ?? 'DRAFT',
    },
  });

  const title = watch('title') ?? '';
  const seoTitle = watch('seoTitle') ?? '';
  const featuredImageId = watch('featuredImageId');
  const initialStatus = initialData?.status ?? 'DRAFT';
  const [thumbnail, setThumbnail] = useState<ThumbnailSelection | null>(
    initialData?.featuredImageId && initialData.featuredImageUrl
      ? {
          id: initialData.featuredImageId,
          url: initialData.featuredImageUrl,
          alt: initialData.featuredImageAlt,
          originalFilename: initialData.featuredImageOriginalFilename,
        }
      : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const seoTitleEdited = useRef(!isCreate || Boolean(initialData?.seoTitle));
  const seoDescriptionEdited = useRef(
    !isCreate || Boolean(initialData?.seoDescription),
  );

  useEffect(() => {
    if (!isCreate || seoTitleEdited.current || seoTitle === title) return;
    setValue('seoTitle', title, { shouldDirty: Boolean(title) });
  }, [isCreate, seoTitle, setValue, title]);

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

  const selectThumbnail = useCallback(
    (media: MediaListItem | UploadMediaResponse) => {
      setValue('featuredImageId', media.id, { shouldDirty: true });
      setThumbnail({
        id: media.id,
        url: media.url,
        alt: media.alt,
        originalFilename: media.originalFilename,
      });
    },
    [setValue],
  );

  const clearThumbnail = useCallback(() => {
    setValue('featuredImageId', null, { shouldDirty: true });
    setThumbnail(null);
  }, [setValue]);

  const confirmPublish = useCallback(() => {
    setPublishConfirmOpen(false);
    setValue('status', 'PUBLISHED', { shouldDirty: true });
  }, [setValue]);

  const cancelPublish = useCallback(() => {
    setPublishConfirmOpen(false);
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader
        back={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/posts" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
        }
        title={isCreate ? '새 게시글' : '게시글 편집'}
      />
      <PageToolbar
        right={
          <>
            {!isCreate && initialData && (
              <DeletePostDialog
                title={initialData.title}
                isPending={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate(initialData.id)}
              />
            )}
            <Button
              type="submit"
              disabled={isPending || (!isDirty && !isCreate)}
            >
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

              <div className="space-y-2">
                <Label>게시판</Label>
                <Controller
                  name="boardId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <span>
                          {boards?.find((b) => b.id === field.value)?.name ??
                            '게시판 선택'}
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
                    onChange={(json) => {
                      field.onChange(json);
                      if (isCreate && !seoDescriptionEdited.current) {
                        const summary = extractTextFromTiptap(json)
                          .replace(/\s+/g, ' ')
                          .trim()
                          .slice(0, 160);
                        setValue('seoDescription', summary, {
                          shouldDirty: Boolean(summary),
                        });
                      }
                    }}
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
                  {...register('seoTitle', {
                    onChange: () => {
                      seoTitleEdited.current = true;
                    },
                  })}
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
                  {...register('seoDescription', {
                    onChange: () => {
                      seoDescriptionEdited.current = true;
                    },
                  })}
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
              <div className="space-y-4">
                <BooleanSwitchField
                  control={control}
                  name="isImportant"
                  label="중요 게시글"
                  description="목록에서 일반 게시글보다 먼저 표시됩니다."
                />
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

          <Card>
            <CardHeader>
              <CardTitle>썸네일 이미지</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                갤러리형 게시판 카드에 우선 표시됩니다. 선택하지 않으면 본문 첫
                이미지가 사용됩니다.
              </p>

              {thumbnail && featuredImageId ? (
                <div className="overflow-hidden rounded-md border bg-muted">
                  {/* 외부 스토리지 URL도 가능하므로 next/image 대신 일반 img */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaPreviewUrl(thumbnail.url)}
                    alt={thumbnail.alt ?? '썸네일 미리보기'}
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-md border border-dashed bg-muted text-sm text-muted-foreground">
                  <ImageOff className="mr-2 size-4" aria-hidden="true" />
                  선택된 썸네일이 없습니다.
                </div>
              )}

              {thumbnail?.originalFilename && featuredImageId && (
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={thumbnail.originalFilename}
                >
                  {thumbnail.originalFilename}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <MediaUploadButton
                  category="post-thumbnail"
                  acceptMimeTypes={POST_THUMBNAIL_ACCEPT_MIME}
                  variant="outline"
                  label="업로드"
                  onUploaded={selectThumbnail}
                />
                {canReadMedia && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPickerOpen(true)}
                  >
                    <Library className="size-4" />
                    라이브러리
                  </Button>
                )}
                {featuredImageId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearThumbnail}
                  >
                    <X className="size-4" />
                    제거
                  </Button>
                )}
              </div>

              <MediaPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={selectThumbnail}
                category="post-thumbnail"
                acceptMimeTypes={POST_THUMBNAIL_ACCEPT_MIME}
                disabledReason="게시글 썸네일에는 이미지 파일만 선택할 수 있습니다."
                title="게시글 썸네일 선택"
                description="갤러리 카드에 표시할 이미지를 선택하세요."
              />
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
