/**
 * 시연 모드 snapshot JSON 형식 정의 (PR6).
 *
 * export(`pnpm demo:export`)와 import(`pnpm demo:import`) 양쪽 진실원.
 * Zod로 런타임 검증 + TypeScript inference.
 *
 * **schemaVersion**:
 *   - 1 (현재). 향후 형식 변경 시 마이그레이션 함수로 분기
 *
 * **포함**: 14개 cloneSeedToSession 모델
 *   Role / User / Media / SiteSettings / NavigationMenu / Board / HomeSection /
 *   Subpage / Post / PageBlock / HomePopup / NavigationMenuItem / SubpageVersion / SubpageFeedback
 *
 * **제외**: AuditLog / ErrorLog / Session / PreviewToken (cloneSeedToSession 동일 정책)
 *
 * **Media.base64Data**:
 *   import 시 `__SEED__/<category>/<filename>` 경로로 Storage에 적재.
 *   sharp로 1600px 리사이즈 + JPEG quality 80 (이미지 한정), 그 외 mimeType 원본 유지.
 *
 * **User.password**:
 *   export 시 제거. import 시 placeholder bcrypt hash로 채움 (시드 User 로그인 차단).
 */
import { z } from 'zod';

// ─── 공용 ──────────────────────────────────────────

const isoDateString = z.string().datetime();
const cuidString = z.string().min(1).max(64);

// JsonValue: Prisma.InputJsonValue와 호환되는 직렬화 가능 타입
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

// ─── 14모델 row schema ────────────────────────────

const roleRowSchema = z.object({
  id: cuidString,
  name: z.string(),
  description: z.string().nullable(),
  permissions: jsonValueSchema,
  isSystem: z.boolean(),
  isDefault: z.boolean(),
});

const userRowSchema = z.object({
  id: cuidString,
  username: z.string(),
  email: z.string().nullable(),
  name: z.string(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']),
  roleId: cuidString.nullable(),
  // password 의도적 제외 — export 시 제거, import 시 placeholder hash로 채움
});

const mediaRowSchema = z.object({
  id: cuidString,
  filename: z.string(),
  originalFilename: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  url: z.string(),
  alt: z.string().nullable(),
  contentHash: z.string().nullable(),
  // uploadedById는 export 시 null로 anonymize (운영 dev User 이름 유출 방지)
  uploadedById: z.null(),
  // base64 binary — import 시 Storage 적재용
  base64Data: z.string(),
});

const siteSettingsRowSchema = z.object({
  id: cuidString,
  key: z.string(),
  value: z.string(),
  description: z.string().nullable(),
});

const navigationMenuRowSchema = z.object({
  id: cuidString,
  name: z.string(),
  description: z.string().nullable(),
  slots: z.array(z.enum(['HEADER', 'FOOTER', 'SIDEBAR'])),
});

const boardRowSchema = z.object({
  id: cuidString,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  skinType: z.enum(['LIST', 'GALLERY']),
  isPublic: z.boolean(),
  displayOrder: z.number().int(),
});

const homeSectionRowSchema = z.object({
  id: cuidString,
  sectionType: z.enum([
    'HERO',
    'RECOMMENDED',
    'SUB_CAROUSEL',
    'FREQUENT_MENU',
    'SHORTCUT',
    'LATEST_POSTS',
    'CTA',
    'NOTICE',
    'GALLERY_COLLECTION',
  ]),
  title: z.string(), // NOT NULL in schema
  configJson: jsonValueSchema,
  isVisible: z.boolean(),
  displayOrder: z.number().int(),
});

const subpageRowSchema = z.object({
  id: cuidString,
  title: z.string(),
  slug: z.string(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  content: z.string().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  publishedAt: isoDateString.nullable(),
  featuredImageId: cuidString.nullable(),
  cclType: z
    .enum(['TYPE_0', 'TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4'])
    .nullable(),
  cclAi: z.boolean(),
  feedbackEnabled: z.boolean(),
  displayOrder: z.number().int(),
  revision: z.number().int(),
});

const postRowSchema = z.object({
  id: cuidString,
  title: z.string(),
  slug: z.string(),
  boardId: cuidString,
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  contentJson: jsonValueSchema.nullable(),
  content: z.string().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  isImportant: z.boolean().optional().default(false),
  publishedAt: isoDateString.nullable(),
  featuredImageId: cuidString.nullable(),
  authorId: cuidString.nullable(),
  displayOrder: z.number().int(),
});

const pageBlockRowSchema = z.object({
  id: cuidString,
  subpageId: cuidString,
  blockType: z.enum(['RICH_TEXT', 'HTML', 'IMAGE', 'IFRAME']),
  configJson: jsonValueSchema,
  isVisible: z.boolean(),
  displayOrder: z.number().int(),
});

const homePopupRowSchema = z.object({
  id: cuidString,
  popupType: z.enum(['CONTENT', 'IMAGE']),
  title: z.string(), // NOT NULL in schema
  contentJson: jsonValueSchema.nullable(),
  content: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  imageMediaId: cuidString.nullable(),
  linkUrl: z.string().nullable(),
  buttonLabel: z.string().nullable(),
  isVisible: z.boolean(),
  displayOrder: z.number().int(),
  startDate: isoDateString.nullable(),
  endDate: isoDateString.nullable(),
});

const navigationMenuItemRowSchema = z.object({
  id: cuidString,
  menuId: cuidString,
  parentId: cuidString.nullable(),
  label: z.string(),
  itemType: z.enum(['SUBPAGE', 'BOARD', 'EXTERNAL', 'CUSTOM']),
  subpageId: cuidString.nullable(),
  boardId: cuidString.nullable(),
  url: z.string().nullable(),
  isVisible: z.boolean(),
  openInNewTab: z.boolean(),
  displayOrder: z.number().int(),
  startDate: isoDateString.nullable(),
  endDate: isoDateString.nullable(),
});

const subpageVersionRowSchema = z.object({
  id: cuidString,
  subpageId: cuidString,
  createdById: cuidString.nullable(),
  label: z.string().nullable(),
  snapshot: jsonValueSchema,
  isPinned: z.boolean(),
  sourceAction: z.enum(['MANUAL', 'AUTO_PUBLISH', 'PRE_ROLLBACK']),
});

const subpageFeedbackRowSchema = z.object({
  id: cuidString,
  subpageId: cuidString,
  rating: z.enum(['POSITIVE', 'NEGATIVE']),
  positiveReasons: z.array(z.string()),
  comment: z.string().nullable(),
  ipAddressHash: z.string().nullable(),
  userAgent: z.string().nullable(),
});

// ─── 최상위 payload schema ────────────────────────

export const SNAPSHOT_SCHEMA_VERSION = 1 as const;

export const snapshotPayloadSchema = z.object({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  exportedAt: isoDateString,
  models: z.object({
    Role: z.array(roleRowSchema),
    User: z.array(userRowSchema),
    Media: z.array(mediaRowSchema),
    SiteSettings: z.array(siteSettingsRowSchema),
    NavigationMenu: z.array(navigationMenuRowSchema),
    Board: z.array(boardRowSchema),
    HomeSection: z.array(homeSectionRowSchema),
    Subpage: z.array(subpageRowSchema),
    Post: z.array(postRowSchema),
    PageBlock: z.array(pageBlockRowSchema),
    HomePopup: z.array(homePopupRowSchema),
    NavigationMenuItem: z.array(navigationMenuItemRowSchema),
    SubpageVersion: z.array(subpageVersionRowSchema),
    SubpageFeedback: z.array(subpageFeedbackRowSchema),
  }),
});

export type SnapshotPayload = z.infer<typeof snapshotPayloadSchema>;
export type SnapshotRoleRow = z.infer<typeof roleRowSchema>;
export type SnapshotUserRow = z.infer<typeof userRowSchema>;
export type SnapshotMediaRow = z.infer<typeof mediaRowSchema>;
export type SnapshotSiteSettingsRow = z.infer<typeof siteSettingsRowSchema>;
export type SnapshotNavigationMenuRow = z.infer<typeof navigationMenuRowSchema>;
export type SnapshotBoardRow = z.infer<typeof boardRowSchema>;
export type SnapshotHomeSectionRow = z.infer<typeof homeSectionRowSchema>;
export type SnapshotSubpageRow = z.infer<typeof subpageRowSchema>;
export type SnapshotPostRow = z.infer<typeof postRowSchema>;
export type SnapshotPageBlockRow = z.infer<typeof pageBlockRowSchema>;
export type SnapshotHomePopupRow = z.infer<typeof homePopupRowSchema>;
export type SnapshotNavigationMenuItemRow = z.infer<
  typeof navigationMenuItemRowSchema
>;
export type SnapshotSubpageVersionRow = z.infer<typeof subpageVersionRowSchema>;
export type SnapshotSubpageFeedbackRow = z.infer<
  typeof subpageFeedbackRowSchema
>;
