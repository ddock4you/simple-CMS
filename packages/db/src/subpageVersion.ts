/**
 * SubpageVersion 헬퍼 (Stage 7m — 서브페이지 버전 관리).
 *
 * - 스냅샷 생성/복원은 이 파일에 모아 트랜잭션 일관성을 확보한다.
 * - `recalculateSubpageContent`(PGroonga 검색 인덱스 재집계)는 admin 레이어에서 별도 호출한다.
 *   packages/db가 packages/editor에 의존하지 않도록 분리하며, 블록 CUD와 동일한 2단계 패턴을 따른다.
 */

import type {
  PageBlock,
  Prisma,
  Subpage,
  SubpageVersion,
  SubpageVersionSource,
} from './generated/prisma/client';

import { prisma } from './client';

export class RevisionMismatchError extends Error {
  readonly code = 'REVISION_MISMATCH';
  readonly currentRevision: number;
  readonly expectedRevision: number;
  constructor(currentRevision: number, expectedRevision: number) {
    super(
      `Subpage revision mismatch: expected ${expectedRevision}, current ${currentRevision}`,
    );
    this.name = 'RevisionMismatchError';
    this.currentRevision = currentRevision;
    this.expectedRevision = expectedRevision;
  }
}

export class SubpageVersionNotFoundError extends Error {
  readonly code = 'VERSION_NOT_FOUND';
  constructor(versionId: string) {
    super(`Subpage version ${versionId} not found`);
    this.name = 'SubpageVersionNotFoundError';
  }
}

export class SubpageVersionSlugConflictError extends Error {
  readonly code = 'VERSION_SLUG_CONFLICT';
  readonly conflictingSlug: string;
  constructor(slug: string) {
    super(`Slug '${slug}' is already used by another Subpage`);
    this.name = 'SubpageVersionSlugConflictError';
    this.conflictingSlug = slug;
  }
}

export const SUBPAGE_VERSION_RETENTION_LIMIT = 30;

type SubpageVersionStatusStrategy = 'KEEP_CURRENT' | 'APPLY_VERSION';

interface SnapshotMeta {
  title: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  cclType:
    | 'TYPE_0'
    | 'TYPE_1'
    | 'TYPE_2'
    | 'TYPE_3'
    | 'TYPE_4'
    | null;
  cclAi: boolean;
  feedbackEnabled: boolean;
  featuredImageId: string | null;
  displayOrder: number;
}

interface SnapshotBlock {
  blockType: 'RICH_TEXT' | 'HTML' | 'IMAGE' | 'IFRAME';
  configJson: unknown;
  isVisible: boolean;
  displayOrder: number;
}

export interface SubpageSnapshotPayload {
  meta: SnapshotMeta;
  blocks: SnapshotBlock[];
}

export interface CreateSubpageVersionSnapshotInput {
  subpageId: string;
  createdById: string | null;
  label?: string | null;
  sourceAction: SubpageVersionSource;
  /** 이미 열린 트랜잭션에 참여할 때 전달. 미지정 시 자체 트랜잭션 생성. */
  tx?: Prisma.TransactionClient;
}

export interface RestoreSubpageFromVersionInput {
  subpageId: string;
  versionId: string;
  actorId: string | null;
  expectedRevision: number;
  statusStrategy?: SubpageVersionStatusStrategy;
}

export interface RestoreSubpageFromVersionResult {
  newRevision: number;
  preRollbackVersionId: string;
  restoredVersion: SubpageVersion;
}

/**
 * 현재 Subpage + blocks 스냅샷을 SubpageVersion 레코드로 저장하고 보존 정책을 적용한다.
 * `tx`가 주어지면 그 트랜잭션 내부에서 실행한다.
 */
export async function createSubpageVersionSnapshot(
  input: CreateSubpageVersionSnapshotInput,
): Promise<SubpageVersion> {
  const { subpageId, createdById, label, sourceAction } = input;
  const run = async (client: Prisma.TransactionClient): Promise<SubpageVersion> => {
    const subpage = await client.subpage.findUnique({
      where: { id: subpageId },
      include: { blocks: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!subpage) {
      throw new Error(`Subpage ${subpageId} not found`);
    }

    const snapshot = buildSnapshotPayload(subpage, subpage.blocks);

    const created = await client.subpageVersion.create({
      data: {
        subpageId,
        createdById,
        label: normalizeLabel(label),
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        sourceAction,
      },
    });

    await enforceRetention(client, subpageId, SUBPAGE_VERSION_RETENTION_LIMIT);

    return created;
  };

  if (input.tx) return run(input.tx);
  return prisma.$transaction((tx) => run(tx));
}

/**
 * 특정 버전으로 Subpage를 복원한다.
 *
 * 트랜잭션 단계:
 * 1. 현재 subpage + revision 조회 (낙관 락 검사)
 * 2. 현재 상태를 `PRE_ROLLBACK` 버전으로 자동 저장 (label=null, 시스템 맥락은 sourceAction으로 파생)
 * 3. slug 충돌 확인 (다른 Subpage가 이미 차지하고 있으면 throw)
 * 4. Subpage 메타 덮어쓰기 + revision++
 * 5. 기존 PageBlock 전체 삭제 → 스냅샷 blocks 재생성 (id는 새 cuid)
 *
 * 검색용 `Subpage.content`(PGroonga plain text)는 caller가 블록 CUD와 동일하게
 * `recalculateSubpageContent`를 별도 호출한다.
 */
export async function restoreSubpageFromVersion(
  input: RestoreSubpageFromVersionInput,
): Promise<RestoreSubpageFromVersionResult> {
  const {
    subpageId,
    versionId,
    actorId,
    expectedRevision,
    statusStrategy = 'KEEP_CURRENT',
  } = input;

  return prisma.$transaction(async (tx) => {
    const current = await tx.subpage.findUnique({
      where: { id: subpageId },
      include: { blocks: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!current) {
      throw new Error(`Subpage ${subpageId} not found`);
    }
    if (current.revision !== expectedRevision) {
      throw new RevisionMismatchError(current.revision, expectedRevision);
    }

    const target = await tx.subpageVersion.findUnique({
      where: { id: versionId },
    });
    if (!target || target.subpageId !== subpageId) {
      throw new SubpageVersionNotFoundError(versionId);
    }
    const targetSnapshot = target.snapshot as unknown as SubpageSnapshotPayload;

    // 1. 현재 상태를 PRE_ROLLBACK 스냅샷으로 백업
    const preRollback = await createSubpageVersionSnapshot({
      subpageId,
      createdById: actorId,
      label: null,
      sourceAction: 'PRE_ROLLBACK',
      tx,
    });

    // 2. slug 충돌 검사
    if (targetSnapshot.meta.slug !== current.slug) {
      const existing = await tx.subpage.findFirst({
        where: { slug: targetSnapshot.meta.slug },
      });
      if (existing && existing.id !== subpageId) {
        throw new SubpageVersionSlugConflictError(targetSnapshot.meta.slug);
      }
    }

    // 3. 상태/발행일 계산
    const newStatus =
      statusStrategy === 'APPLY_VERSION'
        ? targetSnapshot.meta.status
        : current.status;
    const newPublishedAt =
      newStatus === 'PUBLISHED' && current.status !== 'PUBLISHED'
        ? new Date()
        : newStatus === 'DRAFT'
        ? null
        : current.publishedAt;

    // 4. Subpage 덮어쓰기 + revision++
    await tx.subpage.update({
      where: { id: subpageId },
      data: {
        title: targetSnapshot.meta.title,
        slug: targetSnapshot.meta.slug,
        seoTitle: targetSnapshot.meta.seoTitle,
        seoDescription: targetSnapshot.meta.seoDescription,
        status: newStatus,
        publishedAt: newPublishedAt,
        cclType: targetSnapshot.meta.cclType,
        cclAi: targetSnapshot.meta.cclAi,
        feedbackEnabled: targetSnapshot.meta.feedbackEnabled ?? false,
        featuredImageId: targetSnapshot.meta.featuredImageId,
        displayOrder: targetSnapshot.meta.displayOrder,
        revision: { increment: 1 },
      },
    });

    // 5. 블록 재구성
    await tx.pageBlock.deleteMany({ where: { subpageId } });
    if (targetSnapshot.blocks.length > 0) {
      await tx.pageBlock.createMany({
        data: targetSnapshot.blocks.map((b) => ({
          subpageId,
          blockType: b.blockType,
          configJson: b.configJson as Prisma.InputJsonValue,
          isVisible: b.isVisible,
          displayOrder: b.displayOrder,
        })),
      });
    }

    return {
      newRevision: current.revision + 1,
      preRollbackVersionId: preRollback.id,
      restoredVersion: target,
    };
  });
}

/**
 * 스냅샷에 포함된 Media ID 중 현재 `Media` 테이블에 없는 것(dangling)을 반환한다.
 * RICH_TEXT 블록의 Tiptap JSON 내 image 노드 `attrs.mediaId` + IMAGE 블록 `imageMediaId`를 모두 수집.
 */
export async function findDanglingMediaIds(
  snapshot: SubpageSnapshotPayload,
): Promise<string[]> {
  const mediaIds = collectMediaIdsFromSnapshot(snapshot);
  if (mediaIds.length === 0) return [];

  const existing = await prisma.media.findMany({
    where: { id: { in: mediaIds } },
    select: { id: true },
  });
  const existingSet = new Set(existing.map((m) => m.id));

  const dangling = new Set<string>();
  for (const id of mediaIds) {
    if (!existingSet.has(id)) dangling.add(id);
  }
  return Array.from(dangling);
}

// ─── Internal helpers ─────────────────────────────────────

function buildSnapshotPayload(
  subpage: Subpage,
  blocks: PageBlock[],
): SubpageSnapshotPayload {
  return {
    meta: {
      title: subpage.title,
      slug: subpage.slug,
      seoTitle: subpage.seoTitle,
      seoDescription: subpage.seoDescription,
      status: subpage.status,
      cclType: subpage.cclType,
      cclAi: subpage.cclAi,
      feedbackEnabled: subpage.feedbackEnabled,
      featuredImageId: subpage.featuredImageId,
      displayOrder: subpage.displayOrder,
    },
    blocks: blocks.map((b) => ({
      blockType: b.blockType,
      configJson: b.configJson as unknown,
      isVisible: b.isVisible,
      displayOrder: b.displayOrder,
    })),
  };
}

export function normalizeLabel(
  label: string | null | undefined,
): string | null {
  if (label == null) return null;
  const trimmed = label.trim();
  if (!trimmed) return null;
  return trimmed;
}

async function enforceRetention(
  tx: Prisma.TransactionClient,
  subpageId: string,
  limit: number,
): Promise<void> {
  const nonPinnedCount = await tx.subpageVersion.count({
    where: { subpageId, isPinned: false },
  });
  if (nonPinnedCount <= limit) return;

  const excess = nonPinnedCount - limit;
  const oldest = await tx.subpageVersion.findMany({
    where: { subpageId, isPinned: false },
    orderBy: { createdAt: 'asc' },
    take: excess,
    select: { id: true },
  });
  if (oldest.length === 0) return;

  await tx.subpageVersion.deleteMany({
    where: { id: { in: oldest.map((v) => v.id) } },
  });
}

export function collectMediaIdsFromSnapshot(
  snapshot: SubpageSnapshotPayload,
): string[] {
  const ids: string[] = [];
  for (const block of snapshot.blocks) {
    if (block.blockType === 'IMAGE') {
      const cfg = block.configJson as {
        imageMediaId?: string | null;
        items?: Array<{ imageMediaId?: string | null }>;
      } | null;
      if (cfg && typeof cfg.imageMediaId === 'string') {
        ids.push(cfg.imageMediaId);
      }
      if (Array.isArray(cfg?.items)) {
        for (const item of cfg.items) {
          if (typeof item.imageMediaId === 'string') ids.push(item.imageMediaId);
        }
      }
    } else if (block.blockType === 'RICH_TEXT') {
      const cfg = block.configJson as { contentJson?: unknown } | null;
      if (cfg?.contentJson) {
        ids.push(...collectMediaIdsFromTiptapNode(cfg.contentJson));
      }
    }
  }
  return ids;
}

export function collectMediaIdsFromTiptapNode(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as {
    type?: string;
    attrs?: { mediaId?: unknown };
    content?: unknown;
  };
  const ids: string[] = [];
  if (n.type === 'image' && typeof n.attrs?.mediaId === 'string') {
    ids.push(n.attrs.mediaId);
  }
  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      ids.push(...collectMediaIdsFromTiptapNode(child));
    }
  }
  return ids;
}
