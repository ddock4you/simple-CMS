interface ListSummaryProps {
  total: number;
  page: number;
  pageSize: number;
}

export function ListSummary({ total }: ListSummaryProps) {
  return <p className="text-sm text-muted-foreground">총 {total}건</p>;
}
