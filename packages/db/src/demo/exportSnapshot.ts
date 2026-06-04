/**
 * 시연 모드 snapshot export 코어 (PR6).
 *
 * - 운영(__PROD__) 또는 dev 환경의 16모델 row를 SnapshotPayload JSON으로 직렬화
 * - Media binary는 callback으로 download → processMediaForExport(JPEG 최적화, 투명 이미지 원본 유지) → base64
 * - User.password 제외 (export payload에 포함 X)
 * - Media.uploadedById = null 일괄 (anonymization)
 * - AuditLog / ErrorLog는 포함하되 IP/UA/민감 JSON 키 익명화
 * - Session / PreviewToken 미포함
 *
 * 호출자:
 *   - admin route handler `/api/demo/snapshot/export` (GET)
 *   - CLI `pnpm demo:export <output>`
 */
import { prisma } from '../client';

import { processMediaForExport } from './exportMedia';
import {
  anonymizeIp,
  anonymizeUserAgent,
  sanitizeSnapshotJson,
} from './snapshotLogSanitizer';
import { isBypassed, runWithBypass } from './sessionContext';
import {
  SNAPSHOT_SCHEMA_VERSION,
  type SnapshotMediaRow,
  type SnapshotPayload,
} from './snapshot.types';

export interface ExportOptions {
  /**
   * 어느 sessionId에서 export할지. 기본 '__PROD__' (운영 시드 export).
   * dev 환경에서 운영 데이터를 export할 때도 보통 PROD_SENTINEL.
   */
  sourceSessionId: string;
  /**
   * Media storageKey → Buffer 회수 콜백. provider별로 admin/CLI 호출자가 주입.
   */
  downloadMedia: (storageKey: string) => Promise<Buffer>;
  /**
   * Media URL → storageKey 변환 콜백. 어댑터별 형식 차이를 호출자가 처리.
   */
  urlToStorageKey: (url: string) => string | null;
  /** 선택: media 처리 동시성 (기본 4). 큰 dataset에서 시간/메모리 trade-off */
  concurrency?: number;
}

export async function exportSnapshot(
  options: ExportOptions,
): Promise<SnapshotPayload> {
  const exec = (): Promise<SnapshotPayload> => doExport(options);

  // bypass 컨텍스트가 아니면 자동 wrap (extension의 sessionId 필터를 우회하고
  // sourceSessionId 명시로만 회수하기 위함)
  if (isBypassed()) {
    return exec();
  }
  return runWithBypass(exec);
}

async function doExport(options: ExportOptions): Promise<SnapshotPayload> {
  const {
    sourceSessionId,
    downloadMedia,
    urlToStorageKey,
    concurrency = 4,
  } = options;

  // ─── 16모델 findMany ─────────────────────────────
  const [
    roles,
    users,
    media,
    siteSettings,
    navigationMenus,
    boards,
    homeSections,
    subpages,
    posts,
    pageBlocks,
    homePopups,
    navigationMenuItems,
    subpageVersions,
    subpageFeedback,
    auditLogs,
    errorLogs,
  ] = await Promise.all([
    prisma.role.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.user.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.media.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.siteSettings.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.navigationMenu.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.board.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.homeSection.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.subpage.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.post.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.pageBlock.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.homePopup.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.navigationMenuItem.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.subpageVersion.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.subpageFeedback.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.auditLog.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
    prisma.errorLog.findMany({
      where: { sessionId: sourceSessionId },
      orderBy: { id: 'asc' },
    }),
  ]);

  // ─── Media binary 처리 (concurrency 제한) ─────────
  const processedMedia = await processMediaWithConcurrency(
    media,
    concurrency,
    downloadMedia,
    urlToStorageKey,
  );

  // ─── payload 조립 ────────────────────────────────
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    models: {
      Role: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions as unknown,
        isSystem: r.isSystem,
        isDefault: r.isDefault,
      })),
      User: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        name: u.name,
        status: u.status,
        roleId: u.roleId,
        // password는 의도적 제거
      })),
      Media: processedMedia,
      SiteSettings: siteSettings.map((s) => ({
        id: s.id,
        key: s.key,
        value: s.value,
        description: s.description,
      })),
      NavigationMenu: navigationMenus.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        slots: m.slots,
      })),
      Board: boards.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description,
        skinType: b.skinType,
        isPublic: b.isPublic,
        displayOrder: b.displayOrder,
      })),
      HomeSection: homeSections.map((h) => ({
        id: h.id,
        sectionType: h.sectionType,
        title: h.title,
        configJson: h.configJson as unknown,
        isVisible: h.isVisible,
        displayOrder: h.displayOrder,
      })),
      Subpage: subpages.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
        content: s.content,
        status: s.status,
        publishedAt: s.publishedAt?.toISOString() ?? null,
        featuredImageId: s.featuredImageId,
        cclType: s.cclType,
        cclAi: s.cclAi,
        feedbackEnabled: s.feedbackEnabled,
        displayOrder: s.displayOrder,
        revision: s.revision,
      })),
      Post: posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        boardId: p.boardId,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        contentJson: (p.contentJson as unknown) ?? null,
        content: p.content,
        status: p.status,
        isImportant: p.isImportant,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        featuredImageId: p.featuredImageId,
        authorId: p.authorId,
        displayOrder: p.displayOrder,
      })),
      PageBlock: pageBlocks.map((b) => ({
        id: b.id,
        subpageId: b.subpageId,
        blockType: b.blockType,
        configJson: b.configJson as unknown,
        isVisible: b.isVisible,
        displayOrder: b.displayOrder,
      })),
      HomePopup: homePopups.map((p) => ({
        id: p.id,
        popupType: p.popupType,
        title: p.title,
        contentJson: (p.contentJson as unknown) ?? null,
        content: p.content,
        imageUrl: p.imageUrl,
        imageAlt: p.imageAlt,
        imageMediaId: p.imageMediaId,
        linkUrl: p.linkUrl,
        buttonLabel: p.buttonLabel,
        isVisible: p.isVisible,
        displayOrder: p.displayOrder,
        startDate: p.startDate?.toISOString() ?? null,
        endDate: p.endDate?.toISOString() ?? null,
      })),
      NavigationMenuItem: navigationMenuItems.map((i) => ({
        id: i.id,
        menuId: i.menuId,
        parentId: i.parentId,
        label: i.label,
        itemType: i.itemType,
        subpageId: i.subpageId,
        boardId: i.boardId,
        url: i.url,
        isVisible: i.isVisible,
        openInNewTab: i.openInNewTab,
        displayOrder: i.displayOrder,
        startDate: i.startDate?.toISOString() ?? null,
        endDate: i.endDate?.toISOString() ?? null,
      })),
      SubpageVersion: subpageVersions.map((v) => ({
        id: v.id,
        subpageId: v.subpageId,
        createdById: v.createdById,
        label: v.label,
        snapshot: v.snapshot as unknown,
        isPinned: v.isPinned,
        sourceAction: v.sourceAction,
      })),
      SubpageFeedback: subpageFeedback.map((f) => ({
        id: f.id,
        subpageId: f.subpageId,
        rating: f.rating,
        positiveReasons: f.positiveReasons,
        comment: f.comment,
        ipAddressHash: f.ipAddressHash,
        userAgent: anonymizeUserAgent(f.userAgent),
      })),
      AuditLog: auditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        entityTitle: l.entityTitle,
        changes: sanitizeSnapshotJson(l.changes) as unknown,
        userId: l.userId,
        ipAddress: anonymizeIp(l.ipAddress),
        userAgent: anonymizeUserAgent(l.userAgent),
        createdAt: l.createdAt.toISOString(),
      })),
      ErrorLog: errorLogs.map((l) => ({
        id: l.id,
        level: l.level,
        source: l.source,
        message: l.message,
        stack: l.stack,
        url: l.url,
        method: l.method,
        statusCode: l.statusCode,
        userAgent: anonymizeUserAgent(l.userAgent),
        ipAddress: anonymizeIp(l.ipAddress),
        referer: null,
        digest: l.digest,
        fingerprint: l.fingerprint,
        metadata: sanitizeSnapshotJson(l.metadata) as unknown,
        isResolved: l.isResolved,
        resolvedAt: l.resolvedAt?.toISOString() ?? null,
        resolvedBy: l.resolvedBy,
        createdAt: l.createdAt.toISOString(),
      })),
    },
  } as SnapshotPayload;
}

// ─── Media binary concurrency 제한 처리 ──────────────

interface MediaRowDb {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  alt: string | null;
  contentHash: string | null;
  uploadedById: string | null;
}

async function processMediaWithConcurrency(
  rows: MediaRowDb[],
  concurrency: number,
  downloadMedia: (key: string) => Promise<Buffer>,
  urlToStorageKey: (url: string) => string | null,
): Promise<SnapshotMediaRow[]> {
  const results: (SnapshotMediaRow | null)[] = new Array(rows.length).fill(
    null,
  );
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= rows.length) return;
      const row = rows[i]!;

      try {
        const storageKey = urlToStorageKey(row.url);
        if (!storageKey) {
          console.warn(
            `[exportSnapshot] storageKey 추출 실패 — Media skip: ${row.id} (${row.url})`,
          );
          results[i] = null;
          continue;
        }
        const buffer = await downloadMedia(storageKey);
        const processed = await processMediaForExport(buffer, row.mimeType);
        results[i] = {
          id: row.id,
          filename: row.filename,
          originalFilename: row.originalFilename,
          mimeType: processed.mimeType, // sharp 변환 시 image/jpeg로 통일
          size: processed.size,
          url: row.url,
          alt: row.alt,
          contentHash: row.contentHash,
          uploadedById: null, // anonymization
          base64Data: processed.base64Data,
        };
      } catch (err) {
        console.error(
          `[exportSnapshot] Media 처리 실패 — skip: ${row.id}`,
          err,
        );
        results[i] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () =>
    worker(),
  );
  await Promise.all(workers);

  return results.filter((r): r is SnapshotMediaRow => r !== null);
}
