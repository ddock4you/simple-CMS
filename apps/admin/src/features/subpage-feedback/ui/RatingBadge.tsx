import { ThumbsDown, ThumbsUp } from 'lucide-react';

import {
  FEEDBACK_RATING_LABELS,
  type FeedbackRating,
} from '@simple-cms/types';

import { Badge } from '@/shared/ui/shadcn/badge';

interface RatingBadgeProps {
  rating: FeedbackRating;
}

export function RatingBadge({ rating }: RatingBadgeProps) {
  if (rating === 'POSITIVE') {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <ThumbsUp className="mr-1 size-3" />
        {FEEDBACK_RATING_LABELS.POSITIVE}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
      <ThumbsDown className="mr-1 size-3" />
      {FEEDBACK_RATING_LABELS.NEGATIVE}
    </Badge>
  );
}
