'use client';

import { useQuery } from '@tanstack/react-query';

import { postDetailOptions } from '@/features/post-management/api/postQueries';
import { PostForm } from '@/features/post-management/ui/PostForm';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';

export function PostEditClient({ id }: { id: string }) {
  const { data, isPending, isError, error } = useQuery(postDetailOptions(id));

  if (isPending) {
    return <QueryStateMessage title="게시글 정보를 불러오는 중..." />;
  }

  if (isError || !data) {
    return (
      <QueryStateMessage
        title="게시글 정보를 불러오지 못했습니다."
        details={isError ? getQueryErrorMessage(error) : undefined}
        tone="destructive"
      />
    );
  }

  return <PostForm mode="edit" initialData={data} />;
}
