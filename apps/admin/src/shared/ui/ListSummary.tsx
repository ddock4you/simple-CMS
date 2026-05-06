interface ListSummaryProps {
  total: number;
  page: number;
  pageSize: number;
}

export function ListSummary({ total, page, pageSize }: ListSummaryProps) {
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">총 0건</p>;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <p className="text-sm text-muted-foreground">
      총 {total}건 중 {from}~{to}건
    </p>
  );
}
