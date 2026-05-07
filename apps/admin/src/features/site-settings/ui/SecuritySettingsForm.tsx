'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Switch } from '@/shared/ui/shadcn/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';

import { securitySettingsOptions } from '../api/settingsQueries';
import { useUpdateSecurity } from '../api/useSettingsMutations';

export function SecuritySettingsForm() {
  const { data } = useQuery(securitySettingsOptions());
  const updateMutation = useUpdateSecurity();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const currentValue = data?.concurrentLoginEnabled ?? true;

  const handleDisable = () => {
    updateMutation.mutate({ concurrentLoginEnabled: false });
    setConfirmOpen(false);
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
          <label className="flex cursor-pointer items-center gap-3">
            <Switch
              checked={currentValue}
              onCheckedChange={(checked) => {
                if (checked) {
                  updateMutation.mutate({ concurrentLoginEnabled: true });
                } else {
                  setConfirmOpen(true);
                }
              }}
              disabled={updateMutation.isPending}
            />
            <span className="text-sm font-medium">
              {currentValue ? '동시 로그인 허용' : '단일 세션 강제'}
            </span>
          </label>

          <p className="text-xs text-muted-foreground">
            {currentValue
              ? '같은 계정으로 여러 기기/브라우저에서 동시에 로그인할 수 있습니다.'
              : '새 로그인 시 기존 세션이 모두 무효화됩니다. 변경 사항은 다음 로그인부터 적용됩니다.'}
          </p>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
      </CardContent>
    </Card>
  );
}
