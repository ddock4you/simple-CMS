/**
 * 시연 모드 PR6: snapshot.json → `__SEED__` 적재 코어.
 *
 * **흐름**:
 *   - Phase 0: Zod 검증
 *   - Phase 1 (트랜잭션 밖): resetSeedData → Storage upload → URL/idMap 빌드
 *   - Phase 2 ($transaction): cuid idMap 빌드 → walker remap → 14모델 createMany
 *
 * **Phase 1/2 분리 이유**:
 *   Supabase Storage는 sync network라 100개 upload면 30s pooler-friendly transaction이 timeout.
 *   Phase 1 부분 실패 시 orphan storage 파일은 다음 import의 `cleanupSeedFolder()`가 정리.
 *
 * **uploadedById 정책**: 운영 dev User 이름 유출 방지 위해 일괄 null.
 *
 * **User.password placeholder**: payload에서 제외됐으므로 import 시 임의 bcrypt hash로 채움.
 *   demo_admin User만 demo-seed.ts가 실제 비밀번호로 다시 채워야 시연 자동 진입 동작.
 *
 * 호출자: admin route handler `/api/demo/snapshot/import`, CLI `pnpm demo:import`.
 */
import { prisma } from '../client';
import { Prisma } from '../generated/prisma/client';

import { resetSeedData, type ResetSeedDataOptions } from './resetSeedData';
import { isBypassed, runWithBypass, SEED_SENTINEL } from './sessionContext';
import {
  snapshotPayloadSchema,
  type SnapshotBoardRow,
  type SnapshotHomePopupRow,
  type SnapshotHomeSectionRow,
  type SnapshotMediaRow,
  type SnapshotNavigationMenuItemRow,
  type SnapshotNavigationMenuRow,
  type SnapshotPageBlockRow,
  type SnapshotPayload,
  type SnapshotPostRow,
  type SnapshotRoleRow,
  type SnapshotSiteSettingsRow,
  type SnapshotSubpageFeedbackRow,
  type SnapshotSubpageRow,
  type SnapshotSubpageVersionRow,
  type SnapshotUserRow,
} from './snapshot.types';
import { PLACEHOLDER_PASSWORD_HASH } from './snapshot/constants';
import { ensureDemoAdminSeed } from './snapshot/ensureDemoAdminSeed';
import { buildSnapshotIdMaps } from './snapshot/idMaps';
import { uploadSnapshotMedia } from './snapshot/mediaUpload';
import { anonymizeUserAgent } from './snapshotLogSanitizer';
import {
  walkSnapshotForMediaUrlRemap,
  walkSnapshotForRemap,
} from './snapshotWalker';

const TRANSACTION_TIMEOUT_MS = 60_000; // import는 row 많을 수 있어 cloneSeedToSession(30s)보다 길게
const TRANSACTION_MAX_WAIT_MS = 5_000;

export interface ImportOptions {
  /**
   * Storage upload callback. (storageKey, buffer, mimeType) → 공개 URL 반환.
   * admin route handler / CLI가 Supabase adapter의 `uploadToSeed()` 주입.
   */
  uploadMedia: (
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ) => Promise<string>;
  /**
   * Storage `__SEED__/` 정리 callback (resetSeedData에 위임).
   * 누락 시 Storage 정리 skip.
   */
  cleanupStorage?: ResetSeedDataOptions['cleanupStorage'];
}

export interface ImportStats {
  rowsCreatedByModel: Record<string, number>;
  mediaFilesUploaded: number;
  storageFilesDeleted: number;
  rowsDeletedByModel: Record<string, number>;
  errors: string[];
}

export async function importSnapshotToSeed(
  rawPayload: unknown,
  options: ImportOptions,
): Promise<ImportStats> {
  // ─── Phase 0: Zod 검증 ─────────────────────────────
  const parsed = snapshotPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error(
      `snapshot 검증 실패: ${parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }
  const payload = parsed.data;

  const exec = (): Promise<ImportStats> => doImport(payload, options);

  if (isBypassed()) {
    return exec();
  }
  return runWithBypass(exec);
}

async function doImport(
  payload: SnapshotPayload,
  options: ImportOptions,
): Promise<ImportStats> {
  const stats: ImportStats = {
    rowsCreatedByModel: {},
    mediaFilesUploaded: 0,
    storageFilesDeleted: 0,
    rowsDeletedByModel: {},
    errors: [],
  };

  // ─── Phase 1a: resetSeedData (DB row + Storage 파일 정리) ─
  const resetResult = await resetSeedData({
    cleanupStorage: options.cleanupStorage,
  });
  stats.rowsDeletedByModel = resetResult.rowsDeletedByModel;
  stats.storageFilesDeleted = resetResult.storageFilesDeleted;
  stats.errors.push(...resetResult.errors);

  // ─── Phase 1b: Media upload + URL 매핑 (트랜잭션 밖) ──
  // 같은 cloneSeedToSession 패턴: 모든 14 모델에 대해 idMap 사전 생성
  // (응답 순서 보장 모호성 회피)
  const idMaps = buildSnapshotIdMaps(payload);
  const mediaUpload = await uploadSnapshotMedia(
    payload.models.Media,
    idMaps,
    options.uploadMedia,
  );
  const { mediaIdMap, mediaUrlMap } = mediaUpload;
  stats.mediaFilesUploaded = mediaUpload.mediaFilesUploaded;
  stats.errors.push(...mediaUpload.errors);

  // ─── Phase 1c: walker remap (in-place) ───────────────
  // URL 재작성은 old mediaId 기준 mediaUrlMap을 사용하므로 mediaId-only remap보다 먼저 수행한다.
  // walkSnapshotForMediaUrlRemap은 JSON 내부 mediaId도 함께 새 id로 바꾸지만 SiteSettings는 다루지 않는다.
  walkSnapshotForMediaUrlRemap(payload, mediaIdMap, mediaUrlMap);
  walkSnapshotForRemap(payload, mediaIdMap, 'mediaId');
  walkSnapshotForRemap(payload, idMaps.Board, 'boardId');
  walkSnapshotForRemap(payload, idMaps.Subpage, 'subpageId');

  // ─── Phase 2: $transaction으로 14모델 createMany ──
  await prisma.$transaction(
    async (tx) => {
      // 자식 → 부모 의존성. cloneSeedToSession 동일 순서 (단 외부 JSON이므로 findMany 없음).
      // 모든 row의 sessionId를 SEED_SENTINEL로 강제.

      // 1) Role
      if (payload.models.Role.length > 0) {
        await tx.role.createMany({
          data: payload.models.Role.map((r: SnapshotRoleRow) => ({
            id: idMaps.Role.get(r.id)!,
            sessionId: SEED_SENTINEL,
            name: r.name,
            description: r.description,
            permissions: r.permissions as Prisma.InputJsonValue,
            isSystem: r.isSystem,
            isDefault: r.isDefault,
          })),
        });
        stats.rowsCreatedByModel.Role = payload.models.Role.length;
      }

      // 2) User
      if (payload.models.User.length > 0) {
        await tx.user.createMany({
          data: payload.models.User.map((u: SnapshotUserRow) => ({
            id: idMaps.User.get(u.id)!,
            sessionId: SEED_SENTINEL,
            username: u.username,
            password: PLACEHOLDER_PASSWORD_HASH, // 시드 User 로그인 차단
            email: u.email,
            name: u.name,
            status: u.status,
            roleId: u.roleId ? (idMaps.Role.get(u.roleId) ?? null) : null,
          })),
        });
        stats.rowsCreatedByModel.User = payload.models.User.length;
      }

      // 3) Media (uploadedById = null 일괄)
      if (payload.models.Media.length > 0) {
        await tx.media.createMany({
          data: payload.models.Media.map((m: SnapshotMediaRow) => ({
            id: idMaps.Media.get(m.id)!,
            sessionId: SEED_SENTINEL,
            filename: m.filename,
            originalFilename: m.originalFilename,
            mimeType: m.mimeType,
            size: m.size,
            url: mediaUrlMap.get(m.id) ?? m.url, // Phase 1b에서 새 URL
            alt: m.alt,
            contentHash: m.contentHash,
            uploadedById: null, // 의도적 null (anonymization)
          })),
        });
        stats.rowsCreatedByModel.Media = payload.models.Media.length;
      }

      // 4) SiteSettings
      if (payload.models.SiteSettings.length > 0) {
        await tx.siteSettings.createMany({
          data: payload.models.SiteSettings.map(
            (s: SnapshotSiteSettingsRow) => ({
              id: idMaps.SiteSettings.get(s.id)!,
              sessionId: SEED_SENTINEL,
              key: s.key,
              value: s.value,
              description: s.description,
            }),
          ),
        });
        stats.rowsCreatedByModel.SiteSettings =
          payload.models.SiteSettings.length;
      }

      // 5) NavigationMenu
      if (payload.models.NavigationMenu.length > 0) {
        await tx.navigationMenu.createMany({
          data: payload.models.NavigationMenu.map(
            (m: SnapshotNavigationMenuRow) => ({
              id: idMaps.NavigationMenu.get(m.id)!,
              sessionId: SEED_SENTINEL,
              name: m.name,
              description: m.description,
              slots: m.slots,
            }),
          ),
        });
        stats.rowsCreatedByModel.NavigationMenu =
          payload.models.NavigationMenu.length;
      }

      // 6) Board
      if (payload.models.Board.length > 0) {
        await tx.board.createMany({
          data: payload.models.Board.map((b: SnapshotBoardRow) => ({
            id: idMaps.Board.get(b.id)!,
            sessionId: SEED_SENTINEL,
            name: b.name,
            slug: b.slug,
            description: b.description,
            skinType: b.skinType,
            isPublic: b.isPublic,
            displayOrder: b.displayOrder,
          })),
        });
        stats.rowsCreatedByModel.Board = payload.models.Board.length;
      }

      // 7) HomeSection (configJson은 walker로 mediaId/boardId 이미 재매핑됨)
      if (payload.models.HomeSection.length > 0) {
        await tx.homeSection.createMany({
          data: payload.models.HomeSection.map((h: SnapshotHomeSectionRow) => ({
            id: idMaps.HomeSection.get(h.id)!,
            sessionId: SEED_SENTINEL,
            sectionType: h.sectionType,
            title: h.title,
            configJson: h.configJson as Prisma.InputJsonValue,
            isVisible: h.isVisible,
            displayOrder: h.displayOrder,
          })),
        });
        stats.rowsCreatedByModel.HomeSection =
          payload.models.HomeSection.length;
      }

      // 8) Subpage
      if (payload.models.Subpage.length > 0) {
        await tx.subpage.createMany({
          data: payload.models.Subpage.map((s: SnapshotSubpageRow) => ({
            id: idMaps.Subpage.get(s.id)!,
            sessionId: SEED_SENTINEL,
            title: s.title,
            slug: s.slug,
            seoTitle: s.seoTitle,
            seoDescription: s.seoDescription,
            content: s.content,
            status: s.status,
            publishedAt: s.publishedAt ? new Date(s.publishedAt) : null,
            featuredImageId: s.featuredImageId
              ? (idMaps.Media.get(s.featuredImageId) ?? null)
              : null,
            cclType: s.cclType,
            cclAi: s.cclAi,
            feedbackEnabled: s.feedbackEnabled,
            displayOrder: s.displayOrder,
            revision: s.revision,
          })),
        });
        stats.rowsCreatedByModel.Subpage = payload.models.Subpage.length;
      }

      // 9) Post (Tiptap contentJson은 walker가 mediaId 이미 재매핑)
      if (payload.models.Post.length > 0) {
        await tx.post.createMany({
          data: payload.models.Post.map((p: SnapshotPostRow) => ({
            id: idMaps.Post.get(p.id)!,
            sessionId: SEED_SENTINEL,
            title: p.title,
            slug: p.slug,
            boardId: idMaps.Board.get(p.boardId) ?? p.boardId,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            contentJson:
              (p.contentJson as Prisma.InputJsonValue | null) ??
              Prisma.JsonNull,
            content: p.content,
            status: p.status,
            isImportant: p.isImportant,
            publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
            featuredImageId: p.featuredImageId
              ? (idMaps.Media.get(p.featuredImageId) ?? null)
              : null,
            authorId: p.authorId ? (idMaps.User.get(p.authorId) ?? null) : null,
            displayOrder: p.displayOrder,
          })),
        });
        stats.rowsCreatedByModel.Post = payload.models.Post.length;
      }

      // 10) PageBlock (configJson은 walker가 IMAGE/RICH_TEXT 재매핑)
      if (payload.models.PageBlock.length > 0) {
        await tx.pageBlock.createMany({
          data: payload.models.PageBlock.map((b: SnapshotPageBlockRow) => ({
            id: idMaps.PageBlock.get(b.id)!,
            sessionId: SEED_SENTINEL,
            subpageId: idMaps.Subpage.get(b.subpageId) ?? b.subpageId,
            blockType: b.blockType,
            configJson: b.configJson as Prisma.InputJsonValue,
            isVisible: b.isVisible,
            displayOrder: b.displayOrder,
          })),
        });
        stats.rowsCreatedByModel.PageBlock = payload.models.PageBlock.length;
      }

      // 11) HomePopup
      if (payload.models.HomePopup.length > 0) {
        await tx.homePopup.createMany({
          data: payload.models.HomePopup.map((p: SnapshotHomePopupRow) => ({
            id: idMaps.HomePopup.get(p.id)!,
            sessionId: SEED_SENTINEL,
            popupType: p.popupType,
            title: p.title,
            contentJson:
              (p.contentJson as Prisma.InputJsonValue | null) ??
              Prisma.JsonNull,
            content: p.content,
            imageUrl: p.imageUrl,
            imageAlt: p.imageAlt,
            imageMediaId: p.imageMediaId
              ? (idMaps.Media.get(p.imageMediaId) ?? null)
              : null,
            linkUrl: p.linkUrl,
            buttonLabel: p.buttonLabel,
            isVisible: p.isVisible,
            displayOrder: p.displayOrder,
            startDate: p.startDate ? new Date(p.startDate) : null,
            endDate: p.endDate ? new Date(p.endDate) : null,
          })),
        });
        stats.rowsCreatedByModel.HomePopup = payload.models.HomePopup.length;
      }

      // 12) NavigationMenuItem (parentId 자기참조 — 2-pass)
      if (payload.models.NavigationMenuItem.length > 0) {
        const pass1 = payload.models.NavigationMenuItem.map(
          (i: SnapshotNavigationMenuItemRow) => ({
            id: idMaps.NavigationMenuItem.get(i.id)!,
            sessionId: SEED_SENTINEL,
            menuId: idMaps.NavigationMenu.get(i.menuId) ?? i.menuId,
            parentId: null as string | null, // 1-pass: null
            label: i.label,
            itemType: i.itemType,
            subpageId: i.subpageId
              ? (idMaps.Subpage.get(i.subpageId) ?? null)
              : null,
            boardId: i.boardId ? (idMaps.Board.get(i.boardId) ?? null) : null,
            url: i.url,
            isVisible: i.isVisible,
            openInNewTab: i.openInNewTab,
            displayOrder: i.displayOrder,
            startDate: i.startDate ? new Date(i.startDate) : null,
            endDate: i.endDate ? new Date(i.endDate) : null,
          }),
        );
        await tx.navigationMenuItem.createMany({ data: pass1 });

        // 2-pass: parentId 채우기
        for (const seed of payload.models.NavigationMenuItem) {
          if (!seed.parentId) continue;
          const newId = idMaps.NavigationMenuItem.get(seed.id);
          const newParentId = idMaps.NavigationMenuItem.get(seed.parentId);
          if (!newId || !newParentId) continue;
          await tx.navigationMenuItem.update({
            where: { id: newId },
            data: { parentId: newParentId },
          });
        }
        stats.rowsCreatedByModel.NavigationMenuItem = pass1.length;
      }

      // 13) SubpageVersion (snapshot Json은 walker가 이미 재매핑)
      if (payload.models.SubpageVersion.length > 0) {
        await tx.subpageVersion.createMany({
          data: payload.models.SubpageVersion.map(
            (v: SnapshotSubpageVersionRow) => ({
              id: idMaps.SubpageVersion.get(v.id)!,
              sessionId: SEED_SENTINEL,
              subpageId: idMaps.Subpage.get(v.subpageId) ?? v.subpageId,
              createdById: v.createdById
                ? (idMaps.User.get(v.createdById) ?? null)
                : null,
              label: v.label,
              snapshot: v.snapshot as Prisma.InputJsonValue,
              isPinned: v.isPinned,
              sourceAction: v.sourceAction,
            }),
          ),
        });
        stats.rowsCreatedByModel.SubpageVersion =
          payload.models.SubpageVersion.length;
      }

      // 14) SubpageFeedback
      if (payload.models.SubpageFeedback.length > 0) {
        await tx.subpageFeedback.createMany({
          data: payload.models.SubpageFeedback.map(
            (f: SnapshotSubpageFeedbackRow) => ({
              id: idMaps.SubpageFeedback.get(f.id)!,
              sessionId: SEED_SENTINEL,
              subpageId: idMaps.Subpage.get(f.subpageId) ?? f.subpageId,
              rating: f.rating,
              positiveReasons: f.positiveReasons,
              comment: f.comment,
              ipAddressHash: f.ipAddressHash,
              userAgent: anonymizeUserAgent(f.userAgent),
            }),
          ),
        });
        stats.rowsCreatedByModel.SubpageFeedback =
          payload.models.SubpageFeedback.length;
      }
    },
    {
      timeout: TRANSACTION_TIMEOUT_MS,
      maxWait: TRANSACTION_MAX_WAIT_MS,
    },
  );

  const ensuredDemoAdmin = await ensureDemoAdminSeed();
  if (ensuredDemoAdmin.roleCreated) {
    stats.rowsCreatedByModel.Role = (stats.rowsCreatedByModel.Role ?? 0) + 1;
  }
  if (ensuredDemoAdmin.userCreated) {
    stats.rowsCreatedByModel.User = (stats.rowsCreatedByModel.User ?? 0) + 1;
  }

  return stats;
}
