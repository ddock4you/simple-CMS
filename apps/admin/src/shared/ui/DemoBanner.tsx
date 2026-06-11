'use client';

/**
 * 시연 모드 안내 배너 (admin).
 *
 * - 좌측: warning Badge + "시연 모드 — 1시간 후 자동 초기화" 안내
 * - 가운데: 남은 시간 카운트다운 (setInterval 1s update)
 * - 우측: [새 세션 시작] 버튼 → AlertDialog 확인 → POST /api/demo/reset → router.replace
 *
 * 만료 도달 시: countdown 표시는 "0초"로 멈추되 redirect는 하지 않음 — 다음 navigation에서
 * layout gate(ensureDemoSession)가 splash로 보낸다.
 *
 * sticky chain: AdminHeader 위 별도 strip (top-0 z-50, h-9). globals.css의 `--demo-banner-h`
 * 변수를 layout이 inline style로 2.25rem 설정 → AdminHeader/PageToolbar의 top 자동 보정.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { demoAdminApiPath, DEMO_BOOTSTRAP_PATH } from '@simple-cms/types';

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
} from '@/shared/ui/AlertDialog';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';

interface DemoBannerProps {
  /** Session.expires ISO string. ensureDemoSession이 layout에서 prop으로 전달 */
  expiresAt: string;
  /**
   * [새 세션 시작] reset API 경로.
   * admin/web 모두 단일 도메인 + admin basePath이라 명시 prefix 사용 — Next.js fetch는
   * basePath를 자동 prepend하지 않으므로 명시 필요.
   */
  resetEndpoint?: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0초';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  }
  return `${minutes}분 ${seconds}초`;
}

export function DemoBanner({
  expiresAt,
  resetEndpoint = demoAdminApiPath('/api/demo/reset'),
}: DemoBannerProps) {
  const router = useRouter();
  const expiresMs = useRef(new Date(expiresAt).getTime());
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    expiresMs.current = new Date(expiresAt).getTime();
    setRemaining(Math.max(0, expiresMs.current - Date.now()));
  }, [expiresAt]);

  useEffect(() => {
    const updateRemaining = () => {
      setRemaining(Math.max(0, expiresMs.current - Date.now()));
    };
    updateRemaining();
    const id = setInterval(updateRemaining, 1000);
    return () => clearInterval(id);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch(resetEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const json = (await res.json().catch(() => null)) as
        | { success: boolean; data?: { redirectTo: string }; error?: string }
        | null;
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? '세션 초기화 중 오류가 발생했습니다.');
        return;
      }
      const redirectTo = json.data?.redirectTo ?? DEMO_BOOTSTRAP_PATH;
      setDialogOpen(false);
      router.replace(redirectTo);
    } catch (err) {
      console.error('[DemoBanner] reset error', err);
      toast.error('세션 초기화 중 네트워크 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      data-testid="demo-banner"
      className="sticky top-0 z-50 flex h-9 items-center justify-between gap-3 border-b bg-warning/10 px-4 text-xs text-foreground"
    >
      <div className="flex items-center gap-2 truncate">
        <Badge variant="warning">시연 모드</Badge>
        <span className="hidden truncate sm:inline">
          모든 데이터는 1시간 후 자동 초기화됩니다.
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-medium tabular-nums">
          남은 시간 {remaining === null ? '계산 중' : formatRemaining(remaining)}
        </span>
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
              />
            }
          >
            새 세션 시작
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>새 시연 세션을 시작할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                현재 세션의 모든 콘텐츠와 업로드 파일이 삭제되고, 시드 데이터로
                초기화된 새 세션으로 이동합니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? '초기화 중…' : '새 세션 시작'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
