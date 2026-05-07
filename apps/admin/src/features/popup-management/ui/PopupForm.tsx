'use client';

import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import type {
  HomePopupDetail,
  HomePopupType,
  CreateHomePopupDto,
} from '@simple-cms/types';

import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { BooleanSwitchField } from '@/shared/ui/BooleanSwitchField';
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
import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';

import {
  popupFormSchema,
  type PopupFormValues,
} from '../model/popupSchemas';
import {
  POPUP_TYPE_LABELS,
  POPUP_TYPE_DESCRIPTIONS,
} from '../model/popupLabels';
import {
  useCreateHomePopup,
  useUpdateHomePopup,
  useDeleteHomePopup,
} from '../api/usePopupMutations';

import { PopupContentFields } from './PopupContentFields';
import { PopupImageFields } from './PopupImageFields';
import { DeletePopupDialog } from './DeletePopupDialog';

interface PopupFormProps {
  mode: 'create' | 'edit';
  initialData?: HomePopupDetail;
}

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function toDefaults(initialData?: HomePopupDetail): PopupFormValues {
  if (!initialData) {
    return {
      popupType: 'CONTENT' as HomePopupType,
      title: '',
      contentJson: null,
      imageUrl: '',
      imageAlt: '',
      imageMediaId: null,
      linkUrl: '',
      buttonLabel: '',
      isVisible: true,
      displayOrder: undefined,
      startDate: null,
      endDate: null,
    };
  }
  return {
    popupType: initialData.popupType,
    title: initialData.title,
    contentJson:
      (initialData.contentJson as Record<string, unknown> | null) ?? null,
    imageUrl: initialData.imageUrl ?? '',
    imageAlt: initialData.imageAlt ?? '',
    imageMediaId: initialData.imageMediaId ?? null,
    linkUrl: initialData.linkUrl ?? '',
    buttonLabel: initialData.buttonLabel ?? '',
    isVisible: initialData.isVisible,
    displayOrder: initialData.displayOrder,
    startDate: toLocalInputValue(initialData.startDate) || null,
    endDate: toLocalInputValue(initialData.endDate) || null,
  };
}

export function PopupForm({ mode, initialData }: PopupFormProps) {
  const isCreate = mode === 'create';
  const createMutation = useCreateHomePopup();
  const updateMutation = useUpdateHomePopup(initialData?.id ?? '');
  const deleteMutation = useDeleteHomePopup();
  const canDelete = usePermission('home-popups', 'delete');

  const form = useForm<PopupFormValues>({
    resolver: zodResolver(popupFormSchema),
    defaultValues: toDefaults(initialData),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = form;

  const popupType = watch('popupType');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { confirmDialogProps: leaveDialogProps } = useDirtyGuard(isDirty);

  const onSubmit = (data: PopupFormValues) => {
    const startIso = data.startDate ? new Date(data.startDate).toISOString() : null;
    const endIso = data.endDate ? new Date(data.endDate).toISOString() : null;

    const payload: CreateHomePopupDto = {
      popupType: data.popupType,
      title: data.title,
      contentJson:
        data.popupType === 'CONTENT' ? (data.contentJson ?? null) : null,
      imageUrl: data.popupType === 'IMAGE' ? (data.imageUrl ?? null) : null,
      imageAlt: data.popupType === 'IMAGE' ? (data.imageAlt ?? null) : null,
      imageMediaId:
        data.popupType === 'IMAGE' ? (data.imageMediaId ?? null) : null,
      linkUrl: data.linkUrl ?? null,
      buttonLabel: data.buttonLabel ?? null,
      isVisible: data.isVisible ?? true,
      displayOrder: data.displayOrder,
      startDate: startIso,
      endDate: endIso,
    };

    if (isCreate) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader
        back={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/popups" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
        }
        title={isCreate ? '새 메인 팝업' : '메인 팝업 편집'}
      />
      <PageToolbar
        right={
          <>
            {!isCreate && initialData && canDelete && (
              <DeletePopupDialog
                title={initialData.title}
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
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="팝업 제목"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>팝업 유형 *</Label>
                <Controller
                  name="popupType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) =>
                        field.onChange(v as HomePopupType)
                      }
                    >
                      <SelectTrigger>
                        <span>
                          {POPUP_TYPE_LABELS[field.value as HomePopupType] ??
                            '선택'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {(['CONTENT', 'IMAGE'] as const).map((t) => (
                          <SelectItem key={t} value={t}>
                            {POPUP_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {POPUP_TYPE_DESCRIPTIONS[popupType as HomePopupType] ?? ''}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {popupType === 'IMAGE' ? '이미지 내용' : '콘텐츠'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {popupType === 'CONTENT' ? (
                <PopupContentFields form={form} />
              ) : (
                <PopupImageFields form={form} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>노출 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BooleanSwitchField
                control={control}
                name="isVisible"
                label="공개 웹에 노출"
              />

              <div className="space-y-2">
                <Label htmlFor="startDate">시작일 (선택)</Label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">종료일 (선택)</Label>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  )}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">
                    {errors.endDate.message}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                시작/종료일이 비어있으면 제한 없이 노출됩니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmLeaveDialog {...leaveDialogProps} />
    </form>
  );
}
