'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';

import { boardOptionsQuery } from '../api/postQueries';

interface PostBoardFilterProps {
  currentBoardId: string | null;
}

export function PostBoardFilter({ currentBoardId }: PostBoardFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: boards } = useQuery(boardOptionsQuery());

  const handleChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (!value || value === 'ALL') {
      params.delete('boardId');
    } else {
      params.set('boardId', value);
    }
    params.delete('page');
    router.push(`/posts?${params.toString()}`);
  };

  const selectedLabel = currentBoardId
    ? boards?.find((b) => b.id === currentBoardId)?.name ?? '게시판'
    : '전체 게시판';

  return (
    <Select
      value={currentBoardId ?? 'ALL'}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-[180px]">
        <span>{selectedLabel}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">전체 게시판</SelectItem>
        {boards?.map((board) => (
          <SelectItem key={board.id} value={board.id}>
            {board.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
