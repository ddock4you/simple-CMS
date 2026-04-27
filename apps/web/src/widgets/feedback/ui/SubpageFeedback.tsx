import { SubpageFeedbackForm } from './SubpageFeedbackForm';

interface SubpageFeedbackProps {
  subpageId: string;
  feedbackEnabled: boolean;
  /**
   * preview 세션이면 UI는 노출하되 제출 버튼은 비활성화.
   */
  previewMode?: boolean;
}

/**
 * 서브페이지 하단에 KRDS 가이드(https://www.krds.go.kr/html/site/global/global_05.html)
 * 기반 만족도 조사 위젯을 렌더한다. `feedbackEnabled === false`이면 아무것도 렌더하지 않는다.
 */
export function SubpageFeedback({
  subpageId,
  feedbackEnabled,
  previewMode = false,
}: SubpageFeedbackProps) {
  if (!feedbackEnabled) return null;

  return (
    <SubpageFeedbackForm subpageId={subpageId} previewMode={previewMode} />
  );
}
