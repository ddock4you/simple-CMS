import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-container">
      <div className="py-[64px] text-center">
        <h1 className="mb-[16px] text-[32px] leading-[1.3] font-bold text-[#1e2124]">페이지를 찾을 수 없습니다</h1>
        <p className="mb-[24px] text-[#555555]">
          요청하신 페이지가 존재하지 않거나 삭제되었습니다.
        </p>
        <Link href="/" className="inline-block rounded-[4px] bg-[#256ef4] px-[24px] py-[12px] font-medium text-white no-underline hover:opacity-90">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
