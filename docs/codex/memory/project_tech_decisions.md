<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Tech Stack Decisions
description: Stage 1 사전 결정 - 배포, 라이브러리, 버전 정책, 커스텀 인증 전환 등 확정 사항
type: project
---

2026-04-06 확정된 기술 결정:

- **배포**: 전체 Docker 자체 호스팅 (admin + web 모두). Vercel 스킬은 추가했으나 배포 대상 아님
- **Next.js 16** + React 19.2 사용. Turbopack top-level config, next lint 제거됨 (ESLint CLI 직접 사용)
- **Lint/Format**: ESLint 9 flat config + Prettier 유지. Biome 검토했으나 플러그인 생태계(@next/eslint-plugin-next, @tanstack/eslint-plugin-query) 때문에 ESLint 유지 결정
- **날짜**: date-fns, **아이콘**: lucide-react, **E2E**: Playwright (Stage 8+)
- **데이터 패턴 확정 (2026-04-06)**: API Route(Route Handler) + TanStack Query. Server Actions 미사용
  - 서버 경계: API Route 핸들러 (인증, 검증, DB 처리, revalidatePath, 감사 로그)
  - 클라이언트: TanStack Query (useMutation으로 변경, useQuery로 인터랙티브 조회, invalidateQueries로 캐시 갱신)
  - 정적 표시: Server Component에서 직접 Prisma 쿼리 (API Route/TanStack Query 불필요)
  - revalidatePath는 Route Handler 내에서 호출 가능 → Server Actions 없이도 캐시 무효화 가능
- **TanStack Query**: **admin 전용**. Key Factory + queryOptions 패턴. web에서는 검색 포함 전체 미사용 (URL params + Server Component로 처리)
- **Zustand**: 클라이언트 UI 상태 전용. 서버 데이터를 Zustand에 복사하지 않음
- **FSD 규칙**: ESLint 강제 아닌 컨벤션 + 스킬(/check-fsd, /check-imports)로 관리
- **Barrel export 금지**: FSD 슬라이스에서 index.ts barrel export 사용하지 않음 (Next.js tree-shaking, SC/CC 경계 문제). packages/ entry point는 유지
- **Web 데이터 소스 확정 (2026-04-06)**: `@simple-cms/db` 직접 Prisma 쿼리. admin BFF API 호출하지 않음
  - 이유: 장애 격리 (admin 장애 → web 영향 없음), 배포 독립성, 불필요한 네트워크 홉 제거
  - web 쿼리는 읽기 전용 + published 필터 + 공개 안전 필드만 select
- **라이브러리 버전 정책**: 모든 라이브러리 최신 버전 설치가 기본 원칙
- **인증 전환 (2026-04-08)**: NextAuth.js → 커스텀 세션 인증으로 전환 결정
  - 이유: credentials-only 프로젝트에 NextAuth 과한 도구, PENDING/SUSPENDED 에러 처리 제한, 추가 라이브러리 의존성 부담
  - `getCurrentUser()` at `entities/auth/lib/getCurrentUser.ts` (FSD entities 레이어)
  - 쿠키 유틸: `shared/lib/cookies.ts` (setSessionCookie, clearSessionCookie)
  - 세션 헬퍼: `packages/db/src/sessionHelper.ts` (createSession, validateSession, getSessionUser 등)
  - 제거 대상: next-auth, @auth/prisma-adapter, Account 모델, VerificationToken 모델
  - email 필드: 유지 (회원가입 시 수집 예정)

**Why:** Stage 1(기초 환경 구축) 진행 전 앱/패키지 설정에 영향을 주는 미확정 항목을 모두 해소하기 위함
**How to apply:** Stage 1 구현 시 위 결정을 기반으로 package.json, next.config, eslint config 등 설정. 인증 구현(Stage 2a) 시 커스텀 세션 패턴 적용
