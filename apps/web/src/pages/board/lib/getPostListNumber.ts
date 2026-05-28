interface PostListNumberInput {
  itemIndex: number;
  page: number;
  pageSize: number;
  total: number;
  regularTotal: number;
}

export function getPostListNumber({
  itemIndex,
  page,
  pageSize,
  total,
  regularTotal,
}: PostListNumberInput): number {
  const importantTotal = total - regularTotal;
  const globalIndex = (page - 1) * pageSize + itemIndex;

  return regularTotal - (globalIndex - importantTotal);
}
