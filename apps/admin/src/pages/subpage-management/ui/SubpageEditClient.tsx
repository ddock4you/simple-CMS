'use client';

import { useQuery } from '@tanstack/react-query';

import { subpageDetailOptions } from '@/features/subpage-management/api/subpageQueries';
import { SubpageForm } from '@/features/subpage-management/ui/SubpageForm';

export function SubpageEditClient({ id }: { id: string }) {
  const { data } = useQuery(subpageDetailOptions(id));

  if (!data) return null;

  return <SubpageForm mode="edit" initialData={data} />;
}
