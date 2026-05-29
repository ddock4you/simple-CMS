'use client';

import { useEffect, useId, useState } from 'react';
import { Button } from 'krds-react';

import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  FEEDBACK_POSITIVE_REASON_CODES,
  FEEDBACK_POSITIVE_REASONS,
  FEEDBACK_RATING_LABELS,
  type CreateFeedbackDto,
  type FeedbackPositiveReason,
  type FeedbackRating,
} from '@simple-cms/types';

import { hasSubmitted, markSubmitted } from '../lib/feedbackStorage';

interface SubpageFeedbackFormProps {
  subpageId: string;
  /**
   * preview 세션이면 UI는 노출하되 제출 버튼은 비활성화.
   */
  previewMode?: boolean;
}

type Status = 'idle' | 'submitting' | 'submitted' | 'error';

const RATING_OPTIONS: readonly {
  value: FeedbackRating;
  label: string;
  emoji: string;
}[] = [
  { value: 'POSITIVE', label: FEEDBACK_RATING_LABELS.POSITIVE, emoji: '🙂' },
  { value: 'NEGATIVE', label: FEEDBACK_RATING_LABELS.NEGATIVE, emoji: '🙁' },
];

export function SubpageFeedbackForm({
  subpageId,
  previewMode = false,
}: SubpageFeedbackFormProps) {
  const titleId = useId();
  const messageId = useId();
  const ratingGroupName = useId();
  const reasonsGroupId = useId();
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [reasons, setReasons] = useState<FeedbackPositiveReason[]>([]);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    // localStorage는 effect 내에서만 접근 가능. 1회 read-only 동기화이며
    // SSR hydration mismatch 회피 위해 첫 렌더는 'idle' 유지.
    // React Compiler `set-state-in-effect` 경고는 의도적 — 마운트 시 1회만 cascading.
    if (!hasSubmitted(subpageId)) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setAlreadySubmitted(true);
    setStatus('submitted');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [subpageId]);

  const handleReset = () => {
    setRating(null);
    setReasons([]);
    setComment('');
    setErrorMessage(null);
  };

  const toggleReason = (code: FeedbackPositiveReason) => {
    setReasons((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code],
    );
  };

  const handleRatingChange = (value: FeedbackRating) => {
    setRating(value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rating || previewMode || status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage(null);

    const payload: CreateFeedbackDto = {
      subpageId,
      rating,
      positiveReasons: rating === 'POSITIVE' ? reasons : undefined,
      comment: comment.trim() || undefined,
    };

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const message =
          body?.error ??
          '피드백 제출에 실패했습니다. 잠시 후 다시 시도해주세요.';
        setStatus('error');
        setErrorMessage(message);
        return;
      }

      markSubmitted(subpageId);
      setStatus('submitted');
    } catch {
      setStatus('error');
      setErrorMessage('피드백 제출에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const showQuestions = rating !== null && !alreadySubmitted;
  const showPositiveReasons = rating === 'POSITIVE';
  const isSubmittable =
    !previewMode && status !== 'submitting' && rating !== null;

  return (
    <section
      className="subpage-feedback rounded-[12px] bg-[#f4f5f6] p-[24px] medium:p-[48px]"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      {status === 'submitted' ? (
        <div id={messageId} aria-live="polite" className="text-center">
          <p className="text-[17px] leading-[1.5] font-bold text-[#1e2124]">
            의견을 남겨주셔서 감사합니다.
          </p>
          <p className="mt-[8px] text-[15px] leading-[1.5] text-[#464c53]">
            보내주신 소중한 의견은 페이지 개선에 도움이 됩니다.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-[24px] large:space-y-[28px]">
          <div className="flex flex-col gap-[16px] medium:flex-row medium:items-center medium:justify-between">
            <h2 id={titleId} className="text-[17px] leading-[1.5] font-bold text-[#1e2124]">
              이 페이지에 만족하시나요?
            </h2>
            {/*
              KRDS chip sibling pattern: input + label sibling 구조로 KRDS CSS의
              `.krds-form-chip input[type=radio]:checked ~ label` 셀렉터가 시각 처리.
              label[htmlFor]가 native browser의 input click 위임을 트리거.
              KRDS의 글로벌 룰이 input을 visually-hidden 처리하므로 label만 보임.
            */}
            <div
              className="krds-check-area"
              role="radiogroup"
              aria-label="페이지 만족도"
            >
              {RATING_OPTIONS.map((option) => {
                const inputId = `${ratingGroupName}-${option.value.toLowerCase()}`;
                const checked = rating === option.value;
                return (
                  <div key={option.value} className="krds-form-chip medium">
                    <input
                      type="radio"
                      className="radio"
                      id={inputId}
                      name={ratingGroupName}
                      value={option.value}
                      checked={checked}
                      onChange={() => handleRatingChange(option.value)}
                    />
                    <label
                      className="krds-form-chip-outline"
                      htmlFor={inputId}
                    >
                      {option.label} {option.emoji}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {showQuestions && (
            <div
              className="space-y-[24px] border-t border-[#b1b8be] pt-[24px]"
              aria-live="polite"
            >
              {showPositiveReasons && (
                <fieldset className="flex flex-col gap-[12px]">
                  <legend className="text-[17px] leading-[1.5] font-medium text-[#1e2124]">
                    1. 이 페이지의 어떤 점에 만족하셨나요?{' '}
                    <span className="text-[#58616a]">(선택 입력)</span>
                  </legend>
                  <div className="krds-check-area chk-column">
                    {FEEDBACK_POSITIVE_REASON_CODES.map((code) => {
                      const inputId = `${reasonsGroupId}-${code}`;
                      const checked = reasons.includes(code);
                      return (
                        <div key={code} className="krds-form-check medium">
                          <input
                            type="checkbox"
                            id={inputId}
                            name="positiveReasons"
                            value={code}
                            checked={checked}
                            onChange={() => toggleReason(code)}
                          />
                          <label htmlFor={inputId}>
                            {FEEDBACK_POSITIVE_REASONS[code]}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div className="flex flex-col gap-[8px]">
                <label
                  htmlFor={`${titleId}-comment`}
                  className="text-[17px] leading-[1.5] font-medium text-[#1e2124]"
                >
                  {showPositiveReasons ? '2. ' : '1. '}
                  기타 제안 사항이 있다면 작성해주세요.{' '}
                  <span className="text-[#58616a]">(선택 입력)</span>
                </label>
                <textarea
                  id={`${titleId}-comment`}
                  value={comment}
                  onChange={(e) =>
                    setComment(
                      e.target.value.slice(0, FEEDBACK_COMMENT_MAX_LENGTH),
                    )
                  }
                  placeholder="내용을 입력하세요"
                  rows={4}
                  className="w-full rounded-[8px] border border-[#6d7882] bg-white p-[8px] text-[17px] leading-[1.5] text-[#1e2124] placeholder-[#6d7882] focus:border-[#256ef4] focus:outline-none"
                />
                <p className="text-right text-[15px] leading-[1.5] text-[#58616a]">
                  <span className="text-[#256ef4]">{comment.length}</span>
                  <span> / {FEEDBACK_COMMENT_MAX_LENGTH}</span>
                </p>
              </div>

              {errorMessage && (
                <p role="alert" className="text-[15px] leading-[1.5] text-[#e71825]">
                  {errorMessage}
                </p>
              )}

              {previewMode && (
                <p role="note" className="text-[15px] leading-[1.5] text-[#58616a]">
                  미리보기 모드에서는 피드백을 제출할 수 없습니다.
                </p>
              )}

              <div className="flex justify-end gap-[8px]">
                <Button
                  variant="tertiary"
                  size="medium"
                  onClick={handleReset}
                  className="rounded-[8px] border border-[#58616a] bg-white px-[20px] py-[4px] text-[17px] leading-[1.5] text-[#1e2124] hover:bg-[#e6e8ea]"
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  type="submit"
                  disabled={!isSubmittable}
                  className="rounded-[8px] bg-[#256ef4] px-[20px] py-[4px] text-[17px] leading-[1.5] text-white hover:bg-[#0b50d0] disabled:cursor-not-allowed disabled:bg-[#8a949e]"
                  title={
                    previewMode
                      ? '미리보기에서는 제출할 수 없습니다'
                      : undefined
                  }
                >
                  {status === 'submitting' ? '제출 중...' : '평가완료'}
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
    </section>
  );
}
