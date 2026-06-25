'use client';

import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

import {
  FEEDBACK_POSITIVE_REASONS,
  type FeedbackListItem,
} from '@simple-cms/types';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { DialogToolbar } from '@/shared/ui/DialogToolbar';

import { useDeleteFeedback } from '../api/useFeedbackMutations';

import { RatingBadge } from './RatingBadge';

interface FeedbackDetailDialogProps {
  feedback: FeedbackListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDetailDialog({
  feedback,
  open,
  onOpenChange,
}: FeedbackDetailDialogProps) {
  const canDelete = usePermission('subpage-feedback', 'delete');
  const deleteMutation = useDeleteFeedback();

  if (!feedback) return null;

  const handleDelete = () => {
    if (
      !window.confirm(
        '이 피드백을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.',
      )
    )
      return;
    deleteMutation.mutate(feedback.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" bodyOnlyScroll>
        <DialogHeader>
          <DialogTitle>피드백 상세</DialogTitle>
        </DialogHeader>
        <DialogToolbar
          right={
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                닫기
              </Button>
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" />
                  삭제
                </Button>
              )}
            </>
          }
        />
        <DialogBody className="space-y-4 px-0">
          <div className="flex items-center justify-between gap-3">
            <RatingBadge rating={feedback.rating} />
            <span className="text-sm text-muted-foreground">
              {format(new Date(feedback.createdAt), 'yyyy-MM-dd HH:mm')}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">서브페이지</p>
            <p className="font-medium">{feedback.subpageTitle}</p>
            <p className="text-xs text-muted-foreground">
              /p/{feedback.subpageSlug}
            </p>
          </div>

          {feedback.rating === 'POSITIVE' && feedback.positiveReasons.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">선택한 긍정 이유</p>
              <div className="flex flex-wrap gap-1">
                {feedback.positiveReasons.map((reason) => (
                  <Badge key={reason} variant="outline">
                    {FEEDBACK_POSITIVE_REASONS[reason]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">자유 코멘트</p>
            {feedback.comment ? (
              <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
                {feedback.comment}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">(없음)</p>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
