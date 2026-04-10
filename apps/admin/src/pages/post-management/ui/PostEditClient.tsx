'use client';

import { useQuery } from '@tanstack/react-query';

import { postDetailOptions } from '@/features/post-management/api/postQueries';
import { PostForm } from '@/features/post-management/ui/PostForm';

export function PostEditClient({ id }: { id: string }) {
  const { data } = useQuery(postDetailOptions(id));

  if (!data) return null;

  return <PostForm mode="edit" initialData={data} />;
}
