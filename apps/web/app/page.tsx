import { HomePage } from '@/pages/home/ui/HomePage';

// Next.js route segment config는 literal string만 허용 → `dynamic = ternary` 사용 불가.
// 대신 `dynamic` 명시를 제거하고 자동 판정에 위임:
//   - 시연 모드: layout이 `ensureDemoSession` → `cookies()` 호출로 자동 dynamic
//   - 운영 모드: layout이 dynamic API 호출 안 함 + page도 정적 fetch만 → 자동 정적/ISR
// 콘텐츠 변경 시 admin API의 revalidatePath 호출로 무효화 가능.

export default function Page() {
  return <HomePage />;
}
