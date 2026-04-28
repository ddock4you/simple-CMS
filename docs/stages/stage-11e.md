# Stage 11e — E2E 테스트 (Playwright)

## 작업 범위

- `playwright.config.ts` (루트) — 3 프로젝트(admin/web/golden-flow) 설정
- `e2e/fixtures.ts` — `loginAdmin` 헬퍼 + `adminPage`/`webPage` 커스텀 fixture
- `e2e/admin/auth.spec.ts` — admin 인증 시나리오 3건
- `e2e/web/navigation.spec.ts` — 공개 웹 기본 탐색 3건
- `e2e/golden-flow.spec.ts` — 골든 플로우 5단계 (로그인→생성→발행→공개 확인→검색)
- `package.json` — `e2e` / `e2e:ui` / `e2e:report` 스크립트 추가
- `@playwright/test` devDependency 추가 (워크스페이스 루트)

## playwright.config.ts 구조

```ts
projects: [
  { name: 'admin',       testMatch: '**/admin/**/*.spec.ts',      baseURL: 'http://localhost:3001' },
  { name: 'web',         testMatch: '**/web/**/*.spec.ts',        baseURL: 'http://localhost:3000' },
  { name: 'golden-flow', testMatch: '**/golden-flow.spec.ts' },   // 두 앱 모두 접근
]
```

- `fullyParallel: false`, `workers: 1` — 순차 실행 (서버 공유 + DB 상태 격리 목적)
- `timeout: 30_000` — 느린 Next.js 서버 사이드 응답 대비
- `retries: CI ? 1 : 0` — CI 환경에서만 재시도

## 골든 플로우 시나리오

1. admin 로그인 → 대시보드 확인
2. 서브페이지 생성 (초안) → URL에서 ID 추출, `subpageId` 공유
3. 발행 → 상태 combobox → '발행' 선택 → 저장
4. web `/p/${SLUG}` 접근 → 제목 h1 노출 확인
5. 검색 `/search?q=E2E` → 페이지 제목 노출 확인
6. `afterAll` cleanup — admin API `DELETE /api/subpages/:id`로 테스트 데이터 정리

## 실행 방법

```bash
# 서버 실행 선행 필요 (admin: 3001, web: 3000)
pnpm e2e              # headless
pnpm e2e:ui           # UI 모드 (디버깅)
pnpm e2e:report       # HTML 리포트 보기
```

## CI 통합 비고

PGroonga는 Docker 환경에서만 설정 가능하므로 E2E CI 자동화는 Stage 8(Docker + CI/CD)에서 추가.
`playwright` 패키지는 기존 deps에 있고, Chromium 설치도 Stage 7j에서 완료된 상태라 인프라 추가 없이 스크립트만 추가하면 됨.
