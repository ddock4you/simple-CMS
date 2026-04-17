import {
  CCL_AI_ASSET,
  CCL_TYPE_ASSET,
  CCL_TYPE_LABELS,
  type CclType,
} from '@simple-cms/types';

interface KoglFooterProps {
  cclType: CclType | null;
  cclAi: boolean;
}

/**
 * 서브페이지 본문 하단 우측에 공공누리(KOGL) 라이선스 마크를 표시한다.
 * - cclType === null ⇒ 표시 없음 (AI 단독 표시 금지)
 * - AI 체크 시 유형 마크 옆에 AI 마크를 병치
 *
 * 에셋은 `apps/web/public/assets/kogl/` 하위에 파일명 규약대로 배치한다.
 */
export function KoglFooter({ cclType, cclAi }: KoglFooterProps) {
  if (cclType === null) return null;

  const typeLabel = CCL_TYPE_LABELS[cclType];

  return (
    <footer className="kogl-mark" aria-label={`공공누리 라이선스 ${typeLabel}`}>
      <img
        src={CCL_TYPE_ASSET[cclType]}
        alt={`공공누리 ${typeLabel}`}
      />
      {cclAi && <img src={CCL_AI_ASSET} alt="AI 학습·활용 가능" />}
    </footer>
  );
}
