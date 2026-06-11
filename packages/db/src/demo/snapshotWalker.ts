/**
 * 시연 모드 snapshot import 시 in-place mediaId / boardId / subpageId 재매핑 walker.
 *
 * 사용 패턴:
 *   1. importSnapshot이 14모델 row마다 oldId → newCuid idMap 빌드
 *   2. payload deep clone (또는 in-place 변경 허용)
 *   3. walkSnapshotForRemap(payload, mediaIdMap, 'mediaId') — 모든 mediaId 위치 재매핑
 *   4. walkSnapshotForRemap(payload, boardIdMap, 'boardId') — HomeSection board 참조 재매핑
 *   5. walkSnapshotForRemap(payload, subpageIdMap, 'subpageId') — HomeSection subpage 참조 재매핑
 *   6. createMany 시 row 자체 컬럼(featuredImageId, imageMediaId 등 평탄 FK)은
 *      별도 매핑 (walker는 JSON 안 깊은 mediaId/boardId/subpageId만 처리)
 *
 * **위치별 field name 분기 (PR6 핵심)**:
 *   - HomeSection.configJson:
 *     - HERO    `slides[].mediaId`   (field: `mediaId`)
 *     - BRIEF_INTRO `mediaId` (top-level)
 *     - FREQUENT_MENU `items[].iconMediaId` (field: `iconMediaId`)
 *     - NOTICE `boardId` (top-level)
 *     - GALLERY_COLLECTION `boardIds[]` (top-level)
 *   - PageBlock.configJson:
 *     - IMAGE  `imageMediaId` (field 다름)
 *     - RICH_TEXT `contentJson` → Tiptap 재귀 → `image.attrs.mediaId`
 *   - HomePopup.contentJson → Tiptap 재귀 (CONTENT 타입)
 *   - SubpageVersion.snapshot:
 *     - `meta.featuredImageId` (top-level — 단 export 시 이미 매핑됐으면 무시)
 *     - `blocks[].configJson` 안 IMAGE/RICH_TEXT (PageBlock과 동일 분기)
 *
 * Subpage/Post/HomePopup/Subpage row의 `featuredImageId` / `imageMediaId` 같은 평탄 FK는
 * walker가 처리하지 않는다 (importSnapshot이 row 매핑 시 직접 변환).
 */
import type { SnapshotPayload } from './snapshot.types';

type IdMap = Map<string, string>;
type UrlMap = Map<string, string>;
type RemapKind = 'mediaId' | 'boardId' | 'subpageId';

const MEDIA_ID_SETTING_KEYS = new Set([
  'SITE_LOGO_MEDIA_ID',
  'SITE_FAVICON_MEDIA_ID',
  'SITE_OG_IMAGE_MEDIA_ID',
]);

// ─── Tiptap 재귀 walker (image 노드의 attrs.mediaId 재매핑) ────

function remapTiptapNode(
  node: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  if (!node || typeof node !== 'object') return;
  const n = node as {
    type?: string;
    attrs?: { mediaId?: unknown; src?: unknown };
    content?: unknown;
  };
  if (n.type === 'image' && typeof n.attrs?.mediaId === 'string') {
    const oldMediaId = n.attrs.mediaId;
    const newId = mediaIdMap.get(n.attrs.mediaId);
    if (newId) {
      n.attrs.mediaId = newId;
    }
    const newUrl = mediaUrlMap.get(oldMediaId);
    if (newUrl && typeof n.attrs.src === 'string') {
      n.attrs.src = newUrl;
    }
  }
  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      remapTiptapNode(child, mediaIdMap, mediaUrlMap);
    }
  }
}

// ─── HomeSection.configJson 재매핑 ──────────────────────────

function remapHomeSectionConfig(
  sectionType: string,
  configJson: unknown,
  idMap: IdMap,
  kind: RemapKind,
  mediaUrlMap: UrlMap = new Map(),
): void {
  if (!configJson || typeof configJson !== 'object') return;
  const cfg = configJson as Record<string, unknown>;

  if (kind === 'mediaId') {
    // HERO slides[].mediaId
    if (sectionType === 'HERO' && Array.isArray(cfg.slides)) {
      for (const slide of cfg.slides) {
        if (slide && typeof slide === 'object') {
          const s = slide as { mediaId?: unknown };
          if (typeof s.mediaId === 'string') {
            const oldMediaId = s.mediaId;
            const newId = idMap.get(s.mediaId);
            if (newId) s.mediaId = newId;
            const newUrl = mediaUrlMap.get(oldMediaId);
            if (
              newUrl &&
              typeof (s as { imageUrl?: unknown }).imageUrl === 'string'
            ) {
              (s as { imageUrl: string }).imageUrl = newUrl;
            }
          }
        }
      }
    }
    if (sectionType === 'BRIEF_INTRO' && typeof cfg.mediaId === 'string') {
      const oldMediaId = cfg.mediaId;
      const newId = idMap.get(cfg.mediaId);
      if (newId) cfg.mediaId = newId;
      const newUrl = mediaUrlMap.get(oldMediaId);
      if (newUrl && typeof cfg.imageUrl === 'string') cfg.imageUrl = newUrl;
    }
    // FREQUENT_MENU items[].iconMediaId
    if (sectionType === 'FREQUENT_MENU' && Array.isArray(cfg.items)) {
      for (const item of cfg.items) {
        if (item && typeof item === 'object') {
          const i = item as { mediaId?: unknown; iconMediaId?: unknown };
          if (typeof i.iconMediaId === 'string') {
            const oldMediaId = i.iconMediaId;
            const newId = idMap.get(i.iconMediaId);
            if (newId) i.iconMediaId = newId;
            const newUrl = mediaUrlMap.get(oldMediaId);
            if (
              newUrl &&
              typeof (i as { iconUrl?: unknown }).iconUrl === 'string'
            ) {
              (i as { iconUrl: string }).iconUrl = newUrl;
            }
          }
        }
      }
    }
  }

  if (kind === 'boardId') {
    // NOTICE boardId (top-level)
    if (sectionType === 'NOTICE' && typeof cfg.boardId === 'string') {
      const newId = idMap.get(cfg.boardId);
      if (newId) cfg.boardId = newId;
    }
    if (sectionType === 'GALLERY_COLLECTION' && Array.isArray(cfg.boardIds)) {
      cfg.boardIds = cfg.boardIds.map((boardId) =>
        typeof boardId === 'string' ? (idMap.get(boardId) ?? boardId) : boardId,
      );
    }
    if (
      sectionType === 'GALLERY_COLLECTION' &&
      cfg.boardTabLabels &&
      typeof cfg.boardTabLabels === 'object' &&
      !Array.isArray(cfg.boardTabLabels)
    ) {
      const nextLabels: Record<string, unknown> = {};
      for (const [boardId, label] of Object.entries(cfg.boardTabLabels)) {
        nextLabels[idMap.get(boardId) ?? boardId] = label;
      }
      cfg.boardTabLabels = nextLabels;
    }
    if (sectionType === 'FREQUENT_MENU' && Array.isArray(cfg.items)) {
      for (const item of cfg.items) {
        if (!item || typeof item !== 'object') continue;
        const i = item as { boardId?: unknown };
        if (typeof i.boardId === 'string') {
          const newId = idMap.get(i.boardId);
          if (newId) i.boardId = newId;
        }
      }
    }
  }
}

export function remapHomeSectionJsonReferences(
  sectionType: string,
  configJson: unknown,
  mediaIdMap: IdMap,
  boardIdMap: IdMap,
  subpageIdMap: IdMap = new Map(),
  mediaUrlMap: UrlMap = new Map(),
): void {
  remapHomeSectionConfig(
    sectionType,
    configJson,
    mediaIdMap,
    'mediaId',
    mediaUrlMap,
  );
  remapHomeSectionConfig(sectionType, configJson, boardIdMap, 'boardId');
  remapHomeSectionSubpageReferences(sectionType, configJson, subpageIdMap);
}

function remapHomeSectionSubpageReferences(
  sectionType: string,
  configJson: unknown,
  subpageIdMap: IdMap,
): void {
  if (subpageIdMap.size === 0) return;
  if (sectionType !== 'FREQUENT_MENU') return;
  if (!configJson || typeof configJson !== 'object') return;

  const cfg = configJson as Record<string, unknown>;
  if (!Array.isArray(cfg.items)) return;

  for (const item of cfg.items) {
    if (!item || typeof item !== 'object') continue;
    const i = item as { subpageId?: unknown };
    if (typeof i.subpageId === 'string') {
      const newId = subpageIdMap.get(i.subpageId);
      if (newId) i.subpageId = newId;
    }
  }
}

// ─── PageBlock.configJson 재매핑 ────────────────────────────

function remapPageBlockConfig(
  blockType: string,
  configJson: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  if (!configJson || typeof configJson !== 'object') return;
  const cfg = configJson as Record<string, unknown>;

  if (blockType === 'IMAGE') {
    // IMAGE 블록의 imageMediaId (field name 다름!)
    if (typeof cfg.imageMediaId === 'string') {
      const oldMediaId = cfg.imageMediaId;
      const newId = mediaIdMap.get(cfg.imageMediaId);
      if (newId) cfg.imageMediaId = newId;
      const newUrl = mediaUrlMap.get(oldMediaId);
      if (newUrl && typeof cfg.imageUrl === 'string') cfg.imageUrl = newUrl;
    }
    if (Array.isArray(cfg.items)) {
      for (const item of cfg.items) {
        if (!item || typeof item !== 'object') continue;
        const imageItem = item as Record<string, unknown>;
        if (typeof imageItem.imageMediaId === 'string') {
          const oldMediaId = imageItem.imageMediaId;
          const newId = mediaIdMap.get(imageItem.imageMediaId);
          if (newId) imageItem.imageMediaId = newId;
          const newUrl = mediaUrlMap.get(oldMediaId);
          if (newUrl && typeof imageItem.imageUrl === 'string') {
            imageItem.imageUrl = newUrl;
          }
        }
      }
    }
  }

  if (blockType === 'RICH_TEXT') {
    // RICH_TEXT의 contentJson → Tiptap 재귀
    if (cfg.contentJson) {
      remapTiptapNode(cfg.contentJson, mediaIdMap, mediaUrlMap);
    }
  }
}

export function remapPageBlockConfigJsonReferences(
  blockType: string,
  configJson: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  remapPageBlockConfig(blockType, configJson, mediaIdMap, mediaUrlMap);
}

// ─── SubpageVersion.snapshot 재매핑 ─────────────────────────

function remapSubpageVersionSnapshot(
  snapshot: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  if (!snapshot || typeof snapshot !== 'object') return;
  const s = snapshot as {
    meta?: { featuredImageId?: unknown };
    blocks?: unknown;
  };

  // meta.featuredImageId
  if (s.meta && typeof s.meta.featuredImageId === 'string') {
    const oldMediaId = s.meta.featuredImageId;
    const newId = mediaIdMap.get(s.meta.featuredImageId);
    if (newId) s.meta.featuredImageId = newId;
    const newUrl = mediaUrlMap.get(oldMediaId);
    if (
      newUrl &&
      typeof (s.meta as { featuredImageUrl?: unknown }).featuredImageUrl ===
        'string'
    ) {
      (s.meta as { featuredImageUrl: string }).featuredImageUrl = newUrl;
    }
  }

  // blocks[].configJson — PageBlock과 동일 분기
  if (Array.isArray(s.blocks)) {
    for (const block of s.blocks) {
      if (!block || typeof block !== 'object') continue;
      const b = block as { blockType?: unknown; configJson?: unknown };
      if (typeof b.blockType !== 'string') continue;
      remapPageBlockConfig(b.blockType, b.configJson, mediaIdMap, mediaUrlMap);
    }
  }
}

export function remapSubpageVersionSnapshotJsonReferences(
  snapshot: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  remapSubpageVersionSnapshot(snapshot, mediaIdMap, mediaUrlMap);
}

// ─── HomePopup.contentJson 재매핑 (CONTENT 타입의 Tiptap) ──

function remapHomePopupContent(
  popupType: string,
  contentJson: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  if (popupType !== 'CONTENT') return;
  if (!contentJson) return;
  remapTiptapNode(contentJson, mediaIdMap, mediaUrlMap);
}

export function remapHomePopupContentJsonReferences(
  popupType: string,
  contentJson: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  remapHomePopupContent(popupType, contentJson, mediaIdMap, mediaUrlMap);
}

// ─── Post.contentJson 재매핑 (Tiptap) ───────────────────────

function remapPostContent(
  contentJson: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  if (!contentJson) return;
  remapTiptapNode(contentJson, mediaIdMap, mediaUrlMap);
}

export function remapPostContentJsonReferences(
  contentJson: unknown,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap = new Map(),
): void {
  remapPostContent(contentJson, mediaIdMap, mediaUrlMap);
}

// ─── SiteSettings value 재매핑 ─────────────────────────────

export function remapSiteSettingValueReferences(
  key: string,
  value: string,
  mediaIdMap: IdMap,
): string {
  if (!value) return value;

  if (MEDIA_ID_SETTING_KEYS.has(key)) {
    return mediaIdMap.get(value) ?? value;
  }

  if (key !== 'SITE_FOOTER_CONFIG') {
    return value;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return value;
    }

    const config = parsed as { footerLogoMediaId?: unknown };
    if (typeof config.footerLogoMediaId === 'string') {
      config.footerLogoMediaId =
        mediaIdMap.get(config.footerLogoMediaId) ?? config.footerLogoMediaId;
    }
    return JSON.stringify(parsed);
  } catch {
    return value;
  }
}

// ─── 최상위 진입점 ────────────────────────────────────────

/**
 * payload의 모든 JSON 깊이 위치를 순회하며 idMap에 따라 in-place rewrite.
 *
 * @param payload - SnapshotPayload (in-place 변경됨)
 * @param idMap - oldId → newId
 * @param kind - 'mediaId' | 'boardId' | 'subpageId'
 */
export function walkSnapshotForRemap(
  payload: SnapshotPayload,
  idMap: IdMap,
  kind: RemapKind,
): void {
  if (idMap.size === 0) return;

  // HomeSection
  for (const section of payload.models.HomeSection) {
    if (kind === 'subpageId') {
      remapHomeSectionSubpageReferences(
        section.sectionType,
        section.configJson,
        idMap,
      );
    } else {
      remapHomeSectionConfig(
        section.sectionType,
        section.configJson,
        idMap,
        kind,
      );
    }
  }

  if (kind !== 'mediaId') return; // boardId/subpageId는 HomeSection까지만

  for (const setting of payload.models.SiteSettings) {
    setting.value = remapSiteSettingValueReferences(
      setting.key,
      setting.value,
      idMap,
    );
  }

  // Post.contentJson — Tiptap (image 노드 mediaId)
  for (const post of payload.models.Post) {
    remapPostContent(post.contentJson, idMap);
  }

  // PageBlock.configJson — IMAGE/RICH_TEXT 분기
  for (const block of payload.models.PageBlock) {
    remapPageBlockConfig(block.blockType, block.configJson, idMap);
  }

  // HomePopup.contentJson — CONTENT 타입 Tiptap
  for (const popup of payload.models.HomePopup) {
    remapHomePopupContent(popup.popupType, popup.contentJson, idMap);
  }

  // SubpageVersion.snapshot — meta + blocks
  for (const version of payload.models.SubpageVersion) {
    remapSubpageVersionSnapshot(version.snapshot, idMap);
  }
}

export function walkSnapshotForMediaUrlRemap(
  payload: SnapshotPayload,
  mediaIdMap: IdMap,
  mediaUrlMap: UrlMap,
): void {
  if (mediaUrlMap.size === 0) return;

  for (const section of payload.models.HomeSection) {
    remapHomeSectionConfig(
      section.sectionType,
      section.configJson,
      mediaIdMap,
      'mediaId',
      mediaUrlMap,
    );
  }

  for (const post of payload.models.Post) {
    remapPostContent(post.contentJson, mediaIdMap, mediaUrlMap);
  }

  for (const block of payload.models.PageBlock) {
    remapPageBlockConfig(
      block.blockType,
      block.configJson,
      mediaIdMap,
      mediaUrlMap,
    );
  }

  for (const popup of payload.models.HomePopup) {
    remapHomePopupContent(
      popup.popupType,
      popup.contentJson,
      mediaIdMap,
      mediaUrlMap,
    );
    if (typeof popup.imageMediaId === 'string') {
      const newUrl = mediaUrlMap.get(popup.imageMediaId);
      if (newUrl && typeof popup.imageUrl === 'string') popup.imageUrl = newUrl;
    }
  }

  for (const version of payload.models.SubpageVersion) {
    remapSubpageVersionSnapshot(version.snapshot, mediaIdMap, mediaUrlMap);
  }
}
