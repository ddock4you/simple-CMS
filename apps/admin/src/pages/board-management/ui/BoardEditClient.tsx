'use client';

import { useQuery } from '@tanstack/react-query';

import { boardDetailOptions } from '@/features/board-management/api/boardQueries';
import { BoardForm } from '@/features/board-management/ui/BoardForm';

export function BoardEditClient({ id }: { id: string }) {
  const { data } = useQuery(boardDetailOptions(id));

  if (!data) return null;

  return <BoardForm mode="edit" initialData={data} />;
}
