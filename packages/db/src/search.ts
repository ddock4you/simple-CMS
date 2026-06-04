import { prisma } from './client';
import { getCurrentSessionId } from './demo/sessionContext';

const DEFAULT_PAGE_SIZE = 20;
const MAX_QUERY_LENGTH = 200;
const EXCERPT_LENGTH = 200;

export type SearchContentType = 'all' | 'subpage' | 'post';

export interface SearchResult {
  id: string;
  type: 'subpage' | 'post';
  title: string;
  excerpt: string | null;
  slug: string;
  publishedAt: Date | null;
  score: number;
  boardName: string | null;
  boardSlug: string | null;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  counts: Record<SearchContentType, number>;
  totalPages: number;
  page: number;
  pageSize: number;
  type: SearchContentType;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function searchContent(
  query: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  type: SearchContentType = 'all',
): Promise<SearchResponse> {
  const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
  const emptyResponse = {
    items: [],
    total: 0,
    counts: { all: 0, subpage: 0, post: 0 },
    totalPages: 0,
    page,
    pageSize,
    type,
  } satisfies SearchResponse;

  if (!trimmed) {
    return emptyResponse;
  }

  const offset = (page - 1) * pageSize;

  // 시연 모드(DEMO_MODE) 격리: $queryRaw는 Prisma extension의 query hook을 거치지 않으므로
  // 여기서 명시적으로 sessionId WHERE를 추가한다. 운영 환경은 모두 '__PROD__'라 동작 동일.
  // Subpage·Post·Board JOIN 양쪽 모두 같은 sessionId여야 cross-tenant 누설 차단.
  const sessionId = getCurrentSessionId();

  try {
    const itemQuery =
      type === 'subpage'
        ? prisma.$queryRaw<SearchResult[]>`
          SELECT
            s.id,
            'subpage'::text AS type,
            s.title,
            LEFT(s.content, ${EXCERPT_LENGTH}) AS excerpt,
            s.slug,
            s."publishedAt",
            pgroonga_score(s.tableoid, s.ctid) AS score,
            NULL::text AS "boardName",
            NULL::text AS "boardSlug"
          FROM "Subpage" s
          WHERE s.status = 'PUBLISHED'
            AND s."sessionId" = ${sessionId}
            AND (s.title &@~ ${trimmed} OR s.content &@~ ${trimmed})
          ORDER BY score DESC, "publishedAt" DESC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `
        : type === 'post'
          ? prisma.$queryRaw<SearchResult[]>`
            SELECT
              p.id,
              'post'::text AS type,
              p.title,
              LEFT(p.content, ${EXCERPT_LENGTH}) AS excerpt,
              p.slug,
              p."publishedAt",
              pgroonga_score(p.tableoid, p.ctid) AS score,
              b.name AS "boardName",
              b.slug AS "boardSlug"
            FROM "Post" p
            JOIN "Board" b ON b.id = p."boardId" AND b."sessionId" = ${sessionId}
            WHERE p.status = 'PUBLISHED'
              AND b."isPublic" = true
              AND p."sessionId" = ${sessionId}
              AND (p.title &@~ ${trimmed} OR p.content &@~ ${trimmed})
            ORDER BY score DESC, "publishedAt" DESC NULLS LAST
            LIMIT ${pageSize} OFFSET ${offset}
          `
          : prisma.$queryRaw<SearchResult[]>`
        (
          SELECT
            s.id,
            'subpage'::text AS type,
            s.title,
            LEFT(s.content, ${EXCERPT_LENGTH}) AS excerpt,
            s.slug,
            s."publishedAt",
            pgroonga_score(s.tableoid, s.ctid) AS score,
            NULL::text AS "boardName",
            NULL::text AS "boardSlug"
          FROM "Subpage" s
          WHERE s.status = 'PUBLISHED'
            AND s."sessionId" = ${sessionId}
            AND (s.title &@~ ${trimmed} OR s.content &@~ ${trimmed})
        )
        UNION ALL
        (
          SELECT
            p.id,
            'post'::text AS type,
            p.title,
            LEFT(p.content, ${EXCERPT_LENGTH}) AS excerpt,
            p.slug,
            p."publishedAt",
            pgroonga_score(p.tableoid, p.ctid) AS score,
            b.name AS "boardName",
            b.slug AS "boardSlug"
          FROM "Post" p
          JOIN "Board" b ON b.id = p."boardId" AND b."sessionId" = ${sessionId}
          WHERE p.status = 'PUBLISHED'
            AND b."isPublic" = true
            AND p."sessionId" = ${sessionId}
            AND (p.title &@~ ${trimmed} OR p.content &@~ ${trimmed})
        )
        ORDER BY score DESC, "publishedAt" DESC NULLS LAST
        LIMIT ${pageSize} OFFSET ${offset}
      `;

    const [items, countResult] = await Promise.all([
      itemQuery,
      prisma.$queryRaw<[{ subpage: bigint; post: bigint; all: bigint }]>`
        SELECT
          (
            SELECT COUNT(*) FROM "Subpage" s
            WHERE s.status = 'PUBLISHED'
              AND s."sessionId" = ${sessionId}
              AND (s.title &@~ ${trimmed} OR s.content &@~ ${trimmed})
          ) AS subpage,
          (
            SELECT COUNT(*) FROM "Post" p
            JOIN "Board" b ON b.id = p."boardId" AND b."sessionId" = ${sessionId}
            WHERE p.status = 'PUBLISHED'
              AND b."isPublic" = true
              AND p."sessionId" = ${sessionId}
              AND (p.title &@~ ${trimmed} OR p.content &@~ ${trimmed})
          ) AS post,
          (
            (
              SELECT COUNT(*) FROM "Subpage" s
              WHERE s.status = 'PUBLISHED'
                AND s."sessionId" = ${sessionId}
                AND (s.title &@~ ${trimmed} OR s.content &@~ ${trimmed})
            ) + (
              SELECT COUNT(*) FROM "Post" p
              JOIN "Board" b ON b.id = p."boardId" AND b."sessionId" = ${sessionId}
              WHERE p.status = 'PUBLISHED'
                AND b."isPublic" = true
                AND p."sessionId" = ${sessionId}
                AND (p.title &@~ ${trimmed} OR p.content &@~ ${trimmed})
            )
          ) AS all
      `,
    ]);

    const counts = {
      all: Number(countResult[0]?.all ?? 0),
      subpage: Number(countResult[0]?.subpage ?? 0),
      post: Number(countResult[0]?.post ?? 0),
    } satisfies Record<SearchContentType, number>;

    if (counts.all === 0) {
      return searchContentFallback(trimmed, page, pageSize, type, sessionId);
    }

    const total = counts[type];

    return {
      items,
      total,
      counts,
      totalPages: Math.ceil(total / pageSize),
      page,
      pageSize,
      type,
    };
  } catch (error) {
    console.error('Search query failed:', error);
    try {
      return await searchContentFallback(
        trimmed,
        page,
        pageSize,
        type,
        sessionId,
      );
    } catch (fallbackError) {
      console.error('Search fallback query failed:', fallbackError);
      return emptyResponse;
    }
  }
}

async function searchContentFallback(
  trimmed: string,
  page: number,
  pageSize: number,
  type: SearchContentType,
  sessionId: string,
): Promise<SearchResponse> {
  const offset = (page - 1) * pageSize;
  const pattern = `%${escapeLikePattern(trimmed)}%`;
  const likeEscape = '\\';

  const itemQuery =
    type === 'subpage'
      ? prisma.$queryRaw<SearchResult[]>`
        SELECT
          s.id,
          'subpage'::text AS type,
          s.title,
          LEFT(COALESCE(s.content, ''), ${EXCERPT_LENGTH}) AS excerpt,
          s.slug,
          s."publishedAt",
          CASE WHEN s.title ILIKE ${pattern} ESCAPE ${likeEscape} THEN 2 ELSE 1 END::double precision AS score,
          NULL::text AS "boardName",
          NULL::text AS "boardSlug"
        FROM "Subpage" s
        WHERE s.status = 'PUBLISHED'
          AND s."sessionId" = ${sessionId}
          AND (s.title ILIKE ${pattern} ESCAPE ${likeEscape} OR COALESCE(s.content, '') ILIKE ${pattern} ESCAPE ${likeEscape})
        ORDER BY score DESC, "publishedAt" DESC NULLS LAST
        LIMIT ${pageSize} OFFSET ${offset}
      `
      : type === 'post'
        ? prisma.$queryRaw<SearchResult[]>`
          SELECT
            p.id,
            'post'::text AS type,
            p.title,
            LEFT(COALESCE(p.content, ''), ${EXCERPT_LENGTH}) AS excerpt,
            p.slug,
            p."publishedAt",
            CASE WHEN p.title ILIKE ${pattern} ESCAPE ${likeEscape} THEN 2 ELSE 1 END::double precision AS score,
            b.name AS "boardName",
            b.slug AS "boardSlug"
          FROM "Post" p
          JOIN "Board" b ON b.id = p."boardId" AND b."sessionId" = ${sessionId}
          WHERE p.status = 'PUBLISHED'
            AND b."isPublic" = true
            AND p."sessionId" = ${sessionId}
            AND (p.title ILIKE ${pattern} ESCAPE ${likeEscape} OR COALESCE(p.content, '') ILIKE ${pattern} ESCAPE ${likeEscape})
          ORDER BY score DESC, "publishedAt" DESC NULLS LAST
          LIMIT ${pageSize} OFFSET ${offset}
        `
        : prisma.$queryRaw<SearchResult[]>`
      (
        SELECT
          s.id,
          'subpage'::text AS type,
          s.title,
          LEFT(COALESCE(s.content, ''), ${EXCERPT_LENGTH}) AS excerpt,
          s.slug,
          s."publishedAt",
          CASE WHEN s.title ILIKE ${pattern} ESCAPE ${likeEscape} THEN 2 ELSE 1 END::double precision AS score,
          NULL::text AS "boardName",
          NULL::text AS "boardSlug"
        FROM "Subpage" s
        WHERE s.status = 'PUBLISHED'
          AND s."sessionId" = ${sessionId}
          AND (s.title ILIKE ${pattern} ESCAPE ${likeEscape} OR COALESCE(s.content, '') ILIKE ${pattern} ESCAPE ${likeEscape})
      )
      UNION ALL
      (
        SELECT
          p.id,
          'post'::text AS type,
          p.title,
          LEFT(COALESCE(p.content, ''), ${EXCERPT_LENGTH}) AS excerpt,
          p.slug,
          p."publishedAt",
          CASE WHEN p.title ILIKE ${pattern} ESCAPE ${likeEscape} THEN 2 ELSE 1 END::double precision AS score,
          b.name AS "boardName",
          b.slug AS "boardSlug"
        FROM "Post" p
        JOIN "Board" b ON b.id = p."boardId" AND b."sessionId" = ${sessionId}
        WHERE p.status = 'PUBLISHED'
          AND b."isPublic" = true
          AND p."sessionId" = ${sessionId}
          AND (p.title ILIKE ${pattern} ESCAPE ${likeEscape} OR COALESCE(p.content, '') ILIKE ${pattern} ESCAPE ${likeEscape})
      )
      ORDER BY score DESC, "publishedAt" DESC NULLS LAST
      LIMIT ${pageSize} OFFSET ${offset}
    `;

  const [items, countResult] = await Promise.all([
    itemQuery,
    prisma.$queryRaw<[{ subpage: bigint; post: bigint; all: bigint }]>`
      SELECT
        (
          SELECT COUNT(*) FROM "Subpage" s
          WHERE s.status = 'PUBLISHED'
            AND s."sessionId" = ${sessionId}
            AND (s.title ILIKE ${pattern} ESCAPE ${likeEscape} OR COALESCE(s.content, '') ILIKE ${pattern} ESCAPE ${likeEscape})
        ) AS subpage,
        (
          SELECT COUNT(*) FROM "Post" p
          JOIN "Board" b ON b.id = p."boardId" AND b."sessionId" = ${sessionId}
          WHERE p.status = 'PUBLISHED'
            AND b."isPublic" = true
            AND p."sessionId" = ${sessionId}
            AND (p.title ILIKE ${pattern} ESCAPE ${likeEscape} OR COALESCE(p.content, '') ILIKE ${pattern} ESCAPE ${likeEscape})
        ) AS post,
        (
          (
            SELECT COUNT(*) FROM "Subpage" s
            WHERE s.status = 'PUBLISHED'
              AND s."sessionId" = ${sessionId}
              AND (s.title ILIKE ${pattern} ESCAPE ${likeEscape} OR COALESCE(s.content, '') ILIKE ${pattern} ESCAPE ${likeEscape})
          ) + (
            SELECT COUNT(*) FROM "Post" p
            JOIN "Board" b ON b.id = p."boardId" AND b."sessionId" = ${sessionId}
            WHERE p.status = 'PUBLISHED'
              AND b."isPublic" = true
              AND p."sessionId" = ${sessionId}
              AND (p.title ILIKE ${pattern} ESCAPE ${likeEscape} OR COALESCE(p.content, '') ILIKE ${pattern} ESCAPE ${likeEscape})
          )
        ) AS all
    `,
  ]);

  const counts = {
    all: Number(countResult[0]?.all ?? 0),
    subpage: Number(countResult[0]?.subpage ?? 0),
    post: Number(countResult[0]?.post ?? 0),
  } satisfies Record<SearchContentType, number>;
  const total = counts[type];

  return {
    items,
    total,
    counts,
    totalPages: Math.ceil(total / pageSize),
    page,
    pageSize,
    type,
  };
}
