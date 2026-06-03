import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-container">
      <section className="flex min-h-[420px] flex-col items-center justify-center py-[64px] text-center medium:min-h-[520px]">
        <p className="mb-[8px] text-[15px] leading-[1.5] font-semibold text-[#256ef4]">
          404
        </p>
        <h1 className="mb-[16px] text-[32px] leading-[1.3] font-bold text-[#1e2124]">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mb-[24px] max-w-[520px] text-[16px] leading-[1.6] text-[#555555]">
          요청하신 페이지가 존재하지 않거나 삭제되었습니다.
        </p>
        <div className="flex flex-col gap-[8px] small:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[4px] bg-[#256ef4] px-[24px] py-[12px] font-medium text-white no-underline hover:opacity-90"
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-[4px] border border-[#cdd1d5] bg-white px-[24px] py-[12px] font-medium text-[#1e2124] no-underline hover:bg-[#f4f5f6]"
          >
            통합검색
          </Link>
        </div>
      </section>
    </div>
  );
}
