import { Prisma } from '../../generated/prisma/client';

import { SeedNotFoundError } from '../SeedNotFoundError';
import { SEED_SENTINEL } from '../sessionContext';
import {
  remapHomePopupContentJsonReferences,
  remapHomeSectionJsonReferences,
  remapPageBlockConfigJsonReferences,
  remapPostContentJsonReferences,
  remapSiteSettingValueReferences,
  remapSubpageVersionSnapshotJsonReferences,
} from '../snapshotWalker';

import { DEMO_ADMIN_USERNAME } from './constants';
import {
  createSeedCloneIdMaps,
  getOrCreateSeedCloneId,
  getSeedCloneId,
} from './idMaps';
import type { CloneResult, CloneStats } from './types';

function cloneJson<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return structuredClone(value);
}

function normalizeSeedMediaUrl(url: string, filename: string): string {
  if (
    process.env.DEMO_MODE !== 'true' ||
    process.env.STORAGE_PROVIDER !== 'supabase' ||
    /^(https?:)?\/\//i.test(url)
  ) {
    return url;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads';
  if (!supabaseUrl) return url;

  const localMatch = url.match(/^\/+uploads\/([a-z0-9-]+)\//i);
  const category = localMatch?.[1];
  if (!category) return url;

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${SEED_SENTINEL}/${category}/${filename}`;
}

export async function cloneSeedRows(
  tx: Prisma.TransactionClient,
  newSessionId: string,
): Promise<CloneResult> {
  const idMaps = createSeedCloneIdMaps();

  // ─── 1) Role ────────────────────────────────────────
  const seedRoles = await tx.role.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  if (seedRoles.length === 0) {
    throw new SeedNotFoundError();
  }
  const roleData = seedRoles.map((r) => ({
    id: getOrCreateSeedCloneId(idMaps, 'Role', r.id),
    sessionId: newSessionId,
    name: r.name,
    description: r.description,
    permissions: r.permissions as Prisma.InputJsonValue,
    isSystem: r.isSystem,
    isDefault: r.isDefault,
  }));
  await tx.role.createMany({ data: roleData });

  // ─── 2) User ────────────────────────────────────────
  const seedUsers = await tx.user.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  const userData = seedUsers.map((u) => ({
    id: getOrCreateSeedCloneId(idMaps, 'User', u.id),
    sessionId: newSessionId,
    username: u.username,
    password: u.password,
    email: u.email,
    name: u.name,
    status: u.status,
    roleId: getSeedCloneId(idMaps, 'Role', u.roleId),
  }));
  if (userData.length > 0) {
    await tx.user.createMany({ data: userData });
  }

  const demoAdminSeed = seedUsers.find(
    (u) => u.username === DEMO_ADMIN_USERNAME,
  );
  if (!demoAdminSeed) {
    throw new SeedNotFoundError(
      `시연 모드 seed에 username='${DEMO_ADMIN_USERNAME}' User가 없습니다.`,
    );
  }
  const demoAdminId = getSeedCloneId(idMaps, 'User', demoAdminSeed.id);
  if (!demoAdminId) {
    throw new SeedNotFoundError(
      `Demo admin id remap 실패: ${demoAdminSeed.id}`,
    );
  }

  // ─── 3) Media ───────────────────────────────────────
  const seedMedia = await tx.media.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  const mediaUrlMap = new Map<string, string>();
  const mediaData = seedMedia.map((m) => {
    const newId = getOrCreateSeedCloneId(idMaps, 'Media', m.id);
    const url = normalizeSeedMediaUrl(m.url, m.filename);
    mediaUrlMap.set(m.id, url);
    return {
      id: newId,
      sessionId: newSessionId,
      filename: m.filename,
      originalFilename: m.originalFilename,
      mimeType: m.mimeType,
      size: m.size,
      url,
      alt: m.alt,
      contentHash: m.contentHash,
      uploadedById: getSeedCloneId(idMaps, 'User', m.uploadedById),
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
    id: getOrCreateSeedCloneId(idMaps, 'SiteSettings', s.id),
    sessionId: newSessionId,
    key: s.key,
    value: remapSiteSettingValueReferences(s.key, s.value, idMaps.Media),
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
  const menuData = seedMenus.map((m) => ({
    id: getOrCreateSeedCloneId(idMaps, 'NavigationMenu', m.id),
    sessionId: newSessionId,
    name: m.name,
    description: m.description,
    slots: m.slots,
  }));
  if (menuData.length > 0) {
    await tx.navigationMenu.createMany({ data: menuData });
  }

  // ─── 6) Board ───────────────────────────────────────
  const seedBoards = await tx.board.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  const boardData = seedBoards.map((b) => ({
    id: getOrCreateSeedCloneId(idMaps, 'Board', b.id),
    sessionId: newSessionId,
    name: b.name,
    slug: b.slug,
    description: b.description,
    skinType: b.skinType,
    isPublic: b.isPublic,
    displayOrder: b.displayOrder,
  }));
  if (boardData.length > 0) {
    await tx.board.createMany({ data: boardData });
  }

  // ─── 7) Subpage ─────────────────────────────────────
  const seedSubpages = await tx.subpage.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  const subpageData = seedSubpages.map((sp) => ({
    id: getOrCreateSeedCloneId(idMaps, 'Subpage', sp.id),
    sessionId: newSessionId,
    title: sp.title,
    slug: sp.slug,
    seoTitle: sp.seoTitle,
    seoDescription: sp.seoDescription,
    content: sp.content,
    status: sp.status,
    publishedAt: sp.publishedAt,
    featuredImageId: getSeedCloneId(idMaps, 'Media', sp.featuredImageId),
    cclType: sp.cclType,
    cclAi: sp.cclAi,
    feedbackEnabled: sp.feedbackEnabled,
    displayOrder: sp.displayOrder,
    revision: sp.revision,
  }));
  if (subpageData.length > 0) {
    await tx.subpage.createMany({ data: subpageData });
  }

  // ─── 8) HomeSection ─────────────────────────────────
  const seedSections = await tx.homeSection.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  const sectionData = seedSections.map((s) => {
    const configJson = cloneJson(s.configJson);
    remapHomeSectionJsonReferences(
      s.sectionType,
      configJson,
      idMaps.Media,
      idMaps.Board,
      idMaps.Subpage,
      mediaUrlMap,
    );

    return {
      id: getOrCreateSeedCloneId(idMaps, 'HomeSection', s.id),
      sessionId: newSessionId,
      sectionType: s.sectionType,
      title: s.title,
      configJson: configJson as Prisma.InputJsonValue,
      isVisible: s.isVisible,
      displayOrder: s.displayOrder,
    };
  });
  if (sectionData.length > 0) {
    await tx.homeSection.createMany({ data: sectionData });
  }

  // ─── 9) Post ────────────────────────────────────────
  const seedPosts = await tx.post.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  const postData = seedPosts
    .map((p) => {
      const newBoardId = getSeedCloneId(idMaps, 'Board', p.boardId);
      if (!newBoardId) return null; // 데이터 무결성 깨졌을 때 skip
      const contentJson = cloneJson(p.contentJson);
      remapPostContentJsonReferences(contentJson, idMaps.Media, mediaUrlMap);

      return {
        id: getOrCreateSeedCloneId(idMaps, 'Post', p.id),
        sessionId: newSessionId,
        title: p.title,
        slug: p.slug,
        boardId: newBoardId,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        contentJson:
          (contentJson as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
        content: p.content,
        status: p.status,
        isImportant: p.isImportant,
        publishedAt: p.publishedAt,
        featuredImageId: getSeedCloneId(idMaps, 'Media', p.featuredImageId),
        authorId: getSeedCloneId(idMaps, 'User', p.authorId),
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
      const newSubpageId = getSeedCloneId(idMaps, 'Subpage', b.subpageId);
      if (!newSubpageId) return null;
      const configJson = cloneJson(b.configJson);
      remapPageBlockConfigJsonReferences(
        b.blockType,
        configJson,
        idMaps.Media,
        mediaUrlMap,
      );

      return {
        id: getOrCreateSeedCloneId(idMaps, 'PageBlock', b.id),
        sessionId: newSessionId,
        subpageId: newSubpageId,
        blockType: b.blockType,
        configJson: configJson as Prisma.InputJsonValue,
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
  const popupData = seedPopups.map((p) => {
    const contentJson = cloneJson(p.contentJson);
    remapHomePopupContentJsonReferences(
      p.popupType,
      contentJson,
      idMaps.Media,
      mediaUrlMap,
    );
    const imageUrl =
      p.imageMediaId && p.imageUrl
        ? (mediaUrlMap.get(p.imageMediaId) ?? p.imageUrl)
        : p.imageUrl;

    return {
      id: getOrCreateSeedCloneId(idMaps, 'HomePopup', p.id),
      sessionId: newSessionId,
      popupType: p.popupType,
      title: p.title,
      contentJson:
        (contentJson as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
      content: p.content,
      imageUrl,
      imageAlt: p.imageAlt,
      imageMediaId: getSeedCloneId(idMaps, 'Media', p.imageMediaId),
      linkUrl: p.linkUrl,
      buttonLabel: p.buttonLabel,
      isVisible: p.isVisible,
      displayOrder: p.displayOrder,
      startDate: p.startDate,
      endDate: p.endDate,
    };
  });
  if (popupData.length > 0) {
    await tx.homePopup.createMany({ data: popupData });
  }

  // ─── 12) NavigationMenuItem (2-pass: parentId 자기참조) ───
  const seedItems = await tx.navigationMenuItem.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  const itemDataPass1 = seedItems
    .map((i) => {
      const newMenuId = getSeedCloneId(idMaps, 'NavigationMenu', i.menuId);
      if (!newMenuId) return null;
      return {
        id: getOrCreateSeedCloneId(idMaps, 'NavigationMenuItem', i.id),
        sessionId: newSessionId,
        menuId: newMenuId,
        parentId: null,
        label: i.label,
        itemType: i.itemType,
        subpageId: getSeedCloneId(idMaps, 'Subpage', i.subpageId),
        boardId: getSeedCloneId(idMaps, 'Board', i.boardId),
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
  for (const seed of seedItems) {
    if (!seed.parentId) continue;
    const newId = getSeedCloneId(idMaps, 'NavigationMenuItem', seed.id);
    const newParentId = getSeedCloneId(
      idMaps,
      'NavigationMenuItem',
      seed.parentId,
    );
    if (!newId || !newParentId) continue;
    await tx.navigationMenuItem.update({
      where: { id: newId },
      data: { parentId: newParentId },
    });
  }

  // ─── 13) SubpageVersion ─────────────────────────────
  const seedVersions = await tx.subpageVersion.findMany({
    where: { sessionId: SEED_SENTINEL },
    orderBy: { id: 'asc' },
  });
  const versionData = seedVersions
    .map((v) => {
      const newSubpageId = getSeedCloneId(idMaps, 'Subpage', v.subpageId);
      if (!newSubpageId) return null;
      const snapshot = cloneJson(v.snapshot);
      remapSubpageVersionSnapshotJsonReferences(
        snapshot,
        idMaps.Media,
        mediaUrlMap,
      );

      return {
        id: getOrCreateSeedCloneId(idMaps, 'SubpageVersion', v.id),
        sessionId: newSessionId,
        subpageId: newSubpageId,
        createdById: getSeedCloneId(idMaps, 'User', v.createdById),
        label: v.label,
        snapshot: snapshot as Prisma.InputJsonValue,
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
      const newSubpageId = getSeedCloneId(idMaps, 'Subpage', f.subpageId);
      if (!newSubpageId) return null;
      return {
        id: getOrCreateSeedCloneId(idMaps, 'SubpageFeedback', f.id),
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

  const stats = {
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
  } satisfies CloneStats;

  return { stats, demoAdminId };
}
