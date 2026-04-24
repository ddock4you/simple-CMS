import {
  SUBPAGE_VERSION_SOURCE_LABELS,
  SUBPAGE_VERSION_RETENTION_LIMIT,
  SUBPAGE_VERSION_LABEL_MAX_LENGTH,
  SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT,
  type SubpageVersionSource,
} from '@simple-cms/types';

export {
  SUBPAGE_VERSION_SOURCE_LABELS,
  SUBPAGE_VERSION_RETENTION_LIMIT,
  SUBPAGE_VERSION_LABEL_MAX_LENGTH,
  SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT,
};

/**
 * VersionHistoryDialog 테이블 + RecentVersionsCard에서 sourceAction 뱃지 색상 매핑.
 * outline = 중립, default = 강조, secondary = 보조.
 */
export const SUBPAGE_VERSION_SOURCE_BADGE_VARIANT: Record<
  SubpageVersionSource,
  'default' | 'outline' | 'secondary'
> = {
  MANUAL: 'default',
  AUTO_PUBLISH: 'secondary',
  PRE_ROLLBACK: 'outline',
};

/**
 * 목록 행의 "메모" 셀이 비어있을 때(label=null)의 대체 표시 문구.
 * sourceAction별로 자연스러운 설명을 쓴다 — PRE_ROLLBACK처럼 시스템 기본 메시지를
 * DB에 저장하는 대신 UI에서만 파생.
 */
export const SUBPAGE_VERSION_FALLBACK_TEXT: Record<SubpageVersionSource, string> = {
  MANUAL: '(메모 없음)',
  AUTO_PUBLISH: '발행 전환 시 자동 저장',
  PRE_ROLLBACK: '다른 버전으로 복원 직전 자동 저장',
};

export function getSourceActionLabel(source: SubpageVersionSource): string {
  return SUBPAGE_VERSION_SOURCE_LABELS[source];
}
