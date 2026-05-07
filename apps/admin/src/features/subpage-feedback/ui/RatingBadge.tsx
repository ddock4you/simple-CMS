import { ThumbsDown, ThumbsUp } from 'lucide-react';

import {
  FEEDBACK_RATING_LABELS,
  type FeedbackRating,
} from '@simple-cms/types';

import { Badge } from '@/shared/ui/Badge';

interface RatingBadgeProps {
  rating: FeedbackRating;
}

export function RatingBadge({ rating }: RatingBadgeProps) {
  if (rating === 'POSITIVE') {
    return (
      <Badge variant="success">
        <ThumbsUp className="mr-1 size-3" />
        {FEEDBACK_RATING_LABELS.POSITIVE}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <ThumbsDown className="mr-1 size-3" />
      {FEEDBACK_RATING_LABELS.NEGATIVE}
    </Badge>
  );
}
