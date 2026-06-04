'use client';

import { useQuery } from '@tanstack/react-query';

import { subpageDetailOptions } from '@/features/subpage-management/api/subpageQueries';
import { SubpageForm } from '@/features/subpage-management/ui/SubpageForm';
import { BlockManager } from '@/features/block-management/ui/BlockManager';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';

export function SubpageEditClient({ id }: { id: string }) {
  const { data, isPending, isError, error } = useQuery(
    subpageDetailOptions(id),
  );

  if (isPending) {
    return <QueryStateMessage title="서브 페이지 정보를 불러오는 중..." />;
  }

  if (isError || !data) {
    return (
      <QueryStateMessage
        title="서브 페이지 정보를 불러오지 못했습니다."
        details={isError ? getQueryErrorMessage(error) : undefined}
        tone="destructive"
      />
    );
  }

  return (
    <div className="space-y-8">
      <SubpageForm mode="edit" initialData={data} />
      <div className="border-t pt-6">
        <BlockManager subpageId={id} />
      </div>
    </div>
  );
}
