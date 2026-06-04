'use client';

import { useQuery } from '@tanstack/react-query';

import { boardDetailOptions } from '@/features/board-management/api/boardQueries';
import { BoardForm } from '@/features/board-management/ui/BoardForm';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';

export function BoardEditClient({ id }: { id: string }) {
  const { data, isPending, isError, error } = useQuery(
    boardDetailOptions(id),
  );

  if (isPending) {
    return <QueryStateMessage title="게시판 정보를 불러오는 중..." />;
  }

  if (isError || !data) {
    return (
      <QueryStateMessage
        title="게시판 정보를 불러오지 못했습니다."
        details={isError ? getQueryErrorMessage(error) : undefined}
        tone="destructive"
      />
    );
  }

  return <BoardForm mode="edit" initialData={data} />;
}
