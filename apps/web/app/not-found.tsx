import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-container">
      <div className="not-found">
        <h1 className="not-found-title">페이지를 찾을 수 없습니다</h1>
        <p className="not-found-description">
          요청하신 페이지가 존재하지 않거나 삭제되었습니다.
        </p>
        <Link href="/" className="not-found-link">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
