'use client';

import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
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
} from '@/shared/ui/shadcn/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/shadcn/alert-dialog';

import { securitySettingsOptions } from '../api/settingsQueries';
import { useUpdateSecurity } from '../api/useSettingsMutations';

export function SecuritySettingsForm() {
  const { data } = useQuery(securitySettingsOptions());
  const updateMutation = useUpdateSecurity();

  const currentValue = data?.concurrentLoginEnabled ?? true;

  const handleChange = (enabled: boolean) => {
    if (!enabled) {
      // false 전환은 확인 다이얼로그에서 처리
      return;
    }
    updateMutation.mutate({ concurrentLoginEnabled: true });
  };

  const handleDisable = () => {
    updateMutation.mutate({ concurrentLoginEnabled: false });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          동시 로그인 정책
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Select
              value={currentValue ? 'true' : 'false'}
              onValueChange={(v) => {
                if (v === 'true') handleChange(true);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <span>{currentValue ? '동시 로그인 허용' : '단일 세션 강제'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">동시 로그인 허용</SelectItem>
                <SelectItem value="false">단일 세션 강제</SelectItem>
              </SelectContent>
            </Select>

            {currentValue && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="outline" size="sm" />}
                >
                  단일 세션으로 변경
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>단일 세션 강제</AlertDialogTitle>
                    <AlertDialogDescription>
                      동시 로그인을 차단하시겠습니까? 다음 로그인부터 기존 세션이 자동으로 종료됩니다.
                      현재 활성 세션에는 영향을 주지 않습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisable}>
                      변경
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {currentValue
              ? '같은 계정으로 여러 기기/브라우저에서 동시에 로그인할 수 있습니다.'
              : '새 로그인 시 기존 세션이 모두 무효화됩니다. 변경 사항은 다음 로그인부터 적용됩니다.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
