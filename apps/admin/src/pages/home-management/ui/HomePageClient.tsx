'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { homeKeys } from '@/shared/api/queryKeys';
import { useStagedOrder } from '@/shared/lib/useStagedOrder';
import { useDirtyGuard } from '@/shared/lib/useDirtyGuard';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { OrderActionButtons } from '@/shared/ui/OrderActionButtons';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';
import { homeSectionListOptions } from '@/features/home-management/api/homeQueries';
import { useReorderHomeSections } from '@/features/home-management/api/useHomeMutations';
import { SectionList } from '@/features/home-management/ui/SectionList';

interface HomePageClientProps {
  canUpdate: boolean;
}

export function HomePageClient({ canUpdate }: HomePageClientProps) {
  const queryClient = useQueryClient();
  const {
    data: sections,
    isPending,
    isError,
    error,
  } = useQuery(homeSectionListOptions());
  const reorderMutation = useReorderHomeSections();

  const { items, isDirty, dirtyCount, applyDragEnd, getDirtyPayload, reset } =
    useStagedOrder({
      data: sections ?? [],
      mode: 'list',
      getId: (s) => s.id,
      getOrder: (s) => s.displayOrder,
    });

  const { confirmDialogProps } = useDirtyGuard(isDirty && canUpdate);

  const handleSave = useCallback(() => {
    reorderMutation.mutate(
      { sections: getDirtyPayload() },
      {
        onSuccess: () => {
          toast.success('순서가 저장되었습니다.');
          void queryClient.invalidateQueries({ queryKey: homeKeys.all }).then(() => reset());
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }, [reorderMutation, getDirtyPayload, queryClient, reset]);

  if (isPending) {
    return <QueryStateMessage title="섹션을 불러오는 중..." />;
  }

  if (isError) {
    return (
      <QueryStateMessage
        title="섹션 목록을 불러오지 못했습니다."
        details={getQueryErrorMessage(error)}
        tone="destructive"
      />
    );
  }

  if (sections.length === 0) {
    return (
      <QueryStateMessage title="섹션이 없습니다. Seed 스크립트(pnpm tsx packages/db/prisma/seed.ts)를 실행해주세요." />
    );
  }

  return (
    <>
      <PageToolbar
        right={
          canUpdate ? (
            <OrderActionButtons
              dirtyCount={dirtyCount}
              isSaving={reorderMutation.isPending}
              onReset={reset}
              onSave={handleSave}
            />
          ) : undefined
        }
        mobileCollapseRight={false}
      />
      <SectionList
        canUpdate={canUpdate}
        items={items}
        applyDragEnd={applyDragEnd}
      />
      <ConfirmLeaveDialog {...confirmDialogProps} />
    </>
  );
}
