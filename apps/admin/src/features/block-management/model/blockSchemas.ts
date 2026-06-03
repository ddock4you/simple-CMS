import { z } from 'zod';

import { IMAGE_BLOCK_MAX_ITEMS, type PageBlockType } from '@simple-cms/types';

/**
 * 서브페이지 블록 Zod 스키마 (Stage 6)
 *
 * - blockType별 configJson 구조 검증 (API 핸들러에서 재검증)
 * - 공통 패턴은 `home-management/model/homeSchemas.ts`의 configSchemaByType 맵과 동일
 */

/**
 * RICH_TEXT 블록 — Tiptap ProseMirror JSON 본문.
 * 구조 검증은 최소화 (Tiptap JSON은 중첩 깊이와 노드 타입이 다양해 엄격한 Zod 구조는 과함).
 * 실제 렌더/검색 인덱싱 단계에서 @tiptap/html + extractTextFromTiptap이 처리.
 */
export const richTextBlockConfigSchema = z.object({
  contentJson: z.unknown().refine((v) => v !== null && typeof v === 'object', {
    message: '본문 내용이 비어 있습니다.',
  }),
});
export type RichTextBlockConfigData = z.infer<typeof richTextBlockConfigSchema>;

/**
 * HTML 블록 (Stage 7b-Option B): HTML + 페이지 스코프 CSS를 한 블록에 함께 관리.
 * - html: 본문 자유 HTML (필수). DOMPurify sanitize + iframe 호스트 재검증.
 * - css: 같은 페이지 전체에 적용되는 스타일 (선택). web에서 #subpage-{id} prefix로 스코프.
 *
 * Stage 7a 시점의 페이지 단위 customHtml/customCss는 폐기되고 이 블록으로 흡수됨.
 */
export const htmlBlockConfigSchema = z.object({
  html: z
    .string()
    .trim()
    .min(1, 'HTML을 입력해주세요.')
    .max(100_000, 'HTML은 100,000자 이하여야 합니다.'),
  css: z
    .string()
    .max(100_000, 'CSS는 100,000자 이하여야 합니다.')
    .nullable()
    .optional(),
});
export type HtmlBlockConfigData = z.infer<typeof htmlBlockConfigSchema>;

const imageBlockItemSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .min(1, '이미지 URL을 입력해주세요.')
    .max(2000, 'URL은 2000자 이하여야 합니다.'),
  imageAlt: z
    .string()
    .trim()
    .min(1, '이미지 대체 텍스트(alt)는 필수입니다.')
    .max(200, '대체 텍스트는 200자 이하여야 합니다.'),
  imageMediaId: z.string().max(64).nullable().optional(),
  caption: z.string().trim().max(300).nullable().optional(),
  linkUrl: z.string().trim().max(2000).nullable().optional(),
});

export const imageBlockConfigSchema = imageBlockItemSchema
  .partial()
  .extend({
    items: z.array(imageBlockItemSchema).max(IMAGE_BLOCK_MAX_ITEMS).optional(),
  })
  .superRefine((value, ctx) => {
    const hasItems = Array.isArray(value.items) && value.items.length > 0;
    const hasLegacyImage = Boolean(value.imageUrl && value.imageAlt);

    if (!hasItems && !hasLegacyImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: '이미지를 최소 1장 이상 등록해주세요.',
      });
    }
  });
export type ImageBlockConfigData = z.infer<typeof imageBlockConfigSchema>;

export const iframeBlockConfigSchema = z.object({
  src: z
    .string()
    .trim()
    .url('올바른 URL을 입력해주세요.')
    .max(2000, 'URL은 2000자 이하여야 합니다.'),
  title: z
    .string()
    .trim()
    .min(1, '제목을 입력해주세요. (접근성 필수)')
    .max(200, '제목은 200자 이하여야 합니다.'),
  aspectRatio: z.enum(['16:9', '4:3', '1:1']),
  allowFullscreen: z.boolean(),
  heightPx: z
    .number()
    .int('높이는 정수로 입력해주세요.')
    .min(240, '높이는 최소 240px 이상이어야 합니다.')
    .max(640, '높이는 최대 640px까지 설정 가능합니다.')
    .nullable()
    .optional(),
});
export type IframeBlockConfigData = z.infer<typeof iframeBlockConfigSchema>;

const accordionBlockItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '아코디언 제목을 입력해주세요.')
    .max(200, '아코디언 제목은 200자 이하여야 합니다.'),
  body: z
    .string()
    .trim()
    .min(1, '아코디언 내용을 입력해주세요.')
    .max(5000, '아코디언 내용은 5,000자 이하여야 합니다.'),
});

export const accordionBlockConfigSchema = z.object({
  heading: z.string().trim().max(200, '제목은 200자 이하여야 합니다.').nullable().optional(),
  description: z
    .string()
    .trim()
    .max(500, '설명은 500자 이하여야 합니다.')
    .nullable()
    .optional(),
  enableSearch: z.boolean(),
  searchPlaceholder: z
    .string()
    .trim()
    .max(100, '검색 placeholder는 100자 이하여야 합니다.')
    .nullable()
    .optional(),
  defaultOpenFirst: z.boolean(),
  items: z
    .array(accordionBlockItemSchema)
    .min(1, '아코디언 항목을 최소 1개 이상 등록해주세요.')
    .max(50, '아코디언 항목은 최대 50개까지 등록할 수 있습니다.'),
});
export type AccordionBlockConfigData = z.infer<typeof accordionBlockConfigSchema>;

/**
 * blockType → Zod 스키마 맵 (API 핸들러 재검증용).
 */
export const configSchemaByType = {
  RICH_TEXT: richTextBlockConfigSchema,
  HTML: htmlBlockConfigSchema,
  IMAGE: imageBlockConfigSchema,
  IFRAME: iframeBlockConfigSchema,
  ACCORDION: accordionBlockConfigSchema,
} as const satisfies Record<PageBlockType, z.ZodTypeAny>;

/**
 * RICH_TEXT의 빈 Tiptap 문서 (최소 doc + paragraph).
 */
const EMPTY_TIPTAP_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

/**
 * blockType별 빈 기본값 (폼 reset 시 사용).
 */
export const defaultConfigByType = {
  RICH_TEXT: { contentJson: EMPTY_TIPTAP_DOC } satisfies RichTextBlockConfigData,
  HTML: { html: '', css: null } satisfies HtmlBlockConfigData,
  IMAGE: {
    items: [],
  } satisfies ImageBlockConfigData,
  IFRAME: {
    src: '',
    title: '',
    aspectRatio: '16:9',
    allowFullscreen: true,
    heightPx: null,
  } satisfies IframeBlockConfigData,
  ACCORDION: {
    heading: '',
    description: '',
    enableSearch: true,
    searchPlaceholder: '검색어를 입력해주세요.',
    defaultOpenFirst: false,
    items: [{ title: '', body: '' }],
  } satisfies AccordionBlockConfigData,
} as const;

/**
 * 블록 생성 스키마.
 * configJson은 unknown — API 핸들러에서 blockType을 기준으로 configSchemaByType으로 재검증.
 */
export const createBlockSchema = z.object({
  blockType: z.enum(['RICH_TEXT', 'HTML', 'IMAGE', 'IFRAME', 'ACCORDION']),
  configJson: z.unknown(),
  isVisible: z.boolean().optional(),
});
export type CreateBlockData = z.infer<typeof createBlockSchema>;

/**
 * 블록 수정 스키마 — blockType은 변경 불가.
 * 추가 키(blockType 등)가 body에 들어와도 safeParse가 drop (strict() 미사용, 의도적).
 */
export const updateBlockSchema = z.object({
  configJson: z.unknown().optional(),
  isVisible: z.boolean().optional(),
});
export type UpdateBlockData = z.infer<typeof updateBlockSchema>;

/**
 * 순서 일괄 변경 스키마.
 */
export const reorderBlocksSchema = z.object({
  blocks: z
    .array(
      z.object({
        id: z.string().min(1),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1, '순서를 변경할 블록이 없습니다.'),
});
export type ReorderBlocksData = z.infer<typeof reorderBlocksSchema>;
