import { SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT } from '@simple-cms/types';

export interface ParsedVersionLabel {
  /** 깃 스타일 subject — 첫 줄(빈 줄 이전까지) */
  subject: string;
  /** 빈 줄 이후 본문 — 없으면 빈 문자열 */
  body: string;
  /** body가 비어있지 않음을 나타내는 플래그 */
  hasBody: boolean;
  /** 원본 subject 길이가 표시 한도를 초과하여 UI 레벨에서 truncate가 필요한지 */
  truncatedSubject: boolean;
}

/**
 * 버전 커밋 메시지(`label`)를 깃 커밋 관행에 맞춰 파싱한다.
 *
 * 규칙:
 * - `null`/빈 문자열/공백만 입력되면 subject='', body='' 반환
 * - 첫 번째 빈 줄(\n 여러 개 가능)을 기준으로 subject와 body 분리
 * - 빈 줄이 없으면 전체를 subject로 간주 (body 없음)
 * - subject는 `\n`이 포함되지 않은 단일 라인으로 정규화
 * - subject 끝부분 공백 제거
 *
 * 이 함수는 표시용 파싱만 담당하며, DB 저장 값은 원본 문자열 그대로 유지된다.
 */
export function parseVersionLabel(
  label: string | null | undefined,
): ParsedVersionLabel {
  if (label == null) {
    return { subject: '', body: '', hasBody: false, truncatedSubject: false };
  }
  const trimmed = label.trimStart();
  if (!trimmed) {
    return { subject: '', body: '', hasBody: false, truncatedSubject: false };
  }

  // 빈 줄(`\n\s*\n`) 앞뒤로 분리. 없으면 전체가 subject.
  const match = trimmed.match(/^([\s\S]*?)\n[ \t]*\n([\s\S]*)$/);
  let subjectRaw: string;
  let body: string;
  if (match) {
    subjectRaw = match[1];
    body = match[2].trim();
  } else {
    subjectRaw = trimmed;
    body = '';
  }

  // subject는 단일 라인 — 내부 개행을 공백으로 치환 후 말단 공백 제거
  const subject = subjectRaw.replace(/\s+/g, ' ').trimEnd();

  return {
    subject,
    body,
    hasBody: body.length > 0,
    truncatedSubject: subject.length > SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT,
  };
}

/**
 * 목록 행에 표시할 축약 subject. `SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT` 초과 시
 * 말줄임 처리. 원본은 hover tooltip에서 보여주도록 분리.
 */
export function formatVersionSubject(subject: string): string {
  if (subject.length <= SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT) return subject;
  return `${subject.slice(0, SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT)}…`;
}
