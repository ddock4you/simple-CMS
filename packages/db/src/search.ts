import { prisma } from './client';

const DEFAULT_PAGE_SIZE = 20;
const MAX_QUERY_LENGTH = 200;
const EXCERPT_LENGTH = 200;

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
  totalPages: number;
  page: number;
  pageSize: number;
}

export async function searchContent(
  query: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<SearchResponse> {
  const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (!trimmed) {
    return { items: [], total: 0, totalPages: 0, page, pageSize };
  }

  const offset = (page - 1) * pageSize;

  try {
    const [items, countResult] = await Promise.all([
      prisma.$queryRaw<SearchResult[]>`
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
          JOIN "Board" b ON b.id = p."boardId"
          WHERE p.status = 'PUBLISHED'
            AND b."isPublic" = true
            AND (p.title &@~ ${trimmed} OR p.content &@~ ${trimmed})
        )
        ORDER BY score DESC, "publishedAt" DESC NULLS LAST
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT
          (
            SELECT COUNT(*) FROM "Subpage" s
            WHERE s.status = 'PUBLISHED'
              AND (s.title &@~ ${trimmed} OR s.content &@~ ${trimmed})
          ) + (
            SELECT COUNT(*) FROM "Post" p
            JOIN "Board" b ON b.id = p."boardId"
            WHERE p.status = 'PUBLISHED'
              AND b."isPublic" = true
              AND (p.title &@~ ${trimmed} OR p.content &@~ ${trimmed})
          ) AS total
      `,
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return {
      items,
      total,
      totalPages: Math.ceil(total / pageSize),
      page,
      pageSize,
    };
  } catch (error) {
    console.error('Search query failed:', error);
    return { items: [], total: 0, totalPages: 0, page, pageSize };
  }
}
