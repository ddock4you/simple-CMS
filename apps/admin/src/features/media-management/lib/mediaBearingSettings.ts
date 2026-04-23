/**
 * SiteSettings 키 중 Media.id를 값으로 갖는 키의 화이트리스트.
 *
 * findMediaReferences()의 8번째 스캔 경로가 이 배열만 부분 스캔하여
 * 전체 SiteSettings.value 풀스캔(브랜딩과 무관한 string 키도 모두 검사)을 회피한다.
 *
 * 향후 새 미디어 키(예: SITE_DEFAULT_OG_FALLBACK_MEDIA_ID 등)가 생기면
 * 여기에만 추가하면 모든 호출지가 자동 반영된다.
 */
export const MEDIA_BEARING_SETTING_KEYS = [
  'SITE_LOGO_MEDIA_ID',
  'SITE_FAVICON_MEDIA_ID',
  'SITE_OG_IMAGE_MEDIA_ID',
] as const;

export type MediaBearingSettingKey = (typeof MEDIA_BEARING_SETTING_KEYS)[number];

/**
 * 참조 추적 결과의 사람이 읽을 수 있는 라벨/컨텍스트.
 * MediaPicker 사용처 안내 + Media 삭제 시 사용처 표시에 사용.
 */
export const MEDIA_BEARING_SETTING_LABELS: Record<
  MediaBearingSettingKey,
  { label: string; context: string }
> = {
  SITE_LOGO_MEDIA_ID: {
    label: '사이트 브랜딩 — 로고',
    context: '사이트 설정',
  },
  SITE_FAVICON_MEDIA_ID: {
    label: '사이트 브랜딩 — 파비콘',
    context: '사이트 설정',
  },
  SITE_OG_IMAGE_MEDIA_ID: {
    label: '사이트 브랜딩 — OG 이미지',
    context: '사이트 설정',
  },
};
