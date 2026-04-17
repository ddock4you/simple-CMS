/**
 * 서브페이지 도메인 타입 (Stage 7d — 공공누리 라이선스 마크)
 *
 * 서브페이지 본문은 PageBlock 목록으로 표현된다 (Stage 6 통합 블록 모델). 이 파일은 본문 외
 * 페이지 메타 중 공개 웹 표시에 공용 사용되는 공공누리(KOGL) 라이선스 타입과 상수만 담는다.
 * Prisma runtime에 의존하지 않도록 enum은 union type으로 정의한다.
 */

/**
 * 공공누리(KOGL) 저작물 이용허락 표시 유형.
 * - TYPE_0 ~ TYPE_4: 공공누리 공식 유형 마크 (제0~4유형)
 * - null = '표시 없음'
 */
export type CclType = 'TYPE_0' | 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'TYPE_4';

/**
 * 라디오/뷰에서 표시할 유형별 라벨.
 */
export const CCL_TYPE_LABELS: Record<CclType, string> = {
  TYPE_0: '제0유형',
  TYPE_1: '제1유형',
  TYPE_2: '제2유형',
  TYPE_3: '제3유형',
  TYPE_4: '제4유형',
};

/**
 * web `public/assets/kogl/` 아래의 유형별 이미지 경로.
 * 실제 이미지 파일은 운영에서 공공누리 공식 사이트에서 내려받아 배치.
 * 공공누리 공식 배포 포맷에 맞춰 TYPE_0는 PNG, TYPE_1~4는 JPG를 사용한다.
 */
export const CCL_TYPE_ASSET: Record<CclType, string> = {
  TYPE_0: '/assets/kogl/kogl-type-0.png',
  TYPE_1: '/assets/kogl/kogl-type-1.jpg',
  TYPE_2: '/assets/kogl/kogl-type-2.jpg',
  TYPE_3: '/assets/kogl/kogl-type-3.jpg',
  TYPE_4: '/assets/kogl/kogl-type-4.jpg',
};

/**
 * AI 학습·활용 가능 표시 마크 경로.
 */
export const CCL_AI_ASSET = '/assets/kogl/kogl-ai.png';

/**
 * 공공누리 표시 정보 — Subpage.cclType/cclAi의 DTO 표현.
 * cclType이 null이면 cclAi는 반드시 false (superRefine/UI에서 강제).
 */
export interface SubpageCclInfo {
  cclType: CclType | null;
  cclAi: boolean;
}
