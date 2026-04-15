'use client';

import { useQuery } from '@tanstack/react-query';

import { homePopupDetailOptions } from '@/features/popup-management/api/popupQueries';
import { PopupForm } from '@/features/popup-management/ui/PopupForm';

export function PopupEditClient({ id }: { id: string }) {
  const { data } = useQuery(homePopupDetailOptions(id));

  if (!data) return null;

  return <PopupForm mode="edit" initialData={data} />;
}
