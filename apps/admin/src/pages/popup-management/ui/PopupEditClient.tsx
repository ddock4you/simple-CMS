'use client';

import { useQuery } from '@tanstack/react-query';

import { homePopupDetailOptions } from '@/features/popup-management/api/popupQueries';
import { PopupForm } from '@/features/popup-management/ui/PopupForm';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';

export function PopupEditClient({ id }: { id: string }) {
  const { data, isPending, isError, error } = useQuery(
    homePopupDetailOptions(id),
  );

  if (isPending) {
    return <QueryStateMessage title="팝업 정보를 불러오는 중..." />;
  }

  if (isError || !data) {
    return (
      <QueryStateMessage
        title="팝업 정보를 불러오지 못했습니다."
        details={isError ? getQueryErrorMessage(error) : undefined}
        tone="destructive"
      />
    );
  }

  return <PopupForm mode="edit" initialData={data} />;
}
