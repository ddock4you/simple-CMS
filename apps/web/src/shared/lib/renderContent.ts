import DOMPurify from 'isomorphic-dompurify';

import { generateHTML, getSharedExtensions } from '@simple-cms/editor';

const purifyConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'p', 'br', 'hr',
    'strong', 'em', 'u', 's', 'sub', 'sup', 'mark',
    'a', 'img',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
    'span', 'div',
    'input', // task list checkbox
    'label',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title',
    'src', 'alt', 'width', 'height',
    'style', 'class',
    'data-type', 'data-checked',
    'data-media-id', // Stage 5a-2: Tiptap 이미지의 Media 라이브러리 참조 (cuid)
    'type', 'checked', 'disabled', // task list checkbox
    'colspan', 'rowspan', 'colwidth',
  ],
};

const extensions = getSharedExtensions();

export function renderTiptapContent(json: unknown): string | null {
  if (!json || typeof json !== 'object') {
    return null;
  }

  try {
    const html = generateHTML(json as Record<string, unknown>, extensions);
    return DOMPurify.sanitize(html, purifyConfig);
  } catch {
    console.error('[renderTiptapContent] Failed to generate HTML from Tiptap JSON');
    return null;
  }
}
