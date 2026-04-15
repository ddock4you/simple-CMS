import type { HomePopupType } from '@simple-cms/types';

import { Badge } from '@/shared/ui/shadcn/badge';

import { POPUP_TYPE_LABELS } from '../model/popupLabels';

export function PopupTypeBadge({ type }: { type: HomePopupType }) {
  return (
    <Badge variant={type === 'CONTENT' ? 'default' : 'secondary'}>
      {POPUP_TYPE_LABELS[type]}
    </Badge>
  );
}
