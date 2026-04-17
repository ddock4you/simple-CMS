'use client';

import { useCallback, useState } from 'react';

export interface UseDialogDirtyGuardResult {
  /**
   * Dialog `onOpenChange`에 그대로 바인딩.
   * isDirty=true이고 닫으려 하는 경우 confirm dialog를 띄우고 상위 닫기를 보류.
   */
  safeOnOpenChange: (open: boolean) => void;
  confirmDialogProps: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  };
}

/**
 * Dialog 폼용 Dirty 가드. ESC/배경클릭/X 버튼 모두 `onOpenChange(false)`를
 * 호출하므로 한 곳에서 가로채면 충분. 페이지 이탈이 아니므로 `beforeunload`는 미적용.
 */
export function useDialogDirtyGuard(
  isDirty: boolean,
  onOpenChange: (open: boolean) => void,
): UseDialogDirtyGuardResult {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const safeOnOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true);
        return;
      }
      if (!isDirty) {
        onOpenChange(false);
        return;
      }
      setConfirmOpen(true);
    },
    [isDirty, onOpenChange],
  );

  const handleConfirm = useCallback(() => {
    setConfirmOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleCancel = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return {
    safeOnOpenChange,
    confirmDialogProps: {
      open: confirmOpen,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
