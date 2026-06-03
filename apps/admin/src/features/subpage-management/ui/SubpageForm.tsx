'use client';

import { useCallback, useState } from 'react';
import { AdminLink as Link } from '@/shared/ui/AdminLink';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { BooleanSwitchField } from '@/shared/ui/BooleanSwitchField';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';
import { CCL_TYPE_LABELS, type CclType } from '@simple-cms/types';

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
      seoTitle: initialData?.seoTitle ?? '',
      seoDescription: initialData?.seoDescription ?? '',
      status: initialData?.status ?? 'DRAFT',
      cclType: initialData?.cclType ?? null,
      cclAi: initialData?.cclAi ?? false,
      feedbackEnabled: initialData?.feedbackEnabled ?? false,
    },
  });

  const cclType = watch('cclType') ?? null;
  const initialStatus = initialData?.status ?? 'DRAFT';

  const onSubmit = (data: CreateSubpageData | UpdateSubpageData) => {
    if (isCreate) {
      createMutation.mutate(data as CreateSubpageData);
    } else {
      updateMutation.mutate(data as UpdateSubpageData);
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
      <PageHeader
        back={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/subpages" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
        }
        title={isCreate ? '새 서브 페이지' : '서브 페이지 편집'}
      />
      <PageToolbar
        right={
          <>
            {!isCreate && initialData && (
              <DeleteSubpageDialog
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
        mobileCollapseRight={false}
      />

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

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  라이선스 (공공누리)
                </h3>
                <Controller
                  name="cclType"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <RadioOption
                        name={field.name}
                        value={null}
                        checked={(field.value ?? null) === null}
                        onChange={() => {
                          field.onChange(null);
                          setValue('cclAi', false, { shouldDirty: true });
                        }}
                        label="표시 없음"
                      />
                      {(
                        ['TYPE_0', 'TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4'] as CclType[]
                      ).map((type) => (
                        <RadioOption
                          key={type}
                          name={field.name}
                          value={type}
                          checked={field.value === type}
                          onChange={() => field.onChange(type)}
                          label={CCL_TYPE_LABELS[type]}
                        />
                      ))}
                    </div>
                  )}
                />
                <BooleanSwitchField
                  control={control}
                  name="cclAi"
                  label="AI 학습·활용 가능 표시"
                  disabled={cclType === null}
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  공개 옵션
                </h3>
                <BooleanSwitchField
                  control={control}
                  name="feedbackEnabled"
                  label="사용자 피드백 UI 표시"
                  description="공개 웹 서브페이지 하단에 만족도 조사를 노출합니다. 비공개(초안)인 페이지에는 표시되지 않습니다."
                />
              </section>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmLeaveDialog {...leaveDialogProps} />
      <ConfirmLeaveDialog
        open={publishConfirmOpen}
        onConfirm={confirmPublish}
        onCancel={cancelPublish}
        title="저장하지 않은 변경사항도 함께 발행됩니다"
        description={
          initialStatus === 'DRAFT'
            ? '편집 중인 제목·SEO 등 메타데이터가 발행 상태로 저장됩니다. 계속하시겠습니까?'
            : '편집 중인 메타데이터가 발행 상태로 저장됩니다. 계속하시겠습니까?'
        }
        confirmLabel="발행으로 변경"
        cancelLabel="취소"
      />
    </form>
  );
}

interface RadioOptionProps {
  name: string;
  value: CclType | null;
  checked: boolean;
  onChange: () => void;
  label: string;
}

function RadioOption({ name, value, checked, onChange, label }: RadioOptionProps) {
  const id = `${name}-${value ?? 'none'}`;
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}
