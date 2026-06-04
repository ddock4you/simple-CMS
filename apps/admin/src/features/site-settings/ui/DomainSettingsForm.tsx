'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Globe, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { SettingsCardForm } from '@/entities/settings/ui/SettingsCardForm';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';

import { domainSettingsOptions } from '../api/settingsQueries';
import { useUpdateDomain, useDeleteDomain, useCheckDns } from '../api/useSettingsMutations';
import { updateDomainSchema, type UpdateDomainData } from '../model/settingsSchemas';

export function DomainSettingsForm() {
  const { data, isPending, isError, error } = useQuery(
    domainSettingsOptions(),
  );
  const updateMutation = useUpdateDomain();
  const deleteMutation = useDeleteDomain();
  const checkDnsMutation = useCheckDns();

  const form = useForm<UpdateDomainData>({
    resolver: zodResolver(updateDomainSchema),
    values: { domain: data?.domain ?? '' },
  });

  const { register, formState: { errors, isDirty } } = form;

  const onSubmit = (formData: UpdateDomainData) => {
    updateMutation.mutate(formData);
  };

  if (isError) {
    return (
      <QueryStateMessage
        title="도메인 설정을 불러오지 못했습니다."
        details={getQueryErrorMessage(error)}
        tone="destructive"
      />
    );
  }

  if (isPending || !data) {
    return <QueryStateMessage title="도메인 설정을 불러오는 중..." />;
  }

  return (
    <SettingsCardForm
      title="커스텀 도메인"
      icon={Globe}
      form={form}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      disabled={!isDirty}
      extraActions={
        data?.domain ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-4" />
            도메인 삭제
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="domain">도메인</Label>
          <Input
            id="domain"
            {...register('domain')}
            placeholder="www.example.com"
          />
          {errors.domain && (
            <p className="text-sm text-destructive">{errors.domain.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            프로토콜(http://)이나 경로 없이 호스트네임만 입력하세요.
          </p>
        </div>

        {data?.domain && (
          <div className="flex items-center gap-2 text-sm">
            {data.verified ? (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle className="size-4" />
                DNS 검증됨
              </span>
            ) : (
              <span className="flex items-center gap-1 text-warning">
                <XCircle className="size-4" />
                DNS 미검증
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => checkDnsMutation.mutate()}
              disabled={checkDnsMutation.isPending}
            >
              <RefreshCw className={`size-4 ${checkDnsMutation.isPending ? 'animate-spin' : ''}`} />
              DNS 확인
            </Button>
          </div>
        )}
      </div>
    </SettingsCardForm>
  );
}
