interface BoardEmptyStateProps {
  boardName: string;
}

const EMPTY_STATE_GUIDES = [
  '새 게시글이 등록되면 이곳에서 확인할 수 있습니다.',
  '다른 게시판 또는 통합검색을 이용해 주세요.',
];

export function BoardEmptyState({ boardName }: BoardEmptyStateProps) {
  return (
    <section className="flex min-h-[180px] w-full flex-col items-stretch justify-center gap-[16px] rounded-[10px] bg-[#f4f5f6] p-[16px] large:min-h-[220px] large:rounded-[12px] large:p-[24px]" aria-labelledby="board-empty-title">
      <h2 id="board-empty-title" className="m-0 text-[18px] leading-[1.5] font-bold text-[#1e2124] large:text-[19px]">
        <span className="text-[#1e694e]">{boardName}</span>에 등록된 게시글이
        없습니다.
      </h2>
      <ul className="m-0 flex list-none flex-col gap-[4px] p-0 text-[16px] leading-[1.7] text-[#464c53] large:text-[17px] large:leading-[1.8] [&_li::before]:content-['-_']">
        {EMPTY_STATE_GUIDES.map((guide) => (
          <li key={guide}>{guide}</li>
        ))}
      </ul>
    </section>
  );
}
