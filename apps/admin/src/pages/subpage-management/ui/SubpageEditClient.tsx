'use client';

import { useQuery } from '@tanstack/react-query';

import { subpageDetailOptions } from '@/features/subpage-management/api/subpageQueries';
import { SubpageForm } from '@/features/subpage-management/ui/SubpageForm';
import { BlockManager } from '@/features/block-management/ui/BlockManager';

export function SubpageEditClient({ id }: { id: string }) {
  const { data } = useQuery(subpageDetailOptions(id));

  if (!data) return null;

  return (
    <div className="space-y-8">
      <SubpageForm mode="edit" initialData={data} />
      <div className="border-t pt-6">
        <BlockManager subpageId={id} />
      </div>
    </div>
  );
}
