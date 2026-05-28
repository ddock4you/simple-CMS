interface BoardEmptyStateProps {
  boardName: string;
}

const EMPTY_STATE_GUIDES = [
  '새 게시글이 등록되면 이곳에서 확인할 수 있습니다.',
  '다른 게시판 또는 통합검색을 이용해 주세요.',
];

export function BoardEmptyState({ boardName }: BoardEmptyStateProps) {
  return (
    <section className="board-empty-state" aria-labelledby="board-empty-title">
      <h2 id="board-empty-title" className="board-empty-title">
        <span className="board-empty-highlight">{boardName}</span>에 등록된 게시글이
        없습니다.
      </h2>
      <ul className="board-empty-list">
        {EMPTY_STATE_GUIDES.map((guide) => (
          <li key={guide}>{guide}</li>
        ))}
      </ul>
    </section>
  );
}
