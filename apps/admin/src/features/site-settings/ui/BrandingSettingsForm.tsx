'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/Button';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';

import { brandingSettingsOptions } from '../api/settingsQueries';
import {
  useDeleteBrandingAsset,
  useUpdateBranding,
} from '../api/useSettingsMutations';
import {
  updateBrandingSchema,
  type BrandingAssetKind,
  type UpdateBrandingData,
} from '../model/settingsSchemas';

const BRANDING_ENDPOINT = '/api/media/branding-upload';

const FAVICON_MIME = [
  'image/png',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];
const OG_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const FAVICON_REASON = '파비콘은 PNG, WEBP, ICO만 사용할 수 있습니다.';
const OG_REASON = 'OG 이미지는 PNG, JPG, WEBP만 사용할 수 있습니다.';
type VisibleBrandingAssetKind = Exclude<BrandingAssetKind, 'logo'>;

export function BrandingSettingsForm() {
  const { data, isPending, isError, error } = useQuery(
    brandingSettingsOptions(),
  );
  const updateMutation = useUpdateBranding();
  const deleteAssetMutation = useDeleteBrandingAsset();

  // 표시용 url state — form 필드(mediaId만)와 분리
  const [faviconUrlOverride, setFaviconUrlOverride] = useState<string | null>(
    null,
  );
  const [ogImageUrlOverride, setOgImageUrlOverride] = useState<string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
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

  // GET 데이터 로드/갱신 시 form + local url 동기화
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

  const dirtyGuard = useDirtyGuard(isDirty);

  const onSubmit = (formData: UpdateBrandingData) => {
    updateMutation.mutate({
      ...formData,
      logoMediaId: data?.logoMediaId ?? null,
      logoAlt: data?.logoAlt ?? null,
    });
  };

  /**
   * ImageUrlInput onChange 가드 — mediaId 없는 url 입력은 차단(외부 URL 미지원).
   * disableUrlInput=true로 input은 readOnly이지만, 만약을 위해 onChange에서도 한 번 더 검증.
   */
  const handleAssetChange = (
    field: 'faviconMediaId' | 'ogImageMediaId',
    setLocalUrl: (url: string) => void,
    next: { url: string; mediaId: string | null },
  ) => {
    if (!next.mediaId && next.url) {
      toast.error('업로드 또는 라이브러리에서 선택해주세요.');
      return;
    }
    setValue(field, next.mediaId, { shouldDirty: true });
    setLocalUrl(next.url);
  };

  const handleDeleteAsset = (kind: VisibleBrandingAssetKind) => {
    deleteAssetMutation.mutate(kind, {
      onSuccess: () => {
        if (kind === 'favicon') {
          setValue('faviconMediaId', null, { shouldDirty: false });
          setFaviconUrlOverride('');
        } else {
          setValue('ogImageMediaId', null, { shouldDirty: false });
          setOgImageUrlOverride('');
        }
      },
    });
  };

  const watchFaviconMediaId = useWatch({ control, name: 'faviconMediaId' });
  const watchOgImageMediaId = useWatch({ control, name: 'ogImageMediaId' });
  const faviconUrl = faviconUrlOverride ?? data?.faviconUrl ?? '';
  const ogImageUrl = ogImageUrlOverride ?? data?.ogImageUrl ?? '';

  if (isError) {
    return (
      <QueryStateMessage
        title="브랜딩 설정을 불러오지 못했습니다."
        details={getQueryErrorMessage(error)}
        tone="destructive"
      />
    );
  }

  if (isPending || !data) {
    return <QueryStateMessage title="브랜딩 설정을 불러오는 중..." />;
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <PageToolbar
          right={
            <Button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          }
          mobileCollapseRight={false}
          breakout={false}
        />

        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">사이트명</Label>
              <Input
                id="siteName"
                {...register('siteName')}
                placeholder="예: 우리 회사 CMS"
                maxLength={60}
              />
              {errors.siteName && (
                <p className="text-sm text-destructive">
                  {errors.siteName.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                메타데이터 title과 푸터 copyright에 사용됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">사이트 설명 (SEO)</Label>
              <Textarea
                id="siteDescription"
                {...register('siteDescription', {
                  setValueAs: (v) => {
                    const s = typeof v === 'string' ? v.trim() : '';
                    return s === '' ? null : s;
                  },
                })}
                placeholder="검색 엔진과 SNS 미리보기에 표시되는 설명 (200자 이내 권장)"
                maxLength={200}
                rows={3}
              />
              {errors.siteDescription && (
                <p className="text-sm text-destructive">
                  {errors.siteDescription.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>파비콘 (브라우저 탭 아이콘)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <ImageUrlInput
                value={faviconUrl}
                mediaId={watchFaviconMediaId}
                category="branding"
                endpoint={BRANDING_ENDPOINT}
                acceptMimeTypes={FAVICON_MIME}
                disabledReason={FAVICON_REASON}
                disableUrlInput
                onChange={(next) =>
                  handleAssetChange(
                    'faviconMediaId',
                    setFaviconUrlOverride,
                    next,
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                권장: 32×32 ~ 512×512 정사각형 PNG. ICO도 가능하지만 브라우저별
                MIME 인식 차이로 거부될 수 있어 PNG 권장. 변경 후 브라우저
                캐시로 사용자에게 반영되기까지 수일 걸릴 수 있습니다.
              </p>
            </div>

            {watchFaviconMediaId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDeleteAsset('favicon')}
                disabled={deleteAssetMutation.isPending}
              >
                <Trash2 className="size-4" />
                파비콘 제거
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OG 이미지 (SNS 미리보기)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <ImageUrlInput
                value={ogImageUrl}
                mediaId={watchOgImageMediaId}
                category="branding"
                endpoint={BRANDING_ENDPOINT}
                acceptMimeTypes={OG_MIME}
                disabledReason={OG_REASON}
                disableUrlInput
                onChange={(next) =>
                  handleAssetChange(
                    'ogImageMediaId',
                    setOgImageUrlOverride,
                    next,
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                권장: 1200×630 PNG/JPG. Twitter/Slack/카톡 등 SNS 카드 미리보기에
                사용됩니다.
              </p>
            </div>

            {watchOgImageMediaId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDeleteAsset('og')}
                disabled={deleteAssetMutation.isPending}
              >
                <Trash2 className="size-4" />
                OG 이미지 제거
              </Button>
            )}
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
