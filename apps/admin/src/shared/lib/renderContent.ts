import { generateHTML, getSharedExtensions } from '@simple-cms/editor';

import { preprocessTiptapForAdmin } from './tiptapContentTransform';

/**
 * admin 전용 Tiptap JSON → HTML 렌더러.
 *
 * admin(3001)은 `/uploads/...` 상대 경로 이미지를 자신의 정적 파일로 해석해 404를 낸다.
 * JSON 단계에서 `image` 노드의 `attrs.src`를 절대 URL로 치환한 뒤 `generateHTML`을 호출한다.
 *  - HTML 문자열 regex 치환보다 안전 (Tiptap이 img 외 래퍼·data-src 속성 등을 만들어도 영향 없음)
 *  - DB contentJson / web 렌더링은 영향 없음 (admin 렌더 시점에만 적용)
 *  - 절대 URL (Supabase/S3/외부)은 `resolveMediaPreviewUrl`이 그대로 통과시키므로 provider 중립
 *
 * XSS: 본문은 인증된 관리자가 작성한 Tiptap JSON이라 DOMPurify는 생략. 필요 시 추가 가능.
 */
export function renderTiptapContentForAdmin(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;

  try {
    const transformed = preprocessTiptapForAdmin(json);
    if (!transformed) return null;
    return generateHTML(transformed, getSharedExtensions());
  } catch {
    console.error(
      '[renderTiptapContentForAdmin] Failed to generate HTML from Tiptap JSON',
    );
    return null;
  }
}
