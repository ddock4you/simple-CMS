import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from './client';
import { searchContent } from './search';

const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>;

function mockSearchResult(
  items: unknown[] = [],
  counts: { subpage?: bigint; post?: bigint; all?: bigint } = {},
) {
  mockQueryRaw
    .mockResolvedValueOnce(items)
    .mockResolvedValueOnce([
      {
        subpage: counts.subpage ?? 0n,
        post: counts.post ?? 0n,
        all: counts.all ?? 0n,
      },
    ]);
}

const emptyResult = {
  items: [],
  total: 0,
  counts: { all: 0, subpage: 0, post: 0 },
  totalPages: 0,
  page: 1,
  pageSize: 20,
  type: 'all',
};

describe('searchContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('빈 문자열 → DB 쿼리 없이 빈 결과 반환', async () => {
    const result = await searchContent('');
    expect(result).toEqual(emptyResult);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it('공백만 있는 쿼리 → 빈 결과 반환', async () => {
    const result = await searchContent('   ');
    expect(result).toEqual(emptyResult);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it('200자 초과 쿼리도 오류 없이 처리 (내부 슬라이스)', async () => {
    mockSearchResult();
    const result = await searchContent('a'.repeat(300));
    expect(result.total).toBe(0);
    expect(mockQueryRaw).toHaveBeenCalled();
  });

  it('totalPages = Math.ceil(total / pageSize)', async () => {
    mockSearchResult([], { all: 25n, subpage: 10n, post: 15n });
    const result = await searchContent('test', 1, 20);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(2); // Math.ceil(25 / 20)
    expect(result.counts).toEqual({ all: 25, subpage: 10, post: 15 });
  });

  it('정확히 나누어지는 경우 totalPages 계산', async () => {
    mockSearchResult([], { all: 40n });
    const result = await searchContent('test', 1, 20);
    expect(result.totalPages).toBe(2); // Math.ceil(40 / 20)
  });

  it('페이지 번호와 pageSize를 그대로 반환', async () => {
    mockSearchResult();
    const result = await searchContent('test', 3, 10);
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
  });

  it('기본값: page=1, pageSize=20', async () => {
    mockSearchResult();
    const result = await searchContent('test');
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('DB 오류 시 빈 결과 반환 (graceful fallback)', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('DB connection failed'));
    const result = await searchContent('test');
    expect(result).toEqual(emptyResult);
  });

  it('type=subpage이면 subpage 카운트를 total로 사용', async () => {
    mockSearchResult([], { all: 30n, subpage: 12n, post: 18n });
    const result = await searchContent('test', 1, 10, 'subpage');
    expect(result.type).toBe('subpage');
    expect(result.total).toBe(12);
    expect(result.totalPages).toBe(2);
  });

  it('type=post이면 post 카운트를 total로 사용', async () => {
    mockSearchResult([], { all: 30n, subpage: 12n, post: 18n });
    const result = await searchContent('test', 1, 10, 'post');
    expect(result.type).toBe('post');
    expect(result.total).toBe(18);
    expect(result.totalPages).toBe(2);
  });
});
