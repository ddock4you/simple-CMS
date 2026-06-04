# 학습 문서

CMS 개발과 병행하는 학습 + 면접 준비 문서 모음.
각 개발 주제에 대해 **사전학습**(개발 전)과 **학습정리**(개발 후) 두 종류의 문서가 생성된다.

## 사용법

```
/pre-learn     # 개발 시작 전 실행 → 사전학습 문서 자동 생성
/post-learn    # 개발 완료 후 실행 → 학습정리 문서 자동 생성
```

인자 없이 실행하면 현재 대화 컨텍스트에서 주제를 자동 파악한다.

## 문서 구조

### 사전학습 (`{주제}-사전학습.md`)

- 핵심 개념 + 동작 원리
- 레거시 ↔ 모던 대조표
- 구현 시 주의할 점
- 설명 가능 체크리스트

### 학습정리 (`{주제}-학습정리.md`)

- 구현 요약 + 프로젝트 코드 기반 설명
- 동작 원리 심화
- 레거시 경험 연결
- 면접 예상 질문 & 답변 (꼬리 질문 포함)
- 트러블슈팅 로그
- 한 줄 요약 카드 (면접 직전 복습용)

## 권장 읽기 순서

아래 순서대로 읽으면 프로젝트 구조 → 아키텍처 → 인프라 기능으로 자연스럽게 이어진다.

| #   | 주제                            | 사전학습                                                  | 학습정리                                  | 관련 Stage   |
| --- | ------------------------------- | --------------------------------------------------------- | ----------------------------------------- | ------------ |
| 1   | 개발환경 문서화                 | —                                                         | [학습정리](1-design/1-개발환경-문서화-학습정리.md) | Stage 1      |
| 2   | 앱 아키텍처 패턴                | [사전학습](1-design/2-앱-아키텍처-패턴-사전학습.md)                | —                                         | 전체         |
| 3   | 데이터 페칭과 상태 관리         | [사전학습](1-design/3-데이터-페칭-상태관리-사전학습.md)            | —                                         | Stage 2a~    |
| 4   | 인증 세션과 동시 로그인         | [사전학습](1-design/4-인증-세션-동시로그인-사전학습.md)            | —                                         | Stage 2a     |
| 5   | 회원가입 승인제와 비밀번호 보안 | [사전학습](1-design/5-회원가입-승인제와-비밀번호-보안-사전학습.md) | —                                         | Stage 2b~2d  |
| 6   | 감사 로그 시스템                | [사전학습](1-design/6-감사-로그-시스템-사전학습.md)                | —                                         | Stage 3e     |
| 7   | 파일 업로드 제한                | [사전학습](1-design/7-파일-업로드-제한-사전학습.md)                | —                                         | Stage 3f     |
| 8   | 커스텀 도메인 인프라            | [사전학습](1-design/8-커스텀-도메인-인프라-사전학습.md)            | —                                         | Stage 3f, 4c |
| 9   | 웹 에러 로그 시스템             | [사전학습](1-design/9-웹-에러-로그-시스템-사전학습.md)             | —                                         | Stage 4e     |
| 10  | 모노레포 배포 전략              | [사전학습](1-design/10-모노레포-배포-전략-사전학습.md)             | —                                         | Stage 8      |
| 11  | RBAC 역할 기반 권한 관리        | [사전학습](1-design/11-RBAC-역할기반-권한관리-사전학습.md)         | —                                         | Stage 2f     |
| 12  | 배포 운영 기초                  | [사전학습](1-design/12-배포-운영-기초-사전학습.md)                 | —                                         | Stage 8      |
| 13  | GitHub Actions CI 자동화        | [사전학습](1-design/13-GitHub-Actions-CI-자동화-사전학습.md)       | [학습정리](2-develop/8-GitHub-Actions-CI-자동화-학습정리.md) | Stage 8a~d |
| 14  | Stage 8 운영인프라 통합설계 (Docker compose 의존성·sub-stage 분할·자동화 vs 명시 절차·migrate 전환·workflow lifecycle·운영 가이드 구조) | [사전학습](1-design/14-Stage8-운영인프라-통합설계-사전학습.md)    | [학습정리](2-develop/8z-Stage8-종합-운영인프라-통합설계-학습정리.md) | Stage 8a~d |

## 개발 단계 학습 (2-develop)

| #   | 주제                            | 사전학습                                                             | 학습정리 | 관련 Stage |
| --- | ------------------------------- | -------------------------------------------------------------------- | -------- | ---------- |
| 1   | 모노레포 개발환경 구축          | [사전학습](2-develop/1-모노레포-개발환경-사전학습.md)                | [학습정리](2-develop/1-모노레포-개발환경-학습정리.md) | Stage 1    |
| 2   | DB 인증 구현                    | [사전학습](2-develop/2a-DB-인증-구현-사전학습.md)                    | [학습정리](2-develop/2a-DB-인증-구현-학습정리.md)     | Stage 2a   |
| 3   | 회원가입 폼 검증 구현           | [사전학습](2-develop/2b-회원가입-폼-검증-구현-사전학습.md)           | [학습정리](2-develop/2b-회원가입-폼-검증-구현-학습정리.md) | Stage 2b   |
| 4   | Admin 레이아웃 Server/Client 경계 | [사전학습](2-develop/2c-Admin-레이아웃-Server-Client-경계-사전학습.md) | [학습정리](2-develop/2c-Admin-레이아웃-Server-Client-경계-학습정리.md) | Stage 2c   |
| 5   | 사용자 관리 CRUD 인프라           | [사전학습](2-develop/2d-사용자관리-CRUD-인프라-사전학습.md)            | [학습정리](2-develop/2d-사용자관리-CRUD-인프라-학습정리.md)            | Stage 2d   |
| 6   | 프로필 변경 + RBAC 권한 관리      | [사전학습](2-develop/2ef-프로필-RBAC-구현-사전학습.md)                 | [학습정리](2-develop/2ef-프로필-RBAC-구현-학습정리.md)                 | Stage 2e+2f |
| 7   | 서브 페이지 + Tiptap + 권한 UI    | [사전학습](2-develop/3a-서브페이지-Tiptap-권한UI-사전학습.md)          | [학습정리](2-develop/3a-서브페이지-Tiptap-권한UI-학습정리.md)          | Stage 3a    |
| 8   | 게시판 CRUD — 패턴 복제와 삭제 안전성 | [사전학습](2-develop/3b-게시판-CRUD-패턴복제-삭제안전성-사전학습.md) | [학습정리](2-develop/3b-게시판-CRUD-패턴복제-삭제안전성-학습정리.md) | Stage 3b    |
| 9   | 게시글 CRUD — 부모-자식 엔티티와 복합 유일성 | [사전학습](2-develop/3c-게시글-부모자식-CRUD-복합유일성-사전학습.md) | [학습정리](2-develop/3c-게시글-부모자식-CRUD-복합유일성-학습정리.md) | Stage 3c    |
| 10  | 메뉴 관리 — 트리 구조 CRUD + dnd-kit | [사전학습](2-develop/3d-메뉴관리-트리구조-dnd-kit-사전학습.md) | [학습정리](2-develop/3d-메뉴관리-트리구조-dnd-kit-학습정리.md) | Stage 3d    |
| 11  | 감사 로그 — 조회 전용 UI + Excel 내보내기 | [사전학습](2-develop/3e-감사로그-조회전용-Excel내보내기-사전학습.md) | [학습정리](2-develop/3e-감사로그-조회전용-Excel내보내기-학습정리.md) | Stage 3e    |
| 12  | 사이트 설정 — 키-값 모델 + 탭 네비게이션 | [사전학습](2-develop/3f-사이트설정-키값모델-탭네비게이션-사전학습.md) | [학습정리](2-develop/3f-사이트설정-키값모델-탭네비게이션-학습정리.md) | Stage 3f    |
| 13  | 공개 웹 SSR + KRDS + 콘텐츠 렌더링 | [사전학습](2-develop/4a-공개웹-SSR-KRDS-콘텐츠렌더링-사전학습.md) | [학습정리](2-develop/4a-공개웹-SSR-KRDS-콘텐츠렌더링-학습정리.md) | Stage 4a    |
| 14  | 게시판 스킨 분기 + 페이지네이션 | [사전학습](2-develop/4b-게시판-스킨분기-페이지네이션-사전학습.md) | [학습정리](2-develop/4b-게시판-스킨분기-페이지네이션-학습정리.md) | Stage 4b    |
| 15  | 메뉴 렌더링 + 도메인 프록시 | [사전학습](2-develop/4c-메뉴렌더링-도메인프록시-사전학습.md) | [학습정리](2-develop/4c-메뉴렌더링-도메인프록시-학습정리.md) | Stage 4c    |
| 16  | 메뉴 슬롯 배정 + 3depth + 사이드바 | — | [학습정리](2-develop/3d2-메뉴슬롯-3depth-사이드바-학습정리.md) | Stage 3d-2  |
| 17  | PGroonga 통합검색 + Prisma Raw Query | [사전학습](2-develop/4d-PGroonga-통합검색-Prisma-rawQuery-사전학습.md) | [학습정리](2-develop/4d-PGroonga-통합검색-Prisma-rawQuery-학습정리.md) | Stage 4d    |
| 18  | 에러 로그 UI — Prisma 집계 + TanStack 프리페치 | [사전학습](2-develop/4e-에러로그UI-Prisma집계-TanStack프리페치-사전학습.md) | [학습정리](2-develop/4e-에러로그UI-Prisma집계-TanStack프리페치-학습정리.md) | Stage 4e    |
| 19  | 메인 섹션 관리 — configJson + Zod Union + Swiper + 스토리지 어댑터 | [사전학습](2-develop/5a-메인섹션-configJson-Swiper-스토리지어댑터-사전학습.md) | [학습정리](2-develop/5a-메인섹션-configJson-Swiper-스토리지어댑터-학습정리.md) | Stage 5a    |
| 20  | 미디어 라이브러리 — 중복 방지 + 참조 추적 + URL 경계 정규화 + Tiptap 통합 | [사전학습](2-develop/5a2-미디어라이브러리-중복방지-참조추적-경계정규화-사전학습.md) | [학습정리](2-develop/5a2-미디어라이브러리-중복방지-참조추적-경계정규화-학습정리.md) | Stage 5a-2  |
| 21  | 메인 팝업 — 모달 접근성 + SSR 쿠키 필터링 + Tiptap 서버 렌더링 | [사전학습](2-develop/5b-메인팝업-모달접근성-SSR쿠키-사전학습.md) | [학습정리](2-develop/5b-메인팝업-모달접근성-SSR쿠키-학습정리.md) | Stage 5b    |
| 22  | 서브페이지 블록 시스템 — 통합 블록 모델 + React 18 배칭 + Monaco/iframe 보안 | [사전학습](2-develop/6-서브페이지-블록시스템-통합블록모델-사전학습.md) | [학습정리](2-develop/6-서브페이지-블록시스템-통합블록모델-학습정리.md) | Stage 6     |
| 23  | Draft 미리보기 — 크로스 오리진 토큰 교환 + httpOnly 쿠키 + React.cache | [사전학습](2-develop/7a-draft미리보기-크로스오리진-토큰교환-사전학습.md) | [학습정리](2-develop/7a-draft미리보기-크로스오리진-토큰교환-학습정리.md) | Stage 7a    |
| 24  | HTML 블록 확장 — 도메인 통합(Option B) + CSS 스코핑 + DOMPurify 확장 | [사전학습](2-develop/7b-HTML블록확장-CSS스코핑-DOMPurify확장-사전학습.md) | [학습정리](2-develop/7b-HTML블록확장-CSS스코핑-DOMPurify확장-학습정리.md) | Stage 7b    |
| 25  | 운영 UX — Dirty 가드 + Optimistic Update + 벌크 + Command Palette | [사전학습](2-develop/7c-운영UX-DirtyGuard-OptimisticUpdate-벌크-CommandPalette-사전학습.md) | [학습정리](2-develop/7c-운영UX-DirtyGuard-OptimisticUpdate-벌크-CommandPalette-학습정리.md) | Stage 7c    |
| 26  | 사이드바 재해석 + Dialog UX 표준 + KOGL 라이선스 | [사전학습](2-develop/7d-사이드바재해석-DialogUX표준-KOGL라이선스-사전학습.md) | [학습정리](2-develop/7d-사이드바재해석-DialogUX표준-KOGL라이선스-학습정리.md) | Stage 7d    |
| 27  | 공개 웹 KRDS + Tailwind v4 공존 + Swiper width 회귀 방어 | [사전학습](2-develop/7e-공개웹-KRDS-Tailwind-Swiper회귀방어-사전학습.md) | [학습정리](2-develop/7e-공개웹-KRDS-Tailwind-Swiper회귀방어-학습정리.md) | Stage 7e    |
| 28  | Storybook v10 + Vitest v4 2-track 테스트 인프라 shell | [사전학습](2-develop/7f-Storybook-Vitest-2track테스트인프라-사전학습.md) | [학습정리](2-develop/7f-Storybook-Vitest-2track테스트인프라-학습정리.md) | Stage 7f    |
| 29  | Storybook stories 확장 + authenticated decorator 검증 + KRDS showcase | [사전학습](2-develop/7g-Storybook-stories확장-KRDSshowcase-사전학습.md) | [학습정리](2-develop/7g-Storybook-stories확장-KRDSshowcase-학습정리.md) | Stage 7g |
| 30  | Storybook play function + Hook 검증 probe 패턴 + MSW 호환성 경계 | [사전학습](2-develop/7h-Storybook-playfunction-probe패턴-사전학습.md) | [학습정리](2-develop/7h-Storybook-playfunction-probe패턴-학습정리.md) | Stage 7h |
| 31  | FSD 슬라이스 승격(features→entities) + ResizeObserver 회귀 자동 감지 + Controller 패턴 | [사전학습](2-develop/7i-FSD슬라이스승격-회귀자동감지-Controller패턴-사전학습.md) | [학습정리](2-develop/7i-FSD슬라이스승격-회귀자동감지-Controller패턴-학습정리.md) | Stage 7i |
| 32  | GitHub Actions CI 매트릭스 + fetch stub decorator + 라이브러리 호환성 판단 | [사전학습](2-develop/7j-CI매트릭스-fetchStub-라이브러리호환성판단-사전학습.md) | [학습정리](2-develop/7j-CI매트릭스-fetchStub-라이브러리호환성판단-학습정리.md) | Stage 7j |
| 33  | 모노레포 공유 모듈 추출 + addon-vitest 3-tier 아키텍처 + Playwright/Vite 병목 분석 | [사전학습](2-develop/7k-공유모듈추출-addonVitest해부-Playwright병목-사전학습.md) | [학습정리](2-develop/7k-공유모듈추출-addonVitest해부-Playwright병목-학습정리.md) | Stage 7k |
| 34  | Next.js 동적 메타데이터 + 인메모리 모듈 캐시 + MIME 다층 보안 게이트 | [사전학습](2-develop/7l-동적메타데이터-인메모리캐시-MIME다층게이트-사전학습.md) | [학습정리](2-develop/7l-동적메타데이터-인메모리캐시-MIME다층게이트-학습정리.md) | Stage 7l |
| 35  | 콘텐츠 버전 스냅샷 + 소프트 롤백 + 낙관 동시성 범위 설계 | [사전학습](2-develop/7m-버전스냅샷-소프트롤백-낙관동시성범위-사전학습.md) | [학습정리](2-develop/7m-버전스냅샷-소프트롤백-낙관동시성범위-학습정리.md) | Stage 7m |
| 36  | Next.js MetadataRoute 파일 규약 + Schema.org JSON-LD + `</script>` 인젝션 방어 | [사전학습](2-develop/9-sitemap-robots-구조화데이터-사전학습.md) | [학습정리](2-develop/9-sitemap-robots-구조화데이터-학습정리.md) | Stage 9 |
| 37  | 사용자 피드백 익명 수집 + Hydration 경계 디버깅 (IP 해싱 + DB rate limit + recharts + allowedDevOrigins) | [사전학습](2-develop/10-사용자피드백-익명수집-Hydration경계-사전학습.md) | [학습정리](2-develop/10-사용자피드백-익명수집-Hydration경계-학습정리.md) | Stage 10 |
| 38  | 피드백 Excel 내보내기 — KST 정합성 + 단일 날짜 출처 + PII 외부 반출 추적 (`+09:00` offset / `+1` day count 함정 / `X-Row-Count` 사이드 채널 / READ를 CREATE로 재해석) | [사전학습](2-develop/10b-피드백Excel내보내기-KST정합성-단일날짜출처-사전학습.md) | [학습정리](2-develop/10b-피드백Excel내보내기-KST정합성-단일날짜출처-학습정리.md) | Stage 10 follow-up |
| 39  | FSD 역방향 의존성 수정 + widgets 도입 결정 + Next.js SSR 서드파티 경계 | [사전학습](2-develop/11-FSD-역방향의존성-widgets도입-SSR서드파티경계-사전학습.md) | [학습정리](2-develop/11-FSD-역방향의존성-widgets도입-SSR서드파티경계-학습정리.md) | Stage 11 (Priority 4) |
| 40  | 테스트 3-track — Vitest unit · Storybook play · Playwright E2E (처음 쓰는 테스트 코드) | [사전학습](2-develop/12-테스트-3track-Vitest-Storybook-Playwright-사전학습.md) | — | Stage 12 |
| 41  | DnD Staged 저장 — `useStagedOrder` 훅 + `invalidateQueries().then(reset)` Promise 완료 대기 + Prisma `$transaction` atomicity | [사전학습](2-develop/13-DnD-Staged저장-useStagedOrder-Promise완료대기-사전학습.md) | [학습정리](2-develop/13-DnD-Staged저장-useStagedOrder-Promise완료대기-학습정리.md) | Stage 13 |
| 42  | admin UX 공통화 — CSS sticky 스택 · Tailwind 반응형 dual-render · 음수 마진 bg breakout · Design Token · Generic 컴포넌트 · form submit 메커니즘 | [사전학습](2-develop/14-admin-UX-PageToolbar-StickyCSS-DesignToken-GenericComponent-사전학습.md) | [학습정리](2-develop/14-admin-UX-PageToolbar-StickyCSS-DesignToken-GenericComponent-학습정리.md) | Stage 14 |
| 43  | 리스트 URL 상태 동기화 — useSearchParams + 비제어 입력 remount + Prisma OR | [사전학습](2-develop/15-리스트URL동기화-비제어입력remount-PrismaOR-사전학습.md) | [학습정리](2-develop/15-리스트URL동기화-비제어입력remount-PrismaOR-학습정리.md) | Stage 14 PR 2 |
| 44  | admin 디자인 시스템 — CSS 토큰 아키텍처 · Tailwind v4 `@theme inline` 순환참조 방지 · oklch · Stitch DESIGN.md · 단일 진실원 패턴 | [사전학습](2-develop/16-admin-디자인시스템-CSSToken-StitchDESIGNmd-사전학습.md) | [학습정리](2-develop/16-admin-디자인시스템-CSSToken-StitchDESIGNmd-학습정리.md) | Stage 15 |
| 45  | shadcn 확장 — Wrapper 패턴 · cn() 머지 메커니즘 · ESLint 아키텍처 가드 · Base UI WAI-ARIA 렌더링 | [사전학습](2-develop/17-shadcn확장-wrapper패턴-cn머지-ESLint가드-BaseUI-ARIA-사전학습.md) | — | Stage 15c-2 |
| 46  | CVA variant override · 대규모 import 마이그레이션 · Prisma enum 점진적 확장 | [사전학습](2-develop/18-CVA-variant-override-import마이그레이션자동화-Prisma-enum확장-사전학습.md) | [학습정리](2-develop/18-CVA-variant-override-import마이그레이션자동화-Prisma-enum확장-학습정리.md) | Stage 15c-3f |
| 47  | GitHub Actions CI 자동화 + Docker 운영 인프라 — `.dockerignore` monorepo 함정 · standalone `outputFileTracingRoot` · matrix conditional · `.next/cache` partial hit · service containers · cron · github-script issue dedupe | [사전학습](1-design/13-GitHub-Actions-CI-자동화-사전학습.md) | [학습정리](2-develop/8-GitHub-Actions-CI-자동화-학습정리.md) | Stage 8a~d |
| 48  | Stage 8 종합 — plan vs 실제 코드 검증 · sub-stage commit cherry-pick 가치 · 자동화 vs 명시 절차 framework · probe Dockerfile 진단 · packages typecheck cascade · workflow lifecycle 분리 · 운영 가이드 3-계층 | [사전학습](1-design/14-Stage8-운영인프라-통합설계-사전학습.md) | [학습정리](2-develop/8z-Stage8-종합-운영인프라-통합설계-학습정리.md) | Stage 8a~d |
| 49  | API Route 팩토리 패턴 · TypeScript 제네릭 심화 · Partial Success — `defineRoute`/`defineBulkOperation` 보일러플레이트 추상화 · ZodType 3-파라미터 · `instanceof` escape hatch · `void` fire-and-forget · 부분 성공 패턴 | [사전학습](2-develop/19-defineRoute팩토리-TypeScript제네릭심화-PartialSuccess-사전학습.md) | [학습정리](2-develop/19-defineRoute팩토리-TypeScript제네릭심화-PartialSuccess-학습정리.md) | Stage 16b |
| 50  | 디자인 시스템 스토리북 카탈로그 — KRDS 전역 CSS 격리(`html { font-size: 62.5% }` 재설정) · `useLayoutEffect` 동기 주입 · Tailwind v4 소스 스캐너 한계 · KRDS spacing/screens 완전 override · inline style escape hatch | [사전학습](2-develop/17-디자인시스템스토리-KRDS격리-useLayoutEffect-사전학습.md) | — | Stage 17 |
| 51  | SSR 성능 — RTT 누적 진단 · React `cache(fn)` 요청 스코프 dedup · Server Component 트리 직렬/병렬 fetch · Next.js `dynamic` literal-only + layout 전염성 · `IN`/`hasSome` 통합 · Prisma + pgbouncer connection 협상 비용 | [사전학습](2-develop/18-SSR성능-RTT진단-ReactCache-Server병렬화-동적정적전염-사전학습.md) | [학습정리](2-develop/18-SSR성능-RTT진단-ReactCache-Server병렬화-동적정적전염-학습정리.md) | Stage 18 |
| 52  | KRDS Tailwind root 정규화 — KRDS `62.5%` root 제거 · rem 0.625배 변환 · Storybook CSS 동일화 · KRDS plugin 제거 + arbitrary value 정책 | [사전학습](2-develop/특별편-KRDS-Tailwind-root정규화-사전학습.md) | [학습정리](2-develop/특별편-KRDS-Tailwind-root정규화-학습정리.md) | 특별편 |
| 53  | KRDS Footer 설정 — SiteSettings JSON · admin RHF 배열 폼 · web 인메모리 캐시 · App Router ISR(`revalidate=60`) · 기존 메뉴 `FOOTER` 슬롯과 정책 링크 분리 | [사전학습](2-develop/특별편-KRDS-Footer-SiteSettings-ISR-사전학습.md) | [학습정리](2-develop/특별편-KRDS-Footer-SiteSettings-ISR-학습정리.md) | 특별편 |
| 54  | 공개 웹 서버 레이아웃 — 헤더/푸터 Server Component · CLS 방어 · KRDS DOM 차용 · 3depth GNB 높이 계산 · nav 영역 기준 hover 상태 유지 · Tailwind 전역 CSS 축소 | [사전학습](2-develop/특별편-공개웹-서버레이아웃-CLS-GNB상태관리-사전학습.md) | [학습정리](2-develop/특별편-공개웹-서버레이아웃-CLS-GNB상태관리-학습정리.md) | 특별편 |
| 특별편 | KRDS Header GNB 클릭 토글 — `GROUP` 메뉴 타입 · `.gnb-toggle-wrap.is-open` · `.gnb-backdrop.active` · Server Component + Client Island 경계 | [사전학습](2-develop/특별편-KRDS-Header-GNB-클릭토글-백드롭-사전학습.md) | [학습정리](2-develop/특별편-KRDS-Header-GNB-클릭토글-백드롭-학습정리.md) | 특별편 |
| 특별편 | 시연 모드(Playground) — 멀티테넌시 + 서버리스 SQLite + 단일 도메인 통합 (용어 해부) | [사전학습](2-develop/특별편-시연모드-멀티테넌시-서버리스SQLite-사전학습.md) | — | 미정 |
| 특별편 | Prisma 7 config 분리 + PostgreSQL 스키마 진화 (시연 모드 PR1-2 보완) | [사전학습](2-develop/특별편-Prisma7-config-스키마진화-사전학습.md) | [학습정리](2-develop/특별편-Prisma7-config-스키마진화-학습정리.md) | 시연 PR1-2 |
| 특별편 | 시연 모드 구현 — Prisma `$extends` 심화 + AsyncLocalStorage `run` vs `enterWith` + Sentinel/Composite Unique + Cross-tenant write 보호 + Raw SQL bypass + 단일 master 운영 | [사전학습](2-develop/특별편-시연모드구현-PrismaExtension-AsyncLocalStorage-Sentinel-사전학습.md) | [학습정리](2-develop/특별편-시연모드구현-PrismaExtension-AsyncLocalStorage-Sentinel-학습정리.md) | 시연 PR3 |
| 특별편 | 시연 부트스트랩 — visitor 자동 진입 5단계 + In-memory FK Remap Clone + cuid 사전 생성 + 자기참조 2-pass + 단일 origin (basePath + rewrites + cookie scope) + Server Component Layout Gate + cross-origin redirect 함정 + Cookie/DB Session 만료 동기화 | [사전학습](2-develop/특별편-시연부트스트랩-FK클론-단일origin-LayoutGate-사전학습.md) | [학습정리](2-develop/특별편-시연부트스트랩-FK클론-단일origin-LayoutGate-학습정리.md) | 시연 PR4 |
| 특별편 | 시연 운영화 — Storage 폴더 격리(`<sessionId>/<cat>/<file>`) + `__SEED__` 단일 출처 가드(adapter delete 단일 게이트) + Vercel Cron(`vercel.json` + `CRON_SECRET` 자동 Bearer + timing-safe equal) + Next.js 16 `after()` lazy cleanup + AsyncLocalStorage 자동 wrap (`runWithBypass`) + CSS Custom Properties sticky chain 보정 (`var(--demo-banner-h, 0px)` + `top-[calc(...)]`) + Provider callback injection | [사전학습](2-develop/특별편-시연PR5-Storage격리-Cron-after-StickyChain-사전학습.md) | [학습정리](2-develop/특별편-시연PR5-Storage격리-Cron-after-StickyChain-학습정리.md) | 시연 PR5 |
| 특별편 | 시연 운영 워크플로우 — Snapshot Export/Import inverse 변환 + Walker 위치별 분기(`mediaId` vs `imageMediaId` vs `featuredImageId`) + Phase 1/2 분리(Storage `$transaction` 밖) + `__SEED__` 가드 우회 별도 진입점(`cleanupSeedFolder` / `uploadToSeed`) + cuid 재생성 + uploadedById null anonymization + Server Component `runWithBypass` + 명시 sessionId + Admin UI 3-layer 권한 게이팅 + ESM `--env-file` hoisting 함정 | [사전학습](2-develop/특별편-시연PR6-7-Snapshot운영워크플로우-사전학습.md) | [학습정리](2-develop/특별편-시연PR6-7-Snapshot운영워크플로우-학습정리.md) | 시연 PR6+PR7 |
| 특별편 | 시연 배포 실전 — Vercel monorepo Root Directory/Build Command 정합성 + Turbo env sandbox 우회 + Prisma `postinstall` lifecycle + Next.js basePath ↔ Vercel rewrites trailing slash 충돌(308 loop) + client-side `fetch` basePath 미적용 + Storybook sub-directory 4-layer fix(viteFinal · HTML 속성 · ES module import · `<base href>`) + URL Base 해석 메커니즘 + Supabase 2024+ 변경 + push-and-pray 회피 | [사전학습](2-develop/특별편-시연배포실전-Vercel모노레포-Storybook서브디렉토리-사전학습.md) | [학습정리](2-develop/특별편-시연배포실전-Vercel모노레포-Storybook서브디렉토리-학습정리.md) | 시연 배포 실전 |
| 특별편 | 시연 모드 Hydration/React Query 디버깅 — DemoBanner `Date.now()` text mismatch · DEMO RSC prefetch no-op · client loading/error 상태 분기 · "0건"과 "아직 로딩 중" 구분 | [사전학습](2-develop/특별편-시연모드-Hydration-ReactQuery디버깅-사전학습.md) | [학습정리](2-develop/특별편-시연모드-Hydration-ReactQuery디버깅-학습정리.md) | 시연 운영 디버깅 |
| 특별편 | 시연 DB 세션 스코프와 Snapshot 복구 — `__PROD__`/`__SEED__`/visitor row count 판별 · API 200 `data: []` 해석 · admin Route Handler `runWithUserDemoSession` · public web RSC session attach · 잘못된 snapshot import 복구 · 기존 세션 vs 새 세션 검증 | [사전학습](2-develop/특별편-시연DB세션스코프-Snapshot복구-사전학습.md) | [학습정리](2-develop/특별편-시연DB세션스코프-Snapshot복구-학습정리.md) | 시연 운영 디버깅 |
| 특별편 | Codex 마이그레이션 — `AGENTS.md` 스코프 모델 + legacy command playbook화 + project memory 외부화 + skill/playbook 분리 + `docs/codex` Git 추적 경계 | [사전학습](2-develop/특별편-Codex마이그레이션-AGENTS-playbook-memory-사전학습.md) | [학습정리](2-develop/특별편-Codex마이그레이션-AGENTS-playbook-memory-학습정리.md) | 에이전트 전환 |
