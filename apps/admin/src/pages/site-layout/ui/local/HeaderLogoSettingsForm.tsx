'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';
import { brandingSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { useUpdateBranding } from '@/features/site-settings/api/useSettingsMutations';
import {
  updateBrandingSchema,
  type UpdateBrandingData,
} from '@/features/site-settings/model/settingsSchemas';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { Button } from '@/shared/ui/Button';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';

const BRANDING_ENDPOINT = '/api/media/branding-upload';
const LOGO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const LOGO_REASON = '로고는 PNG, JPG, WEBP만 사용할 수 있습니다.';

function toNullable(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

export function HeaderLogoSettingsForm({ toolbarSticky = true }: { toolbarSticky?: boolean }) {
  const canUpdate = usePermission('settings', 'update');
  const { data, isPending, isError, error } = useQuery(
    brandingSettingsOptions(),
  );
  const updateMutation = useUpdateBranding();
  const [logoUrlOverride, setLogoUrlOverride] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdateBrandingData>({
    resolver: zodResolver(updateBrandingSchema),
    defaultValues: {
      siteName: 'Simple CMS',
      siteDescription: null,
      logoMediaId: null,
      logoAlt: null,
      faviconMediaId: null,
      ogImageMediaId: null,
    },
  });

  useEffect(() => {
    if (!data) return;
    reset({
      siteName: data.siteName,
      siteDescription: data.siteDescription,
      logoMediaId: data.logoMediaId,
      logoAlt: data.logoAlt,
      faviconMediaId: data.faviconMediaId,
      ogImageMediaId: data.ogImageMediaId,
    });
  }, [data, reset]);

  const dirtyGuard = useDirtyGuard(isDirty && canUpdate);
  const logoMediaId = useWatch({ control, name: 'logoMediaId' });
  const logoUrl = logoUrlOverride ?? data?.logoUrl ?? '';

  const onSubmit = (formData: UpdateBrandingData) => {
    if (!canUpdate) return;
    updateMutation.mutate(formData);
  };

  if (isError) {
    return (
      <QueryStateMessage
        title="헤더 로고 설정을 불러오지 못했습니다."
        details={getQueryErrorMessage(error)}
        tone="destructive"
      />
    );
  }

  if (isPending || !data) {
    return <QueryStateMessage title="헤더 로고 설정을 불러오는 중..." />;
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PageToolbar
          right={
            <Button
              type="submit"
              disabled={!canUpdate || updateMutation.isPending || !isDirty}
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          }
          mobileCollapseRight={false}
          sticky={toolbarSticky}
          breakout={false}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              헤더 로고
            </CardTitle>
          </CardHeader>
          <CardContent>
            <fieldset disabled={!canUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>로고 이미지</Label>
                <ImageUrlInput
                  value={logoUrl}
                  mediaId={logoMediaId}
                  category="branding"
                  endpoint={BRANDING_ENDPOINT}
                  acceptMimeTypes={LOGO_MIME}
                  disabledReason={LOGO_REASON}
                  disableUrlInput
                  disabled={!canUpdate}
                  onChange={(next) => {
                    if (!next.mediaId && next.url) {
                      toast.error('업로드 또는 라이브러리에서 선택해주세요.');
                      return;
                    }
                    setValue('logoMediaId', next.mediaId, {
                      shouldDirty: true,
                    });
                    setLogoUrlOverride(next.url);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  공개 웹 헤더 좌측에 표시됩니다. SVG는 보안상 차단됩니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="header-logo-alt">로고 대체 텍스트</Label>
                <Input
                  id="header-logo-alt"
                  {...register('logoAlt', { setValueAs: toNullable })}
                  placeholder="비우면 사이트명을 사용합니다."
                  maxLength={120}
                />
                {errors.logoAlt && (
                  <p className="text-sm text-destructive">
                    {errors.logoAlt.message}
                  </p>
                )}
              </div>

              {logoMediaId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canUpdate}
                  onClick={() => {
                    setValue('logoMediaId', null, { shouldDirty: true });
                    setValue('logoAlt', null, { shouldDirty: true });
                    setLogoUrlOverride('');
                  }}
                >
                  로고 제거
                </Button>
              )}
            </fieldset>
          </CardContent>
        </Card>

        <div>
          <p className="text-xs text-muted-foreground">
            변경사항은 공개 웹에 최대 1분 후 반영됩니다.
          </p>
        </div>
      </form>

      <ConfirmLeaveDialog {...dirtyGuard.confirmDialogProps} />
    </>
  );
}
