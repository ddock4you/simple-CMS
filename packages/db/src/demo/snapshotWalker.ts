/**
 * 시연 모드 snapshot import 시 in-place mediaId / boardId 재매핑 walker.
 *
 * 사용 패턴:
 *   1. importSnapshot이 14모델 row마다 oldId → newCuid idMap 빌드
 *   2. payload deep clone (또는 in-place 변경 허용)
 *   3. walkSnapshotForRemap(payload, mediaIdMap, 'mediaId') — 모든 mediaId 위치 재매핑
 *   4. walkSnapshotForRemap(payload, boardIdMap, 'boardId') — HomeSection board 참조 재매핑
 *   5. createMany 시 row 자체 컬럼(featuredImageId, imageMediaId 등 평탄 FK)은
 *      별도 매핑 (walker는 JSON 안 깊은 mediaId/boardId만 처리)
 *
 * **위치별 field name 분기 (PR6 핵심)**:
 *   - HomeSection.configJson:
 *     - HERO    `slides[].mediaId`   (field: `mediaId`)
 *     - RECOMMENDED `items[].mediaId` (field: `mediaId`)
 *     - LATEST_POSTS `boardId` (top-level)
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
type RemapKind = 'mediaId' | 'boardId';

// ─── Tiptap 재귀 walker (image 노드의 attrs.mediaId 재매핑) ────

function remapTiptapNode(node: unknown, mediaIdMap: IdMap): void {
  if (!node || typeof node !== 'object') return;
  const n = node as {
    type?: string;
    attrs?: { mediaId?: unknown };
    content?: unknown;
  };
  if (n.type === 'image' && typeof n.attrs?.mediaId === 'string') {
    const newId = mediaIdMap.get(n.attrs.mediaId);
    if (newId) {
      n.attrs.mediaId = newId;
    }
  }
  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      remapTiptapNode(child, mediaIdMap);
    }
  }
}

// ─── HomeSection.configJson 재매핑 ──────────────────────────

function remapHomeSectionConfig(
  sectionType: string,
  configJson: unknown,
  idMap: IdMap,
  kind: RemapKind,
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
            const newId = idMap.get(s.mediaId);
            if (newId) s.mediaId = newId;
          }
        }
      }
    }
    // RECOMMENDED / SUB_CAROUSEL items[].mediaId, FREQUENT_MENU items[].iconMediaId
    if (
      (sectionType === 'RECOMMENDED' ||
        sectionType === 'SUB_CAROUSEL' ||
        sectionType === 'FREQUENT_MENU') &&
      Array.isArray(cfg.items)
    ) {
      for (const item of cfg.items) {
        if (item && typeof item === 'object') {
          const i = item as { mediaId?: unknown; iconMediaId?: unknown };
          if (typeof i.mediaId === 'string') {
            const newId = idMap.get(i.mediaId);
            if (newId) i.mediaId = newId;
          }
          if (typeof i.iconMediaId === 'string') {
            const newId = idMap.get(i.iconMediaId);
            if (newId) i.iconMediaId = newId;
          }
        }
      }
    }
  }

  if (kind === 'boardId') {
    // LATEST_POSTS boardId (top-level)
    if (sectionType === 'LATEST_POSTS' && typeof cfg.boardId === 'string') {
      const newId = idMap.get(cfg.boardId);
      if (newId) cfg.boardId = newId;
    }
    if (sectionType === 'GALLERY_COLLECTION' && Array.isArray(cfg.boardIds)) {
      cfg.boardIds = cfg.boardIds.map((boardId) =>
        typeof boardId === 'string' ? (idMap.get(boardId) ?? boardId) : boardId,
      );
    }
  }
}

// ─── PageBlock.configJson 재매핑 ────────────────────────────

function remapPageBlockConfig(
  blockType: string,
  configJson: unknown,
  mediaIdMap: IdMap,
): void {
  if (!configJson || typeof configJson !== 'object') return;
  const cfg = configJson as Record<string, unknown>;

  if (blockType === 'IMAGE') {
    // IMAGE 블록의 imageMediaId (field name 다름!)
    if (typeof cfg.imageMediaId === 'string') {
      const newId = mediaIdMap.get(cfg.imageMediaId);
      if (newId) cfg.imageMediaId = newId;
    }
  }

  if (blockType === 'RICH_TEXT') {
    // RICH_TEXT의 contentJson → Tiptap 재귀
    if (cfg.contentJson) {
      remapTiptapNode(cfg.contentJson, mediaIdMap);
    }
  }
}

// ─── SubpageVersion.snapshot 재매핑 ─────────────────────────

function remapSubpageVersionSnapshot(
  snapshot: unknown,
  mediaIdMap: IdMap,
): void {
  if (!snapshot || typeof snapshot !== 'object') return;
  const s = snapshot as {
    meta?: { featuredImageId?: unknown };
    blocks?: unknown;
  };

  // meta.featuredImageId
  if (s.meta && typeof s.meta.featuredImageId === 'string') {
    const newId = mediaIdMap.get(s.meta.featuredImageId);
    if (newId) s.meta.featuredImageId = newId;
  }

  // blocks[].configJson — PageBlock과 동일 분기
  if (Array.isArray(s.blocks)) {
    for (const block of s.blocks) {
      if (!block || typeof block !== 'object') continue;
      const b = block as { blockType?: unknown; configJson?: unknown };
      if (typeof b.blockType !== 'string') continue;
      remapPageBlockConfig(b.blockType, b.configJson, mediaIdMap);
    }
  }
}

// ─── HomePopup.contentJson 재매핑 (CONTENT 타입의 Tiptap) ──

function remapHomePopupContent(
  popupType: string,
  contentJson: unknown,
  mediaIdMap: IdMap,
): void {
  if (popupType !== 'CONTENT') return;
  if (!contentJson) return;
  remapTiptapNode(contentJson, mediaIdMap);
}

// ─── Post.contentJson 재매핑 (Tiptap) ───────────────────────

function remapPostContent(contentJson: unknown, mediaIdMap: IdMap): void {
  if (!contentJson) return;
  remapTiptapNode(contentJson, mediaIdMap);
}

// ─── 최상위 진입점 ────────────────────────────────────────

/**
 * payload의 모든 JSON 깊이 위치를 순회하며 idMap에 따라 in-place rewrite.
 *
 * @param payload - SnapshotPayload (in-place 변경됨)
 * @param idMap - oldId → newId
 * @param kind - 'mediaId' | 'boardId'
 */
export function walkSnapshotForRemap(
  payload: SnapshotPayload,
  idMap: IdMap,
  kind: RemapKind,
): void {
  if (idMap.size === 0) return;

  // HomeSection
  for (const section of payload.models.HomeSection) {
    remapHomeSectionConfig(
      section.sectionType,
      section.configJson,
      idMap,
      kind,
    );
  }

  if (kind !== 'mediaId') return; // boardId는 HomeSection까지만

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
