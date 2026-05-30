# Simple CMS

> 실무형 관리자 CMS와 공개 웹을 함께 구현한 Next.js 풀스택 한글 CMS 모노레포

Next.js 기반의 관리자 CMS와 공개 웹을 하나의 모노레포에서 분리 운영하고, RBAC, 감사 로그, 콘텐츠 버전 관리, 미디어 참조 추적, 통합 검색, SEO, 접근성, CI/CD까지 CMS 운영에서 자주 마주치는 요구사항을 종합적으로 구현한 프로젝트입니다.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL%20%2B%20PGroonga-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright)](https://playwright.dev)

---

## 시연용 링크

- **web**: `<DEMO_URL>`
- **admin**: `<DEMO_URL>/_cms/admin/login`
- **web Storyboook**: `<DEMO_URL>/_cms/admin/login`
- **admin Storybook**: `<DEMO_URL>/_cms/admin/login`

### 추천 확인 흐름

1. 관리자 로그인 후 사용자 승인제와 역할 기반 권한 관리 확인
2. 서브페이지에서 블록 기반 콘텐츠 작성, 발행, 버전 저장, 롤백 흐름 확인
3. 미디어 라이브러리에서 이미지 업로드, 중복 방지, 사용처 추적 확인
4. 공개 웹에서 SSR 페이지, 통합 검색, 동적 메타데이터, Schema.org 구조화 데이터 확인
5. 권한이 다른 계정으로 로그인해 사이드바 노출과 API 403 응답 확인
6. 시연 모드에서 방문자별 데이터가 분리되는지 확인

---

## 프로젝트 핵심 요약

| 구분        | 내용                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| 목적        | 실무 CMS에서 반복적으로 필요한 권한, 콘텐츠 운영, 감사 로그, 검색, SEO, 접근성, 배포 구조를 하나의 프로젝트로 구현 |
| 핵심 설계   | admin/web Next.js 앱 분리, DB 공용 패키지, 관리자 장애가 공개 웹으로 전파되지 않는 구조                            |
| 주요 기능   | RBAC, 감사 로그, 콘텐츠 버전 관리, 블록 기반 페이지, 미디어 참조 추적, 사이트 브랜딩, 통합 검색, SEO               |
| 차별화 요소 | `defineRoute` API factory, DEMO_MODE 멀티 테넌트 격리, design.md SSOT, PGroonga 검색, 2-track 테스트 전략          |
| 품질 관리   | 280+ 테스트, GitHub Actions matrix, Playwright nightly E2E, axe-core WCAG AA 검사, FSD 의존성 검사                 |
| 배포 전략   | 운영 self-host(Docker compose)와 시연 모드(Vercel + Supabase)를 동일 코드베이스에서 분기                           |

---

## 주요 성과

- **관리자 CMS와 공개 웹을 분리한 모노레포 구조 설계**
  `apps/admin`은 콘텐츠·사용자·권한·미디어·감사 로그 등 운영 CRUD를 담당하고, `apps/web`은 공개 웹 SSR, KRDS UI, PGroonga 검색, SEO를 담당하도록 분리했습니다. 공개 웹은 admin API에 의존하지 않고 DB 패키지를 통해 직접 읽기 접근해 관리자 장애가 공개 서비스로 전파되지 않도록 설계했습니다.

- **RBAC · 감사 로그 · API 표준화 구현**
  권한 검증, Zod 요청 파싱, 도메인 핸들러, 감사 로그, 응답 래핑을 `defineRoute` API factory로 표준화했습니다. 반복되는 관리자 API 로직을 공통화해 권한 체크나 감사 로그 누락 위험을 줄였습니다.

- **콘텐츠 운영 기능 구현**
  블록 기반 서브페이지, 발행/초안 상태, 미리보기 토큰, 콘텐츠 버전 이력, 소프트 롤백, 핀 보존, 낙관적 동시성 제어를 구성했습니다. 운영자가 실수해도 복구 가능한 CMS 흐름을 목표로 설계했습니다.

- **미디어 라이브러리 참조 추적 설계**
  SHA-256 contentHash로 중복 업로드를 방지하고, 본문 Tiptap 이미지, 대표 이미지, 홈 섹션, 팝업, 버전 스냅샷, 사이트 브랜딩 등 여러 위치에서 미디어 사용처를 추적했습니다. 사용 중인 미디어의 실수 삭제를 방지하는 구조를 만들었습니다.

- **통합 검색과 SEO 구조 구현**
  PostgreSQL + PGroonga를 사용해 별도 검색 엔진 없이 통합 검색을 구현했습니다. 공개 웹에는 동적 메타데이터, sitemap.xml, robots.txt, Schema.org JSON-LD를 적용해 CMS 콘텐츠가 검색 엔진에 노출될 수 있는 구조를 구성했습니다.

- **디자인 시스템 일관성 검증**
  디자이너 부재 환경에서 `apps/admin/design.md`를 시각 결정의 단일 진실원으로 두고, CSS 토큰과 문서 색상 값의 차이를 ΔE2000 기준으로 검증하는 `design:verify` 스크립트를 만들었습니다.

- **테스트와 CI/CD 품질 인프라 구성**
  jsdom 기반 unit 테스트와 실제 브라우저 기반 Storybook/Playwright 테스트를 분리했습니다. GitHub Actions matrix, nightly E2E, axe-core 접근성 검사, FSD 의존성 검사를 통해 회귀를 자동 감지하는 구조를 만들었습니다.

---

## 프로젝트 배경

공공기관과 기업용 웹 서비스를 운영하다 보면 단순 게시판 CRUD를 넘어서는 관리자 시스템 요구사항이 반복적으로 등장합니다.

- 사용자 승인제와 역할 기반 권한 관리
- 메뉴별 CRUD 권한 제어
- 데이터 변경 이력과 감사 로그
- 콘텐츠 발행, 미리보기, 버전 관리, 롤백
- 미디어 업로드와 사용처 추적
- 사이트 브랜딩, SEO, sitemap, robots 관리
- 통합 검색과 접근성 검증
- 운영 환경과 시연 환경의 분리

이 프로젝트는 위 요구사항을 Next.js 기반 모노레포에서 한 번에 다뤄보기 위해 시작했습니다. 목표는 단순히 기능이 많은 CMS를 만드는 것이 아니라, **운영 가능한 인프라, 유지보수 가능한 코드 경계, 테스트 가능한 품질 구조, 미래 개발자에게 인계 가능한 결정 로그**를 함께 갖춘 실무형 CMS를 설계하는 것이었습니다.

---

## 주요 기능

### Admin — 관리자 CMS

- **인증과 사용자 관리**
  커스텀 DB 세션, httpOnly cookie, 비밀번호 변경, 가입 승인제(PENDING → ACTIVE), 동시 로그인 정책을 구현했습니다.

- **역할 기반 권한 관리(RBAC)**
  역할 CRUD, 메뉴별 CRUD 권한 매트릭스, 사이드바 권한 필터링, 클라이언트 권한 게이팅을 제공합니다.

- **블록 기반 서브페이지 관리**
  RICH_TEXT, HTML, IMAGE, IFRAME 4가지 블록을 자유롭게 배치할 수 있습니다. HTML 블록은 Monaco Editor로 작성하고, 페이지 스코프 CSS를 적용해 스타일 누수를 방지합니다.

- **콘텐츠 버전 관리**
  운영자가 명시적으로 버전을 저장하거나 발행 전환 시 자동 백업을 생성합니다. 이전 버전으로 롤백할 때 현재 상태를 PRE_ROLLBACK 버전으로 보존합니다.

- **미디어 라이브러리**
  이미지 업로드, SHA-256 중복 방지, 미디어 상세 확인, 일괄 삭제, 사용처 추적을 제공합니다. 본문 이미지도 Tiptap image node의 `mediaId`로 추적합니다.

- **사이트 설정과 브랜딩**
  사이트명, 로고, favicon, OG 이미지, SEO 기본값, 업로드 정책, 보안 정책, 역할, 시연 스냅샷을 관리합니다.

- **감사 로그와 운영 통계**
  데이터 변경과 인증 이벤트를 기록하고, 필터링과 Excel 내보내기를 지원합니다. 공개 웹의 익명 만족도 조사 결과도 통계로 확인할 수 있습니다.

### Web — 공개 웹

- **SSR 기반 공개 페이지**
  admin에서 관리한 메뉴, 서브페이지, 게시판, 게시글, 홈 섹션을 공개 웹에서 SSR로 렌더링합니다.

- **KRDS 기반 UI**
  한국 정부 공식 디자인 시스템 기반 레이아웃을 사용해 공공기관 웹에 가까운 구조와 접근성을 고려했습니다.

- **PGroonga 통합 검색**
  PostgreSQL 확장인 PGroonga를 사용해 별도 Elasticsearch 없이 통합 검색을 제공합니다.

- **동적 SEO**
  페이지별 metadata, Open Graph, canonical, sitemap.xml, robots.txt, Schema.org JSON-LD를 생성합니다.

- **미리보기와 피드백**
  admin에서 발행 전 콘텐츠를 web 도메인에서 미리 볼 수 있도록 preview token 교환 구조를 만들고, 공개 페이지에는 익명 만족도 조사를 제공합니다.

- **에러 캡처**
  공개 웹에서 발생한 런타임 에러를 fingerprint 기준으로 그룹핑해 admin 에러 로그로 전송합니다.

---

## 기술 스택

### Framework / Language

- **Next.js 16**: admin과 web 모두 App Router 기반 구성
- **React 19**: 관리자 UI와 공개 웹 UI 구성
- **TypeScript strict**: 도메인 DTO, API schema, Prisma 타입 기반 개발
- **pnpm + Turborepo**: 모노레포 패키지 관리와 병렬 작업 실행

### Data / Backend

- **PostgreSQL + PGroonga**: CMS 데이터 저장과 통합 검색
- **Prisma 7**: schema-first 모델링, 타입 생성, Prisma extension 기반 DEMO_MODE 격리
- **Custom DB Session**: bcryptjs, crypto.randomUUID, httpOnly cookie 기반 인증
- **Zod**: API 요청 body, params, searchParams 검증

### Admin UI

- **Tailwind CSS v4 + shadcn/ui wrapper**: 관리자 디자인 시스템 구현
- **Base UI React / Radix 계열 primitives**: Dialog, Select, Popover 등 접근성 기반 UI
- **Tiptap 3**: 리치 텍스트 편집과 mediaId 보존
- **Monaco Editor**: HTML 블록과 페이지 스코프 CSS 편집
- **dnd-kit**: 메뉴, 홈 섹션, 블록 순서 변경
- **TanStack Query 5**: 관리자 데이터 fetching, cache, invalidation
- **Zustand**: UI 전용 상태 관리
- **react-hook-form + Zod**: 폼 상태와 검증
- **recharts / exceljs**: 통계 차트와 Excel 내보내기

### Web UI / SEO

- **KRDS React / KRDS UIUX**: 공개 웹 레이아웃
- **Swiper**: 홈 섹션 캐러셀
- **isomorphic-dompurify**: SSR 호환 HTML sanitize
- **Schema.org JSON-LD**: Article, BreadcrumbList, Organization, WebSite 구조화 데이터

### Quality / Deploy

- **Vitest**: unit, schema, pure logic, hook 테스트
- **Storybook + Playwright Browser Mode**: 실제 브라우저 기반 UI interaction 테스트
- **Playwright E2E**: golden flow, admin auth, RBAC matrix, web navigation, accessibility
- **@axe-core/playwright**: WCAG AA 접근성 검사
- **GitHub Actions**: lint, typecheck, test, build matrix와 nightly E2E
- **Docker compose**: 운영 self-host 배포
- **Vercel + Supabase**: 시연 모드 배포

---

## 아키텍처 하이라이트

### 1. Admin/Web 분리 모노레포

**문제**
관리자 CMS와 공개 웹을 하나의 서비스로 강하게 결합하면, 관리자 장애가 공개 웹 장애로 이어질 수 있습니다. 또한 관리자 API를 공개 웹이 호출하는 구조는 장애 격리와 성능 측면에서 불리합니다.

**접근**
모노레포 안에 `apps/admin`과 `apps/web`을 별도 Next.js 앱으로 분리했습니다. admin은 모든 변경 작업과 BFF API를 담당하고, web은 `packages/db`를 통해 읽기 전용으로 DB에 접근합니다.

**결과**
관리자 앱이 장애를 겪더라도 공개 웹은 독립적으로 SSR 렌더링을 수행할 수 있습니다. 데이터 변경 책임은 admin으로 모으고, 공개 웹은 읽기 전용으로 운영해 역할 경계를 명확히 했습니다.

---

### 2. RBAC + 감사 로그 + `defineRoute` API Factory

**문제**
관리자 API가 늘어날수록 권한 체크, 요청 검증, 에러 처리, 감사 로그, 응답 포맷이 라우트마다 반복됩니다. 이 과정에서 권한 검증이나 감사 로그가 누락될 수 있습니다.

**접근**
`defineRoute` API factory로 인증, 인가, Zod 파싱, 도메인 핸들러 실행, 감사 로그 기록, 응답 래핑을 표준화했습니다. bulk 작업은 `defineBulkOperation`으로 분리해 일괄 삭제·이동 같은 패턴도 공통화했습니다.

**결과**
관리자 API의 반복 구조가 줄고, 권한과 감사 로그가 라우트 작성 규칙 안에 포함되었습니다. 24개 라우트를 우선 마이그레이션했고, 나머지 도메인은 같은 패턴으로 점진 확장할 수 있게 했습니다.

---

### 3. 블록 기반 콘텐츠 모델과 페이지 스코프 CSS

**문제**
운영자는 페이지마다 자유롭게 레이아웃과 스타일을 구성하고 싶어 하지만, 사용자 입력 HTML/CSS는 XSS와 스타일 누수 위험이 있습니다.

**접근**
서브페이지 콘텐츠를 RICH_TEXT, HTML, IMAGE, IFRAME 4가지 블록으로 모델링했습니다. HTML 블록은 `scopeCustomCss(css, subpageId)`를 통해 셀렉터 앞에 `#subpage-{id}` prefix를 주입하고, `html`, `body`, `:root` 셀렉터를 페이지 컨테이너로 치환했습니다.

**결과**
페이지별 커스텀 CSS를 허용하면서도 다른 페이지로 스타일이 새는 문제를 줄였습니다. HTML은 DOMPurify로 sanitize하고, iframe은 YouTube/Vimeo 화이트리스트를 서버에서 재검증했습니다.

---

### 4. 콘텐츠 버전 관리와 소프트 롤백

**문제**
CMS 운영자는 발행 후 실수하거나, 여러 사람이 동시에 편집하거나, 과거 상태로 되돌려야 하는 상황을 자주 마주칩니다.

**접근**
서브페이지 버전 이력, 수동 저장, 발행 시 자동 백업, PRE_ROLLBACK 자동 백업, 핀 보존, lazy cleanup 정책을 구현했습니다. 롤백 시에는 현재 상태를 먼저 백업한 뒤 선택한 버전의 메타와 블록 스냅샷을 복원합니다.

**결과**
운영자가 실수해도 이전 상태로 복구할 수 있고, 롤백 자체도 감사 가능한 이력으로 남길 수 있습니다. 버전 메모는 깃 커밋 메시지처럼 subject/body 구조로 파싱해 목록에서 읽기 쉽게 표시합니다.

---

### 5. 미디어 라이브러리 참조 추적

**문제**
CMS에서 이미지를 단순 파일로만 관리하면 중복 업로드가 많아지고, 사용 중인 이미지를 삭제해 페이지가 깨지는 문제가 발생할 수 있습니다.

**접근**
업로드 파일의 SHA-256 contentHash를 계산해 중복 업로드를 방지했습니다. 삭제 전에는 대표 이미지, Tiptap 본문 이미지, 홈 섹션, 팝업, 버전 스냅샷, 사이트 브랜딩 설정 등 여러 위치에서 사용처를 탐색합니다.

**결과**
이미 사용 중인 미디어는 삭제를 차단하고, 일괄 삭제 시에도 참조 없는 항목만 부분 성공 처리할 수 있습니다. Tiptap image node에 `mediaId`를 보존해 본문 이미지도 추적 가능하게 만들었습니다.

---

### 6. PGroonga 기반 통합 검색과 SEO

**문제**
CMS 공개 웹은 게시글과 서브페이지가 검색 가능해야 하지만, 별도 Elasticsearch를 운영하면 개인 프로젝트와 소규모 운영 환경에서는 인프라 부담이 큽니다.

**접근**
PostgreSQL 확장인 PGroonga를 사용해 DB 안에서 통합 검색을 처리했습니다. 공개 웹에서는 동적 metadata, canonical, sitemap.xml, robots.txt, Schema.org JSON-LD를 생성하도록 구성했습니다.

**결과**
별도 검색 엔진 없이 PostgreSQL만으로 통합 검색을 제공하고, CMS 콘텐츠가 검색 엔진에 노출될 수 있는 기본 SEO 구조를 갖췄습니다.

---

### 7. DEMO_MODE 멀티 테넌트 격리

**문제**
시연 사이트는 여러 방문자가 동시에 체험할 수 있어야 하지만, 서로의 데이터가 섞이면 안 됩니다. 동시에 운영 self-host와 시연 모드를 같은 코드베이스로 유지하고 싶었습니다.

**접근**
DEMO_MODE에서는 방문자마다 `sessionId`를 부여하고, 주요 모델에 `sessionId` 컬럼과 composite unique를 적용했습니다. Prisma extension과 AsyncLocalStorage를 사용해 요청 단위 sessionId를 쿼리에 자동 주입했습니다.

**결과**
시연 모드에서는 방문자별로 격리된 DB 뷰를 제공하고, 운영 환경에서는 extension을 적용하지 않아 추가 비용 없이 일반 쿼리로 동작합니다. 하나의 master 브랜치에서 운영과 시연 양쪽을 지원할 수 있게 했습니다.

---

### 8. design.md SSOT와 디자인 토큰 검증

**문제**
디자이너가 없는 환경에서 관리자 UI를 계속 확장하면 색상, 간격, 라운드, shadow 같은 시각 결정이 코드와 문서 사이에서 쉽게 어긋납니다.

**접근**
`apps/admin/design.md`를 시각 결정의 단일 진실원으로 두고, `globals.css`의 oklch 토큰과 design.md의 hex 값 차이를 ΔE2000 기준으로 검증하는 스크립트를 만들었습니다. shadcn 원본 직접 import는 ESLint로 제한하고 wrapper 경유를 강제했습니다.

**결과**
디자인 토큰 드리프트를 CI에서 감지할 수 있고, UI primitives를 wrapper로 통일해 관리자 화면의 일관성을 유지할 수 있게 했습니다.

---

### 9. 테스트와 CI/CD 품질 인프라

**문제**
CMS는 권한, 폼 검증, 드래그 앤 드롭, 브라우저 API, 접근성처럼 jsdom만으로 검증하기 어려운 영역이 많습니다.

**접근**
테스트를 두 트랙으로 나눴습니다. 순수 함수, Zod schema, 훅 pure logic은 Vitest unit(jsdom)에서 검증하고, ResizeObserver, Swiper, 폼 interaction, 권한별 UI는 Storybook + Playwright real browser에서 검증했습니다. E2E는 golden flow, admin auth, RBAC matrix, web navigation, 접근성을 포함합니다.

**결과**
280+ 테스트와 GitHub Actions matrix를 통해 lint, typecheck, test, build를 자동화했습니다. nightly E2E와 axe-core 검사로 주요 사용자 흐름과 접근성 회귀를 감지할 수 있게 했습니다.

---

## 구현 범위

### 완료된 핵심 범위

- admin / web Next.js 앱 분리 모노레포
- PostgreSQL + PGroonga + Prisma 기반 데이터 계층
- 커스텀 DB 세션 인증
- 가입 승인제와 동시 로그인 정책
- 역할 기반 권한 관리와 권한 매트릭스
- 사용자, 역할, 서브페이지, 게시판, 게시글, 메뉴, 홈 섹션, 팝업, 미디어 관리
- 블록 기반 콘텐츠 모델
- 서브페이지 버전 이력과 롤백
- 미디어 중복 방지와 참조 추적
- 사이트 브랜딩과 SEO 설정
- 공개 웹 SSR, 검색, 동적 메타데이터, Schema.org JSON-LD
- 감사 로그, 에러 로그, 만족도 통계
- 운영 self-host 배포 가이드
- 시연 모드 배포 가이드
- 280+ 테스트와 CI/CD 품질 인프라

### 진행 중이거나 점진 확장 대상

- `defineRoute` factory의 모든 도메인 라우트 확대 적용
- HTML 블록 CSS 스코프 처리의 고급 CSS 문법 대응
- DEMO_MODE raw SQL 작성 규칙 자동 검사 강화
- 운영 모니터링과 백업 자동화 고도화
- 문서와 실제 배포 환경 간 drift 점검 자동화

---

## 프론트엔드 구조

Simple CMS는 Feature-Sliced Design을 기반으로 admin과 web의 레이어를 나눴습니다.

```txt
web (정석 FSD)                     admin (경량 FSD)
─────────────────                  ─────────────────
app/                               app/
 └─ pages/                          └─ pages/
     └─ widgets/                        └─ features/
         └─ features/                       └─ entities/
             └─ entities/                       └─ shared/
                 └─ shared/
```

### 의존성 규칙

- `pages` → `features`, `entities`, `shared`
- `features` → `entities`, `shared`
- `entities` → `shared`
- 역방향 import 금지
- 같은 레이어의 슬라이스 간 직접 import 금지
- 공유가 필요한 로직은 하위 레이어로 이동

### Next.js와 FSD 충돌 회피

Next.js Pages Router와 FSD의 `src/pages` 명명 충돌을 피하기 위해 루트의 `pages/`는 placeholder로 두고, 실제 FSD pages 레이어는 `src/pages/` 아래에 유지했습니다.

```txt
apps/{app}/
├── app/              # Next.js App Router
├── pages/            # Pages Router placeholder
└── src/
    ├── pages/        # FSD pages layer
    ├── widgets/      # web only
    ├── features/
    ├── entities/
    └── shared/
```

이 구조는 `/check-fsd` CI 검사로 의존성 위반을 자동 감지하도록 구성했습니다.

---

## 테스트와 품질 관리

### 2-track Vitest 전략

| 트랙              | 환경                | 검증 대상                                                             |
| ----------------- | ------------------- | --------------------------------------------------------------------- |
| Unit              | jsdom               | 순수 함수, Zod schema, Prisma builder, hook pure logic                |
| Storybook Browser | Playwright Chromium | 폼 validation, hover/focus, scroll, ResizeObserver, Swiper, 권한별 UI |

jsdom에서 재현하기 어려운 브라우저 API 의존 UI는 실제 브라우저 기반 테스트로 분리했습니다.

### Playwright E2E

- Golden flow
- Admin 로그인/로그아웃/PENDING 분기
- RBAC matrix: Owner/Editor/Viewer × 사이드바 노출 × API 403
- Web navigation
- axe-core 기반 WCAG AA 접근성 검사

### GitHub Actions

- admin/web × lint, typecheck, test, build matrix
- packages typecheck
- nightly E2E
- demo keepalive cron
- FSD 의존성 위반 PR 차단

---

## 개발 과정

이 프로젝트는 16개 Stage로 나누어 점진적으로 개발했습니다. 각 Stage는 단순히 백엔드나 UI만 따로 끝내는 방식이 아니라, 기능 단위로 UI, API, 테스트, 문서를 함께 완성하는 수직 슬라이싱 방식을 목표로 했습니다.

대표 진행 흐름은 다음과 같습니다.

| Stage | 내용                                                                                     |
| ----- | ---------------------------------------------------------------------------------------- |
| 1~3   | 모노레포 초기화, Prisma schema, 인증, 사용자/권한, 서브페이지/게시판/메뉴/감사 로그      |
| 4     | 공개 웹 SSR, KRDS 레이아웃, PGroonga 검색, 에러 캡처                                     |
| 5~6   | 홈 섹션, 미디어 라이브러리, 블록 기반 콘텐츠 모델                                        |
| 7     | 미리보기, HTML 블록 CSS, 운영 UX, Storybook/Vitest 2-track, 브랜딩, 버전 관리            |
| 8~10  | Docker 배포, SEO, 사용자 피드백 통계                                                     |
| 11~12 | 타입 안전성, N+1 점검, 접근성, E2E, RBAC, 데이터 무결성 테스트                           |
| 13~16 | DnD staged save, PageHeader/PageToolbar 공통화, design.md SSOT, API factory 마이그레이션 |

의사결정과 트레이드오프는 `docs/stages/`에 Stage별 deep-dive 문서로 정리했습니다.

---

## 로컬 개발

### 사전 요구사항

- Node.js 22 이상
- pnpm 10 이상
- Docker
- PostgreSQL + PGroonga 컨테이너

### 실행

```bash
git clone <repo-url> simple-cms
cd simple-cms

pnpm install

# Postgres + PGroonga 컨테이너 실행
docker compose -f docker/docker-compose.yml up -d db

# 스키마 + 검색 인덱스 + 시드
pnpm db:push
pnpm db:pgroonga
pnpm db:seed

# admin(3001) + web(3000) 동시 실행
pnpm dev
```

### 주요 명령어

```bash
pnpm dev             # admin + web 개발 서버
pnpm build           # 전체 빌드
pnpm lint            # 전체 lint
pnpm typecheck       # 전체 타입 검사
pnpm test            # 테스트 실행
pnpm e2e             # Playwright E2E
pnpm storybook       # Storybook 실행
pnpm db:push         # Prisma schema push
pnpm db:pgroonga     # PGroonga 확장 + 검색 인덱스 설정
pnpm db:seed         # 기본 관리자 + 역할 시드
pnpm db:demo-seed    # 시연 모드 seed 생성
pnpm --filter @simple-cms/admin design:verify
```

---

## 배포

### 운영 self-host

운영 환경은 Docker compose 기반으로 admin, web, PostgreSQL + PGroonga를 함께 구성합니다.

```bash
cp .env.example .env
# SESSION_SECRET, FEEDBACK_IP_SALT 등 강한 랜덤 값 설정

docker compose -f docker/docker-compose.yml up -d db
pnpm install --frozen-lockfile
pnpm db:push
pnpm db:pgroonga
pnpm db:seed
docker compose -f docker/docker-compose.yml up -d admin web
```

### 시연 모드

시연 모드는 Vercel + Supabase 기반으로 구성하고, `DEMO_MODE=true` 환경변수로 visitor별 격리 로직을 활성화합니다.

```bash
pnpm db:push
pnpm db:pgroonga
pnpm db:demo-seed
```

운영과 시연은 같은 master 브랜치와 같은 코드베이스를 사용하며, 환경변수로 동작 모드를 분기합니다.

---

## 한계와 개선 예정

- **DEMO_MODE 쿼리 작성 규칙 부담**
  sessionId 자동 주입을 Prisma extension으로 처리하지만, raw SQL이나 일부 복잡한 쿼리는 개발자가 명시적으로 sessionId 조건을 확인해야 합니다. 향후 lint 또는 테스트로 보강할 수 있습니다.

- **HTML 블록 CSS 스코프 한계**
  일반 셀렉터 prefix는 처리하지만 `:is()`, `:where()`, `:has()`, CSS nesting, 일부 `@container` 문법은 완전 지원하지 않습니다. 필요 시 PostCSS 기반 prefix 도구 도입을 검토할 수 있습니다.

- **API factory 점진 적용 중**
  `defineRoute`는 주요 24개 라우트에 우선 적용했고, 모든 도메인 라우트에 완전히 적용된 상태는 아닙니다. 이후 도메인별로 점진 확장할 수 있습니다.

- **운영 모니터링 고도화 여지**
  GitHub Actions와 에러 로그 구조는 구성되어 있지만, 실제 운영 환경의 알림, 백업 자동화, 로그 수집 파이프라인은 추가 개선 여지가 있습니다.

- **개인 프로젝트 특성상 기능 범위가 큼**
  실무 CMS 요구사항을 폭넓게 다루다 보니 README와 문서량이 많습니다. 포트폴리오에서는 핵심 하이라이트 중심으로 먼저 설명하고, 상세 문서는 후속 참고 자료로 두는 것이 적합합니다.
