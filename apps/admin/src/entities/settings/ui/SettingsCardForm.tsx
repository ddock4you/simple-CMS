'use client';

import type { ReactNode } from 'react';
import type { FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';

interface SettingsCardFormProps<TFormData extends FieldValues> {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  form: UseFormReturn<TFormData>;
  onSubmit: SubmitHandler<TFormData>;
  /** mutation 진행 중 여부 — true일 때 submittingLabel 표시 */
  isPending: boolean;
  /** 추가 disabled 조건 (예: !isDirty). isPending과 별도로 버튼을 비활성화 */
  disabled?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  /** CardFooter에서 [저장] 버튼 왼쪽에 렌더되는 추가 액션 슬롯 */
  extraActions?: ReactNode;
  children: ReactNode;
}

export function SettingsCardForm<TFormData extends FieldValues>({
  title,
  description,
  icon: Icon,
  form,
  onSubmit,
  isPending,
  disabled,
  submitLabel = '저장',
  submittingLabel = '저장 중...',
  extraActions,
  children,
}: SettingsCardFormProps<TFormData>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="size-5" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>{children}</CardContent>
        <CardFooter className="justify-end gap-2">
          {extraActions}
          <Button type="submit" disabled={isPending || disabled}>
            {isPending ? submittingLabel : submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
