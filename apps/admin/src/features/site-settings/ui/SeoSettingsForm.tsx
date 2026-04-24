'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Globe } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';

import { seoSettingsOptions } from '../api/settingsQueries';
import { useUpdateSeo } from '../api/useSettingsMutations';
import {
  updateSeoSchema,
  type UpdateSeoData,
} from '../model/settingsSchemas';

function parseTextareaToPaths(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function pathsToTextarea(paths: string[]): string {
  return paths.join('\n');
}

export function SeoSettingsForm() {
  const { data } = useQuery(seoSettingsOptions());
  const updateMutation = useUpdateSeo();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateSeoData>({
    resolver: zodResolver(updateSeoSchema),
    defaultValues: { robotsAdditionalDisallow: [] },
  });

  useEffect(() => {
    if (data) {
      reset({ robotsAdditionalDisallow: data.robotsAdditionalDisallow });
    }
  }, [data, reset]);

  const onSubmit = (formData: UpdateSeoData) => {
    updateMutation.mutate(formData);
  };

  const baseUrl = data?.baseUrl ?? '';
  const sitemapUrl = data?.sitemapUrl ?? '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            sitemap.xml · robots.txt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">
              공개 URL
            </div>
            <div className="font-mono text-sm">{baseUrl || '(미설정)'}</div>
            <p className="text-xs text-muted-foreground">
              도메인 설정 탭에서 변경할 수 있습니다.
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">
              sitemap URL
            </div>
            <a
              href={sitemapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary underline-offset-4 hover:underline"
            >
              {sitemapUrl}
            </a>
            <p className="text-xs text-muted-foreground">
              공개된 서브페이지·게시판·게시글이 자동 포함됩니다. 검색엔진
              콘솔(Google Search Console 등)에 이 URL을 등록하세요.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>robots.txt 추가 Disallow</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="robotsAdditionalDisallow">
                크롤링을 차단할 경로 (한 줄에 하나)
              </Label>
              <Controller
                name="robotsAdditionalDisallow"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="robotsAdditionalDisallow"
                    value={pathsToTextarea(field.value)}
                    onChange={(e) =>
                      field.onChange(parseTextareaToPaths(e.target.value))
                    }
                    onBlur={field.onBlur}
                    placeholder={'/preview\n/_internal'}
                    rows={8}
                    className="font-mono text-sm"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                <code className="font-mono">/api/</code>는 기본으로 차단됩니다.
                경로는 <code className="font-mono">/</code>로 시작해야 하며,
                최대 50개까지 설정 가능합니다. 변경 사항은 공개 웹에 최대
                1분 후 반영됩니다.
              </p>
              {errors.robotsAdditionalDisallow && (
                <p className="text-sm text-destructive">
                  {errors.robotsAdditionalDisallow.message ??
                    errors.robotsAdditionalDisallow.root?.message ??
                    errors.robotsAdditionalDisallow[0]?.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
