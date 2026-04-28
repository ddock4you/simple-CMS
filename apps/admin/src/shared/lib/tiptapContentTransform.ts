import { resolveMediaPreviewUrl, toRelativeMediaUrl } from './mediaUrl';

/**
 * Tiptap JSON의 image 노드 `attrs.src`를 재귀적으로 변환한다.
 * 원본을 mutate하지 않기 위해 structuredClone 후 작업.
 */
function transformImageSrc(
  json: unknown,
  transform: (src: string) => string,
): unknown {
  if (!json || typeof json !== 'object') return json;

  const clone = structuredClone(json) as Record<string, unknown>;

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as {
      type?: string;
      attrs?: Record<string, unknown>;
      content?: unknown[];
    };
    if (n.type === 'image' && typeof n.attrs?.src === 'string') {
      n.attrs.src = transform(n.attrs.src);
    }
    if (Array.isArray(n.content)) {
      n.content.forEach(walk);
    }
  };

  walk(clone);
  return clone;
}

/**
 * DB(또는 onChange로 받은)의 Tiptap JSON → admin editor 초기 content로 전달할 형태.
 * `/uploads/...` 상대 경로를 web의 절대 URL로 치환하여 에디터 DOM이 처음부터
 * 올바른 URL로 이미지를 요청하게 한다. (초기 404 방지)
 */
export function preprocessTiptapForAdmin(json: unknown): Record<string, unknown> | undefined {
  if (!json || typeof json !== 'object') return undefined;
  return transformImageSrc(json, resolveMediaPreviewUrl) as Record<string, unknown>;
}

/**
 * 에디터의 `getJSON()` 결과 → DB 저장용 Tiptap JSON.
 * admin에서 추가된 절대 URL(`${WEB_BASE_URL}/uploads/...`)을 다시 상대 경로로 복원.
 * 외부 URL(Supabase/S3/기타)은 그대로 보존.
 */
export function postprocessTiptapForSave(json: unknown): unknown {
  return transformImageSrc(json, toRelativeMediaUrl);
}
