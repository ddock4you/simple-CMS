'use client';

import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DEFAULT_SITE_FOOTER_CONFIG } from '@simple-cms/types';

import { footerSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { useUpdateFooter } from '@/features/site-settings/api/useSettingsMutations';
import {
  updateFooterSchema,
  type UpdateFooterData,
} from '@/features/site-settings/model/settingsSchemas';
import { Button } from '@/shared/ui/Button';
import { BooleanSwitchField } from '@/shared/ui/BooleanSwitchField';
import { SettingsCardForm } from '@/entities/settings/ui/SettingsCardForm';
import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Switch } from '@/shared/ui/shadcn/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';

const SOCIAL_PLATFORM_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
  facebook: 'Facebook',
  blog: 'Blog',
} as const;

const BRANDING_ENDPOINT = '/api/media/branding-upload';
const FOOTER_LOGO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const FOOTER_LOGO_REASON = '푸터 로고는 PNG, JPG, WEBP만 사용할 수 있습니다.';

function toNullable(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function FooterSettingsForm() {
  const { data, isPending, isError, error } = useQuery(
    footerSettingsOptions(),
  );
  const updateMutation = useUpdateFooter();
  const [footerLogoUrlOverride, setFooterLogoUrlOverride] = useState<
    string | null
  >(null);

  const form = useForm<UpdateFooterData>({
    resolver: zodResolver(updateFooterSchema),
    defaultValues: DEFAULT_SITE_FOOTER_CONFIG,
  });

  const {
    control,
    formState: { errors, isDirty },
    register,
    reset,
    setValue,
  } = form;

  const contacts = useFieldArray({ control, name: 'contacts' });
  const quickLinks = useFieldArray({ control, name: 'quickLinks' });
  const socialLinks = useFieldArray({ control, name: 'socialLinks' });
  const bottomLinks = useFieldArray({ control, name: 'bottomLinks' });

  useEffect(() => {
    if (!data) return;
    reset(data);
  }, [data, reset]);

  const onSubmit = (formData: UpdateFooterData) => {
    updateMutation.mutate(formData);
  };

  const footerLogoMediaId = useWatch({ control, name: 'footerLogoMediaId' });
  const footerLogoUrl = footerLogoUrlOverride ?? data?.footerLogoUrl ?? '';

  const handleFooterLogoChange = (next: {
    url: string;
    mediaId: string | null;
  }) => {
    if (!next.mediaId && next.url) {
      toast.error('업로드 또는 라이브러리에서 선택해주세요.');
      return;
    }

    setValue('footerLogoMediaId', next.mediaId, { shouldDirty: true });
    setFooterLogoUrlOverride(next.url);
  };

  const handleRemoveFooterLogo = () => {
    setValue('footerLogoMediaId', null, { shouldDirty: true });
    setValue('footerLogoAlt', null, { shouldDirty: true });
    setFooterLogoUrlOverride('');
  };

  if (isError) {
    return (
      <QueryStateMessage
        title="푸터 설정을 불러오지 못했습니다."
        details={getQueryErrorMessage(error)}
        tone="destructive"
      />
    );
  }

  if (isPending || !data) {
    return <QueryStateMessage title="푸터 설정을 불러오는 중..." />;
  }

  return (
    <SettingsCardForm
      title="푸터 설정"
      description="KRDS Footer 기본 구조에 표시할 기관 정보와 정책 링크를 관리합니다."
      icon={LinkIcon}
      form={form}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      disabled={!isDirty}
    >
      <div className="space-y-8">
        <section className="rounded-lg border p-4">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-base font-medium">
              <ImageIcon className="size-4" />
              푸터 로고
            </h3>
            <p className="text-xs text-muted-foreground">
              공개 웹 푸터 좌측 로고입니다. 비워두면 KRDS 기본 로고 영역을
              사용합니다.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>로고 이미지</Label>
              <ImageUrlInput
                value={footerLogoUrl}
                mediaId={footerLogoMediaId}
                category="branding"
                endpoint={BRANDING_ENDPOINT}
                acceptMimeTypes={FOOTER_LOGO_MIME}
                disabledReason={FOOTER_LOGO_REASON}
                disableUrlInput
                onChange={handleFooterLogoChange}
              />
              <p className="text-xs text-muted-foreground">
                권장: 푸터 배경에서 잘 보이는 PNG/WEBP/JPG. SVG는 보안상
                차단됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer-logo-alt">로고 대체 텍스트</Label>
              <Input
                id="footer-logo-alt"
                {...register('footerLogoAlt', { setValueAs: toNullable })}
                placeholder="비우면 사이트명을 사용합니다."
                maxLength={120}
              />
              <ErrorText message={errors.footerLogoAlt?.message} />
            </div>

            {footerLogoMediaId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveFooterLogo}
              >
                <Trash2 className="size-4" />
                푸터 로고 제거
              </Button>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-medium">기본 정보</h3>
            <p className="text-xs text-muted-foreground">
              비워두면 공개 웹에서 사이트명 기반 기본 문구를 사용합니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer-address">주소</Label>
            <Input
              id="footer-address"
              {...register('address', { setValueAs: toNullable })}
              placeholder="예: 서울특별시 중구 세종대로 110"
              maxLength={200}
            />
            <ErrorText message={errors.address?.message} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="footer-identifier">식별자 문구</Label>
              <Input
                id="footer-identifier"
                {...register('identifierText', { setValueAs: toNullable })}
                placeholder="예: 이 누리집은 공공서비스 제공을 위한 누리집입니다."
                maxLength={120}
              />
              <ErrorText message={errors.identifierText?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer-copyright">저작권 문구</Label>
              <Input
                id="footer-copyright"
                {...register('copyright', { setValueAs: toNullable })}
                placeholder="미입력 시 사이트명 기반 자동 표시"
                maxLength={120}
              />
              <ErrorText message={errors.copyright?.message} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <BooleanSwitchField
              control={control}
              name="hideQuickLinks"
              label="퀵 링크 영역 숨김"
              description="관련 사이트 버튼 영역을 숨깁니다."
            />
            <BooleanSwitchField
              control={control}
              name="hideIdentifier"
              label="식별자 영역 숨김"
              description="하단 기관 식별자 문구 영역을 숨깁니다."
            />
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium">연락처</h3>
              <p className="text-xs text-muted-foreground">
                최대 4개까지 등록할 수 있습니다.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => contacts.append({ title: '', description: '' })}
              disabled={contacts.fields.length >= 4}
            >
              <Plus className="size-4" />
              추가
            </Button>
          </div>
          <div className="space-y-3">
            {contacts.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-[1fr_1fr_auto]"
              >
                <div className="space-y-1">
                  <Label>제목</Label>
                  <Input
                    {...register(`contacts.${index}.title`)}
                    placeholder="대표전화 0000-0000"
                  />
                  <ErrorText
                    message={errors.contacts?.[index]?.title?.message}
                  />
                </div>
                <div className="space-y-1">
                  <Label>설명</Label>
                  <Input
                    {...register(`contacts.${index}.description`)}
                    placeholder="평일 09시~18시"
                  />
                  <ErrorText
                    message={errors.contacts?.[index]?.description?.message}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => contacts.remove(index)}
                >
                  <Trash2 className="size-4" />
                  삭제
                </Button>
              </div>
            ))}
            {contacts.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                등록된 연락처가 없습니다.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium">퀵 링크</h3>
              <p className="text-xs text-muted-foreground">
                KRDS Footer 상단 관련 사이트 버튼입니다. 최대 4개까지 등록할 수
                있습니다.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                quickLinks.append({ title: '', url: '', openInNewTab: false })
              }
              disabled={quickLinks.fields.length >= 4}
            >
              <Plus className="size-4" />
              추가
            </Button>
          </div>
          <div className="space-y-3">
            {quickLinks.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-[1fr_1.5fr_auto_auto]"
              >
                <div className="space-y-1">
                  <Label>제목</Label>
                  <Input
                    {...register(`quickLinks.${index}.title`)}
                    placeholder="관련 사이트"
                  />
                  <ErrorText
                    message={errors.quickLinks?.[index]?.title?.message}
                  />
                </div>
                <div className="space-y-1">
                  <Label>URL</Label>
                  <Input
                    {...register(`quickLinks.${index}.url`)}
                    placeholder="/p/example 또는 https://example.com"
                  />
                  <ErrorText
                    message={errors.quickLinks?.[index]?.url?.message}
                  />
                </div>
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <Controller
                    control={control}
                    name={`quickLinks.${index}.openInNewTab`}
                    render={({ field: switchField }) => (
                      <Switch
                        checked={switchField.value ?? false}
                        onCheckedChange={switchField.onChange}
                      />
                    )}
                  />
                  새 탭
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => quickLinks.remove(index)}
                >
                  <Trash2 className="size-4" />
                  삭제
                </Button>
              </div>
            ))}
            {quickLinks.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                등록된 퀵 링크가 없습니다.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium">소셜 링크</h3>
              <p className="text-xs text-muted-foreground">
                플랫폼별 아이콘 링크입니다. 최대 5개까지 등록할 수 있습니다.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                socialLinks.append({
                  platform: 'instagram',
                  href: '',
                  openInNewTab: true,
                })
              }
              disabled={socialLinks.fields.length >= 5}
            >
              <Plus className="size-4" />
              추가
            </Button>
          </div>
          <div className="space-y-3">
            {socialLinks.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-[180px_1fr_auto_auto]"
              >
                <div className="space-y-1">
                  <Label>플랫폼</Label>
                  <Controller
                    control={control}
                    name={`socialLinks.${index}.platform`}
                    render={({ field: platformField }) => (
                      <Select
                        value={platformField.value}
                        onValueChange={(value) =>
                          platformField.onChange(
                            value as UpdateFooterData['socialLinks'][number]['platform'],
                          )
                        }
                      >
                        <SelectTrigger>
                          <span>
                            {SOCIAL_PLATFORM_LABELS[platformField.value]}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SOCIAL_PLATFORM_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label>URL</Label>
                  <Input
                    {...register(`socialLinks.${index}.href`)}
                    placeholder="https://example.com"
                  />
                  <ErrorText
                    message={errors.socialLinks?.[index]?.href?.message}
                  />
                </div>
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <Controller
                    control={control}
                    name={`socialLinks.${index}.openInNewTab`}
                    render={({ field: switchField }) => (
                      <Switch
                        checked={switchField.value ?? false}
                        onCheckedChange={switchField.onChange}
                      />
                    )}
                  />
                  새 탭
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => socialLinks.remove(index)}
                >
                  <Trash2 className="size-4" />
                  삭제
                </Button>
              </div>
            ))}
            {socialLinks.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                등록된 소셜 링크가 없습니다.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium">하단 정책 링크</h3>
              <p className="text-xs text-muted-foreground">
                개인정보처리방침, 저작권 정책 같은 법적/정책 링크입니다. 일반
                푸터 메뉴는 메뉴 관리의 FOOTER 슬롯에서 관리합니다.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                bottomLinks.append({
                  text: '',
                  href: '',
                  openInNewTab: false,
                  isHighlighted: false,
                })
              }
              disabled={bottomLinks.fields.length >= 6}
            >
              <Plus className="size-4" />
              추가
            </Button>
          </div>
          <div className="space-y-3">
            {bottomLinks.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg bg-muted/40 p-3 md:grid-cols-[1fr_1.5fr_auto_auto_auto]"
              >
                <div className="space-y-1">
                  <Label>링크명</Label>
                  <Input
                    {...register(`bottomLinks.${index}.text`)}
                    placeholder="개인정보처리방침"
                  />
                  <ErrorText
                    message={errors.bottomLinks?.[index]?.text?.message}
                  />
                </div>
                <div className="space-y-1">
                  <Label>URL</Label>
                  <Input
                    {...register(`bottomLinks.${index}.href`)}
                    placeholder="/p/privacy"
                  />
                  <ErrorText
                    message={errors.bottomLinks?.[index]?.href?.message}
                  />
                </div>
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <Controller
                    control={control}
                    name={`bottomLinks.${index}.isHighlighted`}
                    render={({ field: switchField }) => (
                      <Switch
                        checked={switchField.value ?? false}
                        onCheckedChange={switchField.onChange}
                      />
                    )}
                  />
                  강조
                </label>
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <Controller
                    control={control}
                    name={`bottomLinks.${index}.openInNewTab`}
                    render={({ field: switchField }) => (
                      <Switch
                        checked={switchField.value ?? false}
                        onCheckedChange={switchField.onChange}
                      />
                    )}
                  />
                  새 탭
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => bottomLinks.remove(index)}
                >
                  <Trash2 className="size-4" />
                  삭제
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SettingsCardForm>
  );
}
