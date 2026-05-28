/**
 * 시연 모드: `__SEED__` sessionId의 모든 row를 새 sessionId로 in-memory remap 클론.
 *
 * 호출자는 반드시 `demo.runWithBypass(...)` 안에서 호출해야 한다 — Prisma extension의 자동
 * sessionId 주입을 우회하면서 양쪽 sessionId(`__SEED__` 읽기, newSessionId 쓰기)를 코드에서
 * 명시적으로 처리하기 위함. DEMO_MODE !== 'true' 환경(extension 미적용)에서는 그대로 동작한다.
 *
 * 동작:
 *   1. `prisma.$transaction(async tx => ...)` interactive transaction(timeout 30s)으로 원자적 실행
 *   2. 각 모델의 새 cuid를 JS에서 사전 생성(`@paralleldrive/cuid2`) → idMap 빌드 → `createMany` bulk insert.
 *      `createManyAndReturn` 응답 순서 보장 모호성을 회피하기 위함.
 *   3. NavigationMenuItem 자기참조(`parentId`)는 2-pass: 1차 createMany는 `parentId=null`, 2차 update로 채움.
 *   4. 부분 실패 시 PG가 자동 rollback → 호출 측은 catch 후 splash 재시도 흐름.
 *
 * 알려진 한계 (PR9/11 snapshot walker 도입 시 일괄 처리):
 *   - SubpageVersion.snapshot Json 내부의 mediaId/blockId는 walker 미적용 → `__SEED__`-era id 잔존.
 *     시연 사용자가 옛 버전 복원 시 image 등이 dangling 될 수 있음.
 *   - HomeSection.configJson 내부의 boardId / mediaId reference 동일 위험.
 *   - Tiptap RICH_TEXT 본문 image 노드의 `attrs.mediaId` 동일 위험.
 *   각 케이스 모두 시각 렌더 자체는 정상 (url 필드는 별도 보존).
 */
import { createId } from '@paralleldrive/cuid2';

import { prisma } from '../client';
import { Prisma } from '../generated/prisma/client';

import { isBypassed, SEED_SENTINEL } from './sessionContext';
import { SeedNotFoundError } from './SeedNotFoundError';

/** demo-seed.ts와 cloneSeedToSession이 공유하는 demo 관리자 username 상수. */
export const DEMO_ADMIN_USERNAME = 'demo_admin';

const TRANSACTION_TIMEOUT_MS = 30_000;
const TRANSACTION_MAX_WAIT_MS = 5_000;

export interface CloneStats {
  Role: number;
  User: number;
  Media: number;
  SiteSettings: number;
  NavigationMenu: number;
  Board: number;
  HomeSection: number;
  Subpage: number;
  Post: number;
  PageBlock: number;
  HomePopup: number;
  NavigationMenuItem: number;
  SubpageVersion: number;
  SubpageFeedback: number;
}

export interface CloneResult {
  stats: CloneStats;
  /** 새 sessionId 안의 demo admin User id. bootstrap API가 즉시 createSession에 사용. */
  demoAdminId: string;
}

/**
 * `__SEED__` row 14모델을 새 sessionId로 클론.
 *
 * @throws {SeedNotFoundError} `__SEED__` Role 또는 demo_admin User가 없으면.
 *   bootstrap API는 이 에러를 503 + `{ code: 'SEED_NOT_FOUND' }`로 변환한다.
 */
export async function cloneSeedToSession(
  newSessionId: string,
): Promise<CloneResult> {
  if (process.env.DEMO_MODE === 'true' && !isBypassed()) {
    throw new Error(
      'cloneSeedToSession must be called inside demo.runWithBypass(...) when DEMO_MODE=true',
    );
  }

  return prisma.$transaction(
    async (tx) => {
      // ─── 1) Role ────────────────────────────────────────
      const seedRoles = await tx.role.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      if (seedRoles.length === 0) {
        throw new SeedNotFoundError();
      }
      const roleIdMap = new Map<string, string>();
      const roleData = seedRoles.map((r) => {
        const newId = createId();
        roleIdMap.set(r.id, newId);
        return {
          id: newId,
          sessionId: newSessionId,
          name: r.name,
          description: r.description,
          permissions: r.permissions as Prisma.InputJsonValue,
          isSystem: r.isSystem,
          isDefault: r.isDefault,
        };
      });
      await tx.role.createMany({ data: roleData });

      // ─── 2) User ────────────────────────────────────────
      const seedUsers = await tx.user.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const userIdMap = new Map<string, string>();
      const userData = seedUsers.map((u) => {
        const newId = createId();
        userIdMap.set(u.id, newId);
        return {
          id: newId,
          sessionId: newSessionId,
          username: u.username,
          password: u.password,
          email: u.email,
          name: u.name,
          status: u.status,
          roleId: u.roleId ? (roleIdMap.get(u.roleId) ?? null) : null,
        };
      });
      if (userData.length > 0) {
        await tx.user.createMany({ data: userData });
      }

      // demo admin 식별 (bootstrap이 즉시 사용)
      const demoAdminSeed = seedUsers.find(
        (u) => u.username === DEMO_ADMIN_USERNAME,
      );
      if (!demoAdminSeed) {
        throw new SeedNotFoundError(
          `시연 모드 seed에 username='${DEMO_ADMIN_USERNAME}' User가 없습니다.`,
        );
      }
      const demoAdminId = userIdMap.get(demoAdminSeed.id);
      if (!demoAdminId) {
        // 이론상 도달 불가 (위에서 userIdMap.set 했음). 타입 가드 용도.
        throw new SeedNotFoundError(
          `Demo admin id remap 실패: ${demoAdminSeed.id}`,
        );
      }

      // ─── 3) Media ───────────────────────────────────────
      const seedMedia = await tx.media.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const mediaIdMap = new Map<string, string>();
      const mediaData = seedMedia.map((m) => {
        const newId = createId();
        mediaIdMap.set(m.id, newId);
        return {
          id: newId,
          sessionId: newSessionId,
          filename: m.filename,
          originalFilename: m.originalFilename,
          mimeType: m.mimeType,
          size: m.size,
          url: m.url,
          alt: m.alt,
          contentHash: m.contentHash,
          uploadedById: m.uploadedById
            ? (userIdMap.get(m.uploadedById) ?? null)
            : null,
        };
      });
      if (mediaData.length > 0) {
        await tx.media.createMany({ data: mediaData });
      }

      // ─── 4) SiteSettings ────────────────────────────────
      const seedSettings = await tx.siteSettings.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const settingsData = seedSettings.map((s) => ({
        id: createId(),
        sessionId: newSessionId,
        key: s.key,
        value: s.value,
        description: s.description,
      }));
      if (settingsData.length > 0) {
        await tx.siteSettings.createMany({ data: settingsData });
      }

      // ─── 5) NavigationMenu ──────────────────────────────
      const seedMenus = await tx.navigationMenu.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const menuIdMap = new Map<string, string>();
      const menuData = seedMenus.map((m) => {
        const newId = createId();
        menuIdMap.set(m.id, newId);
        return {
          id: newId,
          sessionId: newSessionId,
          name: m.name,
          description: m.description,
          slots: m.slots,
        };
      });
      if (menuData.length > 0) {
        await tx.navigationMenu.createMany({ data: menuData });
      }

      // ─── 6) Board ───────────────────────────────────────
      const seedBoards = await tx.board.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const boardIdMap = new Map<string, string>();
      const boardData = seedBoards.map((b) => {
        const newId = createId();
        boardIdMap.set(b.id, newId);
        return {
          id: newId,
          sessionId: newSessionId,
          name: b.name,
          slug: b.slug,
          description: b.description,
          skinType: b.skinType,
          isPublic: b.isPublic,
          displayOrder: b.displayOrder,
        };
      });
      if (boardData.length > 0) {
        await tx.board.createMany({ data: boardData });
      }

      // ─── 7) HomeSection ─────────────────────────────────
      const seedSections = await tx.homeSection.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const sectionData = seedSections.map((s) => ({
        id: createId(),
        sessionId: newSessionId,
        sectionType: s.sectionType,
        title: s.title,
        configJson: s.configJson as Prisma.InputJsonValue,
        isVisible: s.isVisible,
        displayOrder: s.displayOrder,
      }));
      if (sectionData.length > 0) {
        await tx.homeSection.createMany({ data: sectionData });
      }

      // ─── 8) Subpage ─────────────────────────────────────
      const seedSubpages = await tx.subpage.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const subpageIdMap = new Map<string, string>();
      const subpageData = seedSubpages.map((sp) => {
        const newId = createId();
        subpageIdMap.set(sp.id, newId);
        return {
          id: newId,
          sessionId: newSessionId,
          title: sp.title,
          slug: sp.slug,
          seoTitle: sp.seoTitle,
          seoDescription: sp.seoDescription,
          content: sp.content,
          status: sp.status,
          publishedAt: sp.publishedAt,
          featuredImageId: sp.featuredImageId
            ? (mediaIdMap.get(sp.featuredImageId) ?? null)
            : null,
          cclType: sp.cclType,
          cclAi: sp.cclAi,
          feedbackEnabled: sp.feedbackEnabled,
          displayOrder: sp.displayOrder,
          revision: sp.revision,
        };
      });
      if (subpageData.length > 0) {
        await tx.subpage.createMany({ data: subpageData });
      }

      // ─── 9) Post ────────────────────────────────────────
      const seedPosts = await tx.post.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const postData = seedPosts
        .map((p) => {
          const newBoardId = boardIdMap.get(p.boardId);
          if (!newBoardId) return null; // 데이터 무결성 깨졌을 때 skip
          return {
            id: createId(),
            sessionId: newSessionId,
            title: p.title,
            slug: p.slug,
            boardId: newBoardId,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            contentJson:
              (p.contentJson as Prisma.InputJsonValue | null) ??
              Prisma.JsonNull,
            content: p.content,
            status: p.status,
            isImportant: p.isImportant,
            publishedAt: p.publishedAt,
            featuredImageId: p.featuredImageId
              ? (mediaIdMap.get(p.featuredImageId) ?? null)
              : null,
            authorId: p.authorId ? (userIdMap.get(p.authorId) ?? null) : null,
            displayOrder: p.displayOrder,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
      if (postData.length > 0) {
        await tx.post.createMany({ data: postData });
      }

      // ─── 10) PageBlock ──────────────────────────────────
      const seedBlocks = await tx.pageBlock.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const blockData = seedBlocks
        .map((b) => {
          const newSubpageId = subpageIdMap.get(b.subpageId);
          if (!newSubpageId) return null;
          return {
            id: createId(),
            sessionId: newSessionId,
            subpageId: newSubpageId,
            blockType: b.blockType,
            configJson: b.configJson as Prisma.InputJsonValue,
            isVisible: b.isVisible,
            displayOrder: b.displayOrder,
          };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);
      if (blockData.length > 0) {
        await tx.pageBlock.createMany({ data: blockData });
      }

      // ─── 11) HomePopup ──────────────────────────────────
      const seedPopups = await tx.homePopup.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const popupData = seedPopups.map((p) => ({
        id: createId(),
        sessionId: newSessionId,
        popupType: p.popupType,
        title: p.title,
        contentJson:
          (p.contentJson as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
        content: p.content,
        imageUrl: p.imageUrl,
        imageAlt: p.imageAlt,
        imageMediaId: p.imageMediaId
          ? (mediaIdMap.get(p.imageMediaId) ?? null)
          : null,
        linkUrl: p.linkUrl,
        buttonLabel: p.buttonLabel,
        isVisible: p.isVisible,
        displayOrder: p.displayOrder,
        startDate: p.startDate,
        endDate: p.endDate,
      }));
      if (popupData.length > 0) {
        await tx.homePopup.createMany({ data: popupData });
      }

      // ─── 12) NavigationMenuItem (2-pass: parentId 자기참조) ───
      const seedItems = await tx.navigationMenuItem.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const itemIdMap = new Map<string, string>();
      const itemDataPass1 = seedItems
        .map((i) => {
          const newMenuId = menuIdMap.get(i.menuId);
          if (!newMenuId) return null;
          const newId = createId();
          itemIdMap.set(i.id, newId);
          return {
            id: newId,
            sessionId: newSessionId,
            menuId: newMenuId,
            parentId: null, // 2-pass: 1차에서 null, 2차 update로 채움
            label: i.label,
            itemType: i.itemType,
            subpageId: i.subpageId
              ? (subpageIdMap.get(i.subpageId) ?? null)
              : null,
            boardId: i.boardId ? (boardIdMap.get(i.boardId) ?? null) : null,
            url: i.url,
            isVisible: i.isVisible,
            openInNewTab: i.openInNewTab,
            displayOrder: i.displayOrder,
            startDate: i.startDate,
            endDate: i.endDate,
          };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);
      if (itemDataPass1.length > 0) {
        await tx.navigationMenuItem.createMany({ data: itemDataPass1 });
      }
      // 2차 pass: parentId 채우기
      for (const seed of seedItems) {
        if (!seed.parentId) continue;
        const newId = itemIdMap.get(seed.id);
        const newParentId = itemIdMap.get(seed.parentId);
        if (!newId || !newParentId) continue; // 데이터 무결성 깨졌을 때 skip
        await tx.navigationMenuItem.update({
          where: { id: newId },
          data: { parentId: newParentId },
        });
      }

      // ─── 13) SubpageVersion ─────────────────────────────
      // 알려진 한계: snapshot Json 내부의 mediaId/blockId는 walker 미적용 → __SEED__-era id 잔존.
      // 시연 사용자가 옛 버전 복원 시 image 등이 dangling 될 수 있음 (PR9 walker 도입 시 일괄 처리).
      const seedVersions = await tx.subpageVersion.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const versionData = seedVersions
        .map((v) => {
          const newSubpageId = subpageIdMap.get(v.subpageId);
          if (!newSubpageId) return null;
          return {
            id: createId(),
            sessionId: newSessionId,
            subpageId: newSubpageId,
            createdById: v.createdById
              ? (userIdMap.get(v.createdById) ?? null)
              : null,
            label: v.label,
            snapshot: v.snapshot as Prisma.InputJsonValue,
            isPinned: v.isPinned,
            sourceAction: v.sourceAction,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
      if (versionData.length > 0) {
        await tx.subpageVersion.createMany({ data: versionData });
      }

      // ─── 14) SubpageFeedback ────────────────────────────
      const seedFeedback = await tx.subpageFeedback.findMany({
        where: { sessionId: SEED_SENTINEL },
        orderBy: { id: 'asc' },
      });
      const feedbackData = seedFeedback
        .map((f) => {
          const newSubpageId = subpageIdMap.get(f.subpageId);
          if (!newSubpageId) return null;
          return {
            id: createId(),
            sessionId: newSessionId,
            subpageId: newSubpageId,
            rating: f.rating,
            positiveReasons: f.positiveReasons,
            comment: f.comment,
            ipAddressHash: f.ipAddressHash,
            userAgent: f.userAgent,
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);
      if (feedbackData.length > 0) {
        await tx.subpageFeedback.createMany({ data: feedbackData });
      }

      const stats: CloneStats = {
        Role: roleData.length,
        User: userData.length,
        Media: mediaData.length,
        SiteSettings: settingsData.length,
        NavigationMenu: menuData.length,
        Board: boardData.length,
        HomeSection: sectionData.length,
        Subpage: subpageData.length,
        Post: postData.length,
        PageBlock: blockData.length,
        HomePopup: popupData.length,
        NavigationMenuItem: itemDataPass1.length,
        SubpageVersion: versionData.length,
        SubpageFeedback: feedbackData.length,
      };

      return { stats, demoAdminId };
    },
    { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS },
  );
}
