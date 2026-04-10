'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Globe, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';

import { domainSettingsOptions } from '../api/settingsQueries';
import { useUpdateDomain, useDeleteDomain, useCheckDns } from '../api/useSettingsMutations';
import { updateDomainSchema, type UpdateDomainData } from '../model/settingsSchemas';

export function DomainSettingsForm() {
  const { data } = useQuery(domainSettingsOptions());
  const updateMutation = useUpdateDomain();
  const deleteMutation = useDeleteDomain();
  const checkDnsMutation = useCheckDns();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateDomainData>({
    resolver: zodResolver(updateDomainSchema),
    values: { domain: data?.domain ?? '' },
  });

  const onSubmit = (formData: UpdateDomainData) => {
    updateMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-5" />
          커스텀 도메인
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="size-4" />
                  DNS 검증됨
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
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

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
            {data?.domain && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="size-4" />
                도메인 삭제
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
