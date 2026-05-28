# Simple CMS — 풀스택 한글 CMS 모노레포

> Next.js 16 · Prisma 7 · PostgreSQL+PGroonga · FSD · TypeScript strict 기반의 관리자 CMS와 공개 웹.
> 16개 Stage에 걸쳐 누적된 RBAC · 감사 로그 · 콘텐츠 버전 관리 · SEO · 한글 검색 · 디자인 시스템 · 멀티 테넌트 격리 · CI/CD까지 포함한 실무 수준 프로젝트.

```
Next.js 16  ·  React 19  ·  TypeScript 5 (strict)  ·  Prisma 7  ·  PostgreSQL + PGroonga
Tailwind v4  ·  shadcn/ui  ·  KRDS  ·  Tiptap 3  ·  TanStack Query 5  ·  pnpm + Turborepo
```

🔗 **Live Demo (web)** — `<DEMO_URL>`
🔗 **Live Demo (admin)** — `<DEMO_URL>/_cms/admin/login`

🟢 **16 Stage 완료** · **280+ 테스트** · **GitHub Actions matrix** · **Playwright nightly E2E** · **axe-core WCAG AA**

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [한 눈에 보기 — 4개 카테고리 하이라이트](#2-한-눈에-보기--4개-카테고리-하이라이트)
3. [기술 스택](#3-기술-스택)
4. [아키텍처](#4-아키텍처)
5. [엔지니어링 딥다이브](#5-엔지니어링-딥다이브-6개-결정)
6. [품질·테스트 인프라](#6-품질테스트-인프라)
7. [기능 카탈로그](#7-기능-카탈로그)
8. [개발 프로세스 — Stage 진행 표](#8-개발-프로세스--stage-진행-표)
9. [Quick Start](#9-quick-start)
10. [프로젝트 구조](#10-프로젝트-구조)
11. [문서](#11-문서)

---

## 1. 프로젝트 소개

### 무엇

같은 모노레포에서 두 개의 Next.js 앱을 운영한다.

- **admin (port 3001)** — 관리자 CMS. 콘텐츠 / 사용자 / 권한 / 미디어 / 감사 로그 등 모든 CRUD를 담당. 디자이너 부재 환경에서 직접 정의한 디자인 시스템(`apps/admin/design.md`)을 단일 진실원으로 사용한다.
- **web (port 3000)** — 공개 웹. SSR + KRDS(한국 정부 공식 디자인 시스템) + PGroonga 한글 검색 + Schema.org 구조화 데이터 + 동적 메타데이터. admin API를 호출하지 않고 `packages/db`로 DB에 직접 접근해 **장애 격리**를 보장한다.

### 왜

> "RBAC · 감사 로그 · 콘텐츠 버전 관리 · SEO · 한글 검색 · 접근성 · 디자인 일관성 — 실무에서 CMS를 만들 때 한 번씩은 만나는 요구사항을 한 곳에서 종합적으로 다뤄보고 싶었다."

세 가지 추가 도전을 함께 풀었다.

1. **멀티 테넌트 격리** — 같은 코드/DB로 운영과 시연 양쪽을 지원. 시연 모드에서는 방문자별 격리된 DB 뷰를 제공.
2. **디자인 시스템 SSOT** — 디자이너 없이도 코드/문서 드리프트를 막기 위해 ΔE2000 토큰 검증 스크립트(`pnpm design:verify`)로 보호.
3. **점진적 빌드 + 결정 로그** — 32개의 `docs/stages/stage-{id}.md` 문서로 의사결정 근거를 미래의 나에게 인계.

### 두 가지 배포 트랙

| 트랙               | 용도      | 인프라                                           | 가이드                                                                             |
| ------------------ | --------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **운영 self-host** | 실제 운영 | Docker compose (admin + web + Postgres+PGroonga) | [`docs/react-cms-운영-배포-가이드.md`](docs/react-cms-운영-배포-가이드.md)         |
| **시연 모드**      | 데모/체험 | Vercel + Supabase + DEMO_MODE 격리               | [`docs/react-cms-시연모드-배포-가이드.md`](docs/react-cms-시연모드-배포-가이드.md) |

`DEMO_MODE=true` 환경변수 한 줄로 두 트랙이 분기된다. master 브랜치 단일 코드베이스에서 양쪽이 모두 동작한다.

---

## 2. 한 눈에 보기 — 4개 카테고리 하이라이트

### 🎯 운영자(사용자) 측면 — 풍부한 CMS 기능

- **권한 매트릭스 RBAC** — 역할 CRUD + 메뉴별 CRUD 권한 매트릭스 + 사이드바 권한 필터링 + 가입 승인제(PENDING→ACTIVE) + 동시 로그인 정책
- **블록 기반 서브페이지** — RICH_TEXT / HTML / IMAGE / IFRAME 4타입을 자유 순서로 배치. 페이지마다 다른 페이지 스코프 CSS 작성 가능 (Monaco Editor + Tabs)
- **콘텐츠 버전 관리** — 이력 / 롤백(소프트) / 깃 스타일 메모 / 작성자·기간 필터 / 핀 보존. PRE_ROLLBACK 자동 백업 + 낙관적 동시성
- **미디어 라이브러리** — SHA-256 중복 방지 + 8개 위치 참조 추적 + 일괄 삭제(부분 성공)
- **사이트 브랜딩 + SEO** — 로고 / favicon / OG / 사이트명 + sitemap.xml + robots.txt + Schema.org JSON-LD 통합 관리
- **익명 사용자 만족도 조사** — IP 해싱 + 24h rate limit + recharts 통계 + Excel 내보내기

### 🔧 엔지니어링 측면 — 비일상적 기술 결정

- **DEMO_MODE 멀티 테넌트 격리** — 17개 모델 sentinel sessionId + 8개 모델 composite unique + Prisma extension + AsyncLocalStorage. 운영 비용 0 (extension 미적용)
- **`defineRoute` API factory** — 권한 / Zod 파싱 / 핸들러 / 감사 로그 / 응답 래핑을 단일 함수로 통합. 24개 라우트 적용 완료, 나머지 도메인 진행 중
- **블록 스코프 CSS** — `scopeCustomCss(css, subpageId)`가 셀렉터 prefix `#subpage-{id}` 주입 + `html`/`body`/`:root` 치환. iframe host 화이트리스트 서버 재검증
- **Snapshot export/import** — 14모델 in-memory walker로 mediaId/boardId 위치별 재매핑. cuid 재생성 + Phase 분리 트랜잭션 + Media binary sharp 1600px 리사이즈
- **Tiptap mediaId 보존** — image 노드 `attrs.mediaId` + HTML `data-media-id` 보존으로 본문 이미지도 Media 참조 추적 가능

### 🧪 품질 측면 — 테스트·관측 인프라

- **2-track Vitest** — unit(jsdom)으로 순수 함수·Zod·훅 pure logic / storybook(Playwright Chromium real browser)로 폼 validation·ResizeObserver·swiper 등 jsdom 재현 불가 영역
- **Playwright E2E** — 골든 플로우 + admin 인증 + web 탐색 + **RBAC 매트릭스** (Owner/Editor/Viewer × 사이드바·API 403) + 접근성
- **WCAG AA 접근성** — `@axe-core/playwright`로 자동 검사 + HeaderBranding aria-label + SVG aria-hidden
- **GitHub Actions matrix** — admin/web × {lint, typecheck, test, build} + packages typecheck + nightly E2E + 시연 keepalive cron
- **`/check-fsd` 스킬 CI 통합** — FSD 의존성 위반 PR 자동 차단 + `@fsd-allow` 블록 주석으로 기존 부채 문서화
- **fetch stub decorator** — MSW 호환성 이슈 회피용 `window.fetch` override decorator. ref-based cleanup으로 re-render 안전

### 📐 설계 측면 — 일관성 강제

- **FSD (Feature-Sliced Design)** — web은 정석 6레이어, admin은 경량 5레이어 (widgets 생략). Next.js Pages Router 충돌 회피를 위한 `app/` + `pages/` placeholder + `src/pages/` FSD 레이어 분리
- **design.md SSOT** — `apps/admin/design.md`가 시각 결정 단일 진실원. `pnpm design:verify`가 globals.css oklch ↔ design.md hex 간 ΔE2000 1.5 이내 자동 검증 (현재 max 1.29)
- **16 Stage 점진적 빌드** — 32개 deep-dive 문서로 의사결정 로그 보존. Stage 7c부터 결과 요약을 `docs/stages/`에 분리
- **"운영 기준 + 책임 분리 → 재사용성 + 단일 소스"** — 두 단계 우선순위 원칙. 책임 경계가 먼저, 재사용은 그 다음

---

## 3. 기술 스택

### 핵심 (실제 package.json 기준)

| 영역                | 도구                               | 버전                                             |
| ------------------- | ---------------------------------- | ------------------------------------------------ |
| **프레임워크**      | Next.js                            | `^16.1.6`                                        |
|                     | React                              | `^19.1.0`                                        |
|                     | TypeScript                         | `^5.8.3` (strict)                                |
| **모노레포**        | pnpm                               | `@10.33.0`                                       |
|                     | Turborepo                          | `^2.9.5`                                         |
|                     | Node                               | `>=22.0.0`                                       |
| **데이터**          | PostgreSQL + PGroonga              | `groonga/pgroonga` Docker                        |
|                     | Prisma ORM                         | `^7.7.0`                                         |
| **콘텐츠**          | Tiptap                             | `^3.22.3`                                        |
|                     | Monaco Editor                      | `^4.7.0` (HTML 블록 편집)                        |
| **클라이언트 상태** | TanStack Query                     | `^5.97.0`                                        |
|                     | Zustand                            | UI 상태 전용                                     |
| **관리자 UI**       | shadcn/ui + Tailwind               | Tailwind `^4.1.0`                                |
|                     | Base-UI React                      | `^1.3.0`                                         |
|                     | dnd-kit                            | `^6.3.1`                                         |
|                     | react-hook-form + zod              | `^7.72.1` + `^3.25.76`                           |
|                     | exceljs                            | `^4.4.0` (감사/피드백 내보내기)                  |
|                     | recharts                           | `^3.8.1`                                         |
| **공개 웹 UI**      | krds-react + krds-uiux             | `^1.1.0` (KRDS 정부 표준)                        |
|                     | Swiper                             | `^12.1.3`                                        |
|                     | isomorphic-dompurify               | SSR 호환 HTML 새니타이즈                         |
| **인증**            | 커스텀 DB 세션                     | bcryptjs `^3.0.3` + crypto.randomUUID + httpOnly |
| **테스트**          | Vitest                             | `^4` (unit + browser project)                    |
|                     | Playwright                         | `^1.59.1`                                        |
|                     | @axe-core/playwright               | `^4.11.2`                                        |
|                     | Storybook                          | `^10` (nextjs-vite)                              |
| **CI/CD**           | GitHub Actions                     | matrix + nightly + cron                          |
| **배포**            | Docker compose / Vercel + Supabase | 두 트랙                                          |
| **이미지 처리**     | sharp                              | `^0.34.5` (snapshot media resize)                |

### 라이브러리 선택 근거 (일부)

- **Prisma ORM (Drizzle 대신)** — schema-first 마이그레이션 + 자동 타입 + DEMO_MODE Prisma extension API 활용 (다른 ORM은 동등 패턴 없음)
- **PGroonga (Elasticsearch 대신)** — 한글 형태소 분석을 PostgreSQL 확장으로 인-프로세스 제공. 외부 검색 엔진 운영 부담 회피
- **Tiptap JSON (HTML 저장 대신)** — ProseMirror 정형화된 노드 구조로 admin↔web 렌더 무손실 + mediaId attribute 보존
- **bcryptjs (bcrypt native 대신)** — 순수 JS라 네이티브 빌드 불필요. Docker alpine 이미지 호환성
- **커스텀 세션 (NextAuth 대신)** — 동시 로그인 제어 + 서버 사이드 즉시 무효화 + 가입 승인제 등 비표준 요구를 단순한 DB 세션으로 직접 해결

---

## 4. 아키텍처

### ① Monorepo + 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                         simple-cms (모노레포)                       │
│                                                                     │
│  ┌─────────────────────┐                ┌──────────────────────┐   │
│  │  apps/admin (3001)  │                │   apps/web (3000)    │   │
│  │  ─────────────────  │                │   ─────────────────  │   │
│  │  - 관리자 CMS       │                │  - 공개 웹 (SSR)     │   │
│  │  - 모든 CRUD        │                │  - KRDS 정부 디자인  │   │
│  │  - BFF (자체 UI용)  │                │  - PGroonga 검색     │   │
│  │  - shadcn + design  │                │  - SEO + Schema.org  │   │
│  │  - FSD 경량 5레이어 │                │  - FSD 정석 6레이어  │   │
│  └──────────┬──────────┘                └──────────┬───────────┘   │
│             │                                       │               │
│             │ Prisma client                         │ Prisma client │
│             │ (admin 자체 BFF용)                    │ (admin 우회)  │
│             ▼                                       ▼               │
│      ┌─────────────────────────────────────────────────────┐       │
│      │                packages/db                          │       │
│      │  Prisma schema + client + auditLog + DEMO ext       │       │
│      └─────────────────────────────────────────────────────┘       │
│             │                                                       │
│             ▼                                                       │
│      ┌─────────────────────────────────────────────────────┐       │
│      │   PostgreSQL + PGroonga (groonga/pgroonga Docker)   │       │
│      └─────────────────────────────────────────────────────┘       │
│                                                                     │
│  공유 패키지: db / editor (Tiptap) / types (도메인 DTO) / config    │
└─────────────────────────────────────────────────────────────────────┘
```

**핵심 결정**: web이 admin API를 호출하지 않는다. admin 장애 시에도 web은 독립적으로 동작. 데이터 변경은 admin에서만 일어나며, web은 읽기만 한다.

### ② 요청 처리 흐름 (`defineRoute` factory)

```
┌──────────────────────────────────────────────────────────────────┐
│  HTTP Request → /api/{domain}/[id]                               │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  defineRoute({ resource, action, schema, handler, audit })      │
│  ─────────────────────────────────────────────────────────────  │
│   1. requirePermission(resource, action)                        │
│      └─ cookie session → getCurrentUser → hasPermission         │
│         └─ 미인증 401 / 권한 없음 403                            │
│   2. Zod parse (body / params / searchParams)                   │
│      └─ 검증 실패 400                                            │
│   3. handler(ctx) — 도메인 로직                                  │
│      └─ TResult | null | NextResponse 반환                       │
│   4. audit.build(result, ctx)                                   │
│      └─ logAuditEvent(fire-and-forget, 로깅 실패가 주 액션 차단 X)│
│      └─ 배열 반환 시 여러 entityType에 동시 기록                 │
│   5. { success: true, data: result } 자동 래핑                  │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                       HTTP 응답
```

**escape hatch**: handler가 `NextResponse`를 직접 반환하면 래핑 우회 (404 / 409 / 422 도메인 에러용). `null` 반환 시 audit skip (PATCH no-op 경로).

### ③ DEMO_MODE 멀티 테넌트 격리

```
┌────────────────────────────────────────────────────────────────────┐
│  visitor 첫 방문 (시크릿 창)                                       │
│  GET https://demo.example.com/                                     │
└────────────────────────────────────────────────────────────────────┘
                  │
                  ▼  (cookie session-token 없음)
┌────────────────────────────────────────────────────────────────────┐
│  layout gate: ensureDemoSession(currentPath)                       │
│     └─ /demo-bootstrap?next=... 로 redirect                        │
└────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  POST /_cms/admin/api/demo/bootstrap                               │
│  ─────────────────────────────────────────────────────────────    │
│    1. 새 cuid sessionId 발급                                       │
│    2. cloneSeedToSession(__SEED__ → newSessionId)                  │
│       └─ 14모델 in-memory remap clone (cuid2 사전 생성)            │
│       └─ NavigationMenuItem parentId 2-pass + 30s $transaction     │
│    3. demo_admin User로 Session 생성                               │
│    4. Set-Cookie: session-token=...; HttpOnly; Max-Age=3600        │
└────────────────────────────────────────────────────────────────────┘
                  │
                  ▼ (다음 요청부터)
┌────────────────────────────────────────────────────────────────────┐
│  layout gate가 cookie 검증 → enterWith({ sessionId })              │
│  AsyncLocalStorage가 요청 단위로 sessionId 전파                    │
└────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  packages/db Prisma extension                                      │
│  ─────────────────────────────────────────────────────────────    │
│    - 모든 query before hook: where에 sessionId 자동 주입           │
│    - 모든 mutation before hook: data에 sessionId 자동 주입         │
│    - result hook: cross-tenant data 자동 strip                     │
│                                                                    │
│   17개 모델: sessionId String @default("__PROD__")                 │
│    8개 모델: composite unique [sessionId, slug | key | name | ...] │
│                                                                    │
│   visitor A의 query → WHERE sessionId = 'cuid_A'                   │
│   visitor B의 query → WHERE sessionId = 'cuid_B'                   │
│   운영 query       → WHERE sessionId = '__PROD__' (extension 미적용)│
└────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  PostgreSQL — 단일 DB에 모든 테넌트 데이터 공존                    │
│  composite unique로 같은 slug가 visitor마다 1건씩 가능             │
└────────────────────────────────────────────────────────────────────┘
```

**운영 비용 0**: `DEMO_MODE` 미설정 환경에서는 `$extends`가 미적용되어 모든 query가 sentinel `'__PROD__'`에 대한 일반 query로 동작한다.

### FSD 레이어

```
web (정석 FSD)                     admin (경량 FSD)
─────────────────                  ─────────────────
app/                               app/
 └─ pages/                          └─ pages/
     └─ widgets/                        └─ features/
         └─ features/                       └─ entities/
             └─ entities/                       └─ shared/
                 └─ shared/
```

**의존성 규칙** (`/check-fsd` 스킬로 CI에서 검증):

```
pages → features, entities, shared  ✅
features → entities, shared         ✅
entities → shared                   ✅
역방향 import (shared → features) ❌
같은 레이어 슬라이스 간 직접 import ❌ (공유 시 하위 레이어로 내림)
```

**Next.js Pages Router 충돌 회피**:

```
apps/{앱}/
├── app/              # Next.js App Router (루트)
├── pages/            # Pages Router placeholder (README.md만)
└── src/
    ├── pages/        # FSD pages 레이어 (원래 이름 유지)
    ├── widgets/      # web만
    ├── features/
    ├── entities/
    └── shared/
```

---

## 5. 엔지니어링 딥다이브 (6개 결정)

### 5-1. DEMO_MODE 멀티 테넌트 격리 (최우선 차별점)

**문제**: 시연 사이트에 여러 방문자가 동시에 접근해도 각자 격리된 세션이 필요. 운영과 같은 코드/DB를 공유하면서.

**해법**:

1. **Sentinel sessionId 컬럼** — 17개 모델에 `sessionId String @default("__PROD__")` 추가. 운영 데이터는 모두 `'__PROD__'`, 시연 visitor는 각자의 cuid.
2. **Composite unique 전환** — 8개 모델의 단일 `@unique` → `@@unique([sessionId, slug | key | name | contentHash])`. 같은 slug가 visitor마다 1건씩 가능.
3. **Prisma extension** — `Prisma.defineExtension`이 모든 쿼리 hook에서 sessionId를 주입/검증. `DEMO_MODE === 'true'`일 때만 `$extends` 적용.
4. **AsyncLocalStorage** — 요청 단위로 sessionId 전파. layout gate가 cookie 검증 후 `enterWith({sessionId})` 부착 → 후속 await 체인 모든 query에 자동 적용.

**핵심 파일**:

- `packages/db/src/demo/clientExtension.ts` — Prisma extension 본체
- `packages/db/src/demo/sessionContext.ts` — AsyncLocalStorage + `enterWith` / `runWith` / `runWithBypass`
- `packages/db/src/demo/cloneSeedToSession.ts` — 14모델 in-memory remap clone
- `packages/db/src/demo/snapshotWalker.ts` — 14모델 mediaId/boardId 위치별 재매핑 (HERO `slides[].mediaId` / IMAGE `imageMediaId` / RICH_TEXT Tiptap recursion / SubpageVersion.snapshot)

**트레이드오프**:

- master 한 브랜치에서 운영/시연 양쪽 동작 → 새 쿼리 작성 시 관습 표 준수 필요 (`findUnique` → `findFirst`, raw SQL에 `AND "sessionId" = ${getCurrentSessionId()}` 명시 등)
- `id` 기반 lookup은 `findUnique` 유지 (extension의 result hook이 cross-tenant 응답을 자동 strip)
- 운영 환경에서는 extension 미적용으로 cost 0

### 5-2. `defineRoute` API factory

**문제**: 권한 체크 + Zod 파싱 + audit log + 에러 처리 + 응답 래핑이 50+ 엔드포인트에 반복됨. 누락 위험과 일관성 저하가 누적.

**해법**: 단일 함수가 인증→인가→파싱→핸들러→감사 로그→응답 래핑을 wrap.

```typescript
// apps/admin/src/shared/api/defineRoute.ts
export const PATCH = defineRoute({
  resource: 'subpages',
  action: 'update',
  paramsSchema: z.object({ id: z.string() }),
  bodySchema: subpageStatusSchema,
  handler: async ({ params, body, user }) => {
    const updated = await prisma.subpage.update({
      where: { id: params.id },
      data: { status: body.status },
    });
    return { subpage: updated };
  },
  audit: {
    entityType: 'SUBPAGE',
    action: 'UPDATE',
    build: (result, ctx) => ({
      entityId: result.subpage.id,
      entityTitle: `${result.subpage.title} (상태 변경)`,
      changes: {
        before: { status: ctx.before },
        after: { status: result.subpage.status },
      },
    }),
  },
});
```

- **단일 라우트** — handler가 TResult 반환 → audit build가 단일 entityType 기록
- **bulk 라우트** — `defineBulkOperation({idsSchema, perItem})`이 id 배열 순회 + `{ deleted, blocked }` 응답 자동 조립
- **다중 audit** — build가 배열 반환 시 여러 entityType 동시 기록 (rollback: SUBPAGE UPDATE + SUBPAGE_VERSION CREATE)
- **escape hatch** — handler가 `NextResponse` 직접 반환 시 래핑 우회 (404/409/422)
- **no-op** — handler가 `null` 반환 시 audit skip (PATCH 무변경 경로)

**적용 현황** (Stage 16b-1 / 16b-2 a/b/c):

- subpages 11 라우트 / posts 6 라우트 / boards 3 라우트 / media 4 라우트 = **24 라우트 마이그레이션 완료**
- 나머지 도메인은 16b-2 후속에서 점진 확장

**핵심 파일**:

- `apps/admin/src/shared/api/defineRoute.ts`
- `apps/admin/src/shared/api/defineBulkOperation.ts`
- `apps/admin/src/shared/api/renormalizeDisplayOrder.ts` (삭제 후 displayOrder 재정렬 헬퍼)

### 5-3. 블록 기반 콘텐츠 모델 + HTML 블록 스코프 CSS

**문제**: 운영자가 페이지마다 자유로운 레이아웃과 CSS를 원함. 그러나 XSS는 차단해야 하고, 한 페이지의 CSS가 다른 페이지에 새지 않아야 함.

**해법**: `PageBlock` 4타입 + 페이지 스코프 CSS 주입.

**블록 4타입**:

| 블록        | configJson                                                  | 특이사항                                         |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `RICH_TEXT` | `{ contentJson: TiptapJSON }`                               | Tiptap JSON 저장 + 검색용 plain text 별도 집계   |
| `HTML`      | `{ html, css? }` (각 max 100,000자)                         | Monaco Editor Tabs(HTML/CSS) + 페이지 스코프 CSS |
| `IMAGE`     | `{ imageUrl, imageAlt, imageMediaId?, caption?, linkUrl? }` | Media 라이브러리 참조 추적                       |
| `IFRAME`    | `{ src, title, aspectRatio, allowFullscreen }`              | YouTube/Vimeo 호스트 화이트리스트 서버 재검증    |

**HTML 블록 — 페이지 스코프 CSS 어떻게 격리하나**:

```typescript
// apps/web/src/shared/lib/scopeCustomCss.ts
// 입력: ".btn { color: red; } body { background: blue; }"
//       + subpageId = "abc123"
// 출력: "#subpage-abc123 .btn { color: red; } #subpage-abc123 { background: blue; }"
//   - 일반 셀렉터에 #subpage-{id} prefix 자동 주입
//   - html / body / :root 셀렉터는 #subpage-{id}로 치환 (body 스타일을 페이지 컨테이너로 한정)
//   - @keyframes / @font-face 등 at-rule은 prefix 미적용 (전역 의도)
```

같은 페이지의 여러 HTML 블록은 모두 동일한 `#subpage-{id}` prefix를 공유 → 페이지 단위 스코프 일관성 보장.

**XSS 방어 다층**:

1. **isomorphic-dompurify** 확장 새니타이즈 (section/article/iframe 등 의미론 태그 허용)
2. **iframe host 화이트리스트** — `@simple-cms/types`의 `IFRAME_ALLOWED_HOSTS` 단일 출처 (Stage 7k-1에서 admin/web 3곳 중복 해소). YouTube/Vimeo만 허용.
3. **`normalizeIframeEmbedUrl`** — `youtube.com/watch?v=ID` → `www.youtube.com/embed/ID` 자동 변환 (저장 시점에 admin client + server 양쪽 적용). YouTube가 `X-Frame-Options: sameorigin`으로 일반 시청 URL 임베드를 차단하기 때문.
4. **JS 완전 차단** — `<script>`, on-prefixed 이벤트, `javascript:` URL 모두 DOMPurify가 제거.

**핵심 파일**:

- `apps/web/src/shared/lib/scopeCustomCss.ts` + `scopeCustomCss.test.ts`
- `apps/web/src/widgets/subpage-content/ui/SubpageBlockRenderer.tsx`
- `packages/types/src/domain/block.types.ts` (IFRAME_ALLOWED_HOSTS 단일 출처)
- `apps/admin/src/features/block-management/ui/fields/HtmlBlockFields.tsx` (Monaco Tabs UI)

**알려진 한계**: `scopeCustomCss`는 `:is()` / `:where()` / `:has()` / `@container` / CSS nesting 완전 지원 불가. 필요 시 `postcss-prefix-selector` 도입 검토.

### 5-4. 미디어 라이브러리 — SHA-256 중복 방지 + 참조 추적

**문제**:

1. 운영자가 같은 이미지를 반복 업로드 → 스토리지 낭비
2. 운영자가 사용 중인 미디어를 실수로 삭제 → 페이지 깨짐

**해법**:

**중복 방지 (SHA-256 contentHash)**:

```typescript
// 업로드 시
const hash = crypto.createHash('sha256').update(buffer).digest('hex');
const existing = await prisma.media.findFirst({ where: { contentHash: hash } });
if (existing) return { media: existing, reused: true }; // 파일 저장 + 새 레코드 skip
```

`Media` 모델의 `[sessionId, contentHash]` composite unique로 visitor별 격리도 함께 보장.

**참조 추적 (`findMediaReferences`)** — 삭제 전 8개 위치 스캔:

| #   | 위치                                                          | 검색 방식                                 |
| --- | ------------------------------------------------------------- | ----------------------------------------- |
| 1   | `Subpage.featuredImageId`                                     | FK                                        |
| 2   | `Post.featuredImageId`                                        | FK                                        |
| 3   | `Subpage.contentJson` (Tiptap image 노드 `attrs.mediaId`)     | JSON 재귀                                 |
| 4   | `Post.contentJson` (Tiptap image 노드)                        | JSON 재귀                                 |
| 5   | `HomeSection.configJson` (HERO/RECOMMENDED slides)            | JSONB containment                         |
| 6   | `HomePopup.configJson` (IMAGE 타입 `imageMediaId`)            | JSONB containment                         |
| 7   | `SubpageVersion.snapshot` (블록 스냅샷의 image attrs.mediaId) | JSON 재귀                                 |
| 8   | `SiteSettings` (브랜딩 6키 — logo/favicon/og + alt 등)        | `MEDIA_BEARING_SETTING_KEYS` 화이트리스트 |

**핵심 파일**:

- `apps/admin/src/features/media-management/lib/findMediaReferences.ts` + `.test.ts`
- `apps/admin/src/features/media-management/lib/mediaBearingSettings.ts` (브랜딩 미디어 키 단일 출처)

**일괄 삭제 정책**:

- 의도적으로 **트랜잭션 미적용** — 참조 있는 건만 제외하고 나머지는 진행 (부분 성공)
- 응답: `{ deleted: string[], blocked: Array<{id, originalFilename, references}> }`
- zod `max(200)` 상한 — DOS 방어

### 5-5. 서브페이지 버전 관리 — 낙관적 동시성 + 소프트 롤백

**문제**:

1. 운영자가 발행 후 실수 → 되돌리기 필요
2. 같은 페이지를 두 명이 편집 → 마지막 쓰기 승리(LWW) 회피

**해법**:

**저장 트리거 (의미 있는 체크포인트만)**:

| 트리거                                    | sourceAction   | 생성 주체                             |
| ----------------------------------------- | -------------- | ------------------------------------- |
| 편집 페이지 [버전 저장]                   | `MANUAL`       | 운영자 명시적                         |
| Subpage PATCH 중 DRAFT → PUBLISHED 전환   | `AUTO_PUBLISH` | 서버 자동 (try/catch, 주 액션 차단 X) |
| `restoreSubpageFromVersion` 트랜잭션 내부 | `PRE_ROLLBACK` | 롤백 직전 현재 상태 자동 백업         |

**블록 reorder 및 CUD는 개별 버전을 만들지 않음** — 노이즈 폭증 방지.

**메모 구조 (깃 커밋 스타일)**:

- `SubpageVersion.label String? @db.Text` 단일 필드 (max 10,000자, 선택 입력)
- 첫 줄 = subject, 빈 줄 이후 = body. `parseVersionLabel`이 정규식으로 분리
- 목록 표시: subject 72자까지, 초과 시 `…` + hover tooltip

**낙관적 동시성 (`Subpage.revision`)** — rollback 엔드포인트에서만 적용:

- `expectedRevision` 불일치 시 `409 { code: 'REVISION_MISMATCH' }`
- 메타 PATCH와 블록 CUD/reorder는 guard 없음 (실사용 검증 중 React Query staleTime + Next.js route cache 상호작용으로 반복 409 발생 → UX 우선으로 제거)

**소프트 롤백** (`restoreSubpageFromVersion` 트랜잭션):

1. revision 낙관 락 검사 (불일치 시 409)
2. 현재 상태를 `PRE_ROLLBACK` 버전으로 자동 백업
3. slug 충돌 검사 (다른 Subpage가 이미 차지 시 409 + `VERSION_SLUG_CONFLICT` code)
4. Subpage 메타 덮어쓰기 + `revision++`
5. `pageBlock.deleteMany` → 스냅샷 블록 `createMany` (id 재생성)

**보존 정책** — 30개 lazy cleanup:

- `isPinned=false` 버전 Subpage당 30개 상한
- `isPinned=true`는 상한 제외 (운영자 영구 보존)
- save handler 내부 `enforceRetention` 호출 (cron 없음)

**핵심 파일**:

- `apps/admin/src/features/subpage-version/lib/parseVersionLabel.ts` + `summarizeBlockDiff.ts`
- `docs/stages/stage-7m.md` (전체 결정 로그)

### 5-6. 디자인 시스템 — design.md SSOT + ΔE2000 토큰 검증

**문제**: 디자이너 부재 환경에서 시각 일관성을 어떻게 유지하고, 코드와 문서가 드리프트하는 것을 어떻게 막을까?

**해법**: `apps/admin/design.md`를 시각 결정 단일 진실원으로 두고, 자동 검증 스크립트로 보호.

**문서 분담**:

| 문서                         | 책임                                                            |
| ---------------------------- | --------------------------------------------------------------- |
| `apps/admin/design.md`       | 시각 결정 (색·타이포·간격·라운드·primitives) — Stitch lint 가능 |
| `apps/admin/AGENTS.md`       | 운영 정책 (권한·감사로그·페이지 레이아웃 패턴)                  |
| `apps/admin/.storybook/`     | 실물 컴포넌트 시각 검증 + 인터랙션 회귀                         |
| `apps/admin/app/globals.css` | **runtime 진실원** — oklch 토큰 `:root` + `.dark` 페어          |

**ΔE2000 토큰 검증**:

```bash
pnpm --filter @simple-cms/admin design:verify
```

- globals.css의 oklch ↔ design.md YAML hex 간 ΔE2000 계산 (`culori` 라이브러리)
- 임계값 1.5 초과 시 `exit 1` → CI 차단
- 현재 22개 컬러 토큰 통과 (max ΔE = 1.29)

**점진적 통일 — Stage 15c series**:

| Stage  | 통일 항목                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------- |
| 15b    | shadow 토큰 3개 (card/toolbar/popover)                                                                  |
| 15c-1  | 5개 표면에 shadow 적용 + design.md toolbar 설명 정정                                                    |
| 15c-2  | shadow wrapper 4개 (Popover/Select/DropdownMenu/Sheet) + 27파일 swap + BooleanSwitchField + ESLint 가드 |
| 15c-3a | success/warning 시맨틱 토큰 신설 + `design:verify` 스크립트                                             |
| 15c-3b | Badge wrapper(success/warning variant) + chartColors helper                                             |
| 15c-3c | AlertDialog wrapper + ESLint 가드 + 24 호출처 swap                                                      |
| 15c-3d | Card baseline 보정 (rounded / padding / typography)                                                     |
| 15c-3e | AlertDialog size 3-tier (confirm/default/wide)                                                          |
| 15c-3f | Button wrapper + 폼 컨트롤 height 32px baseline 통일 + 92 imports 마이그레이션                          |

**ESLint 가드**:

- shadcn 원본 직접 import 차단 (`no-restricted-imports`)
- wrapper(Button/Popover/Select/DropdownMenu/Sheet/AlertDialog/Badge) 경유 강제

**핵심 파일**:

- `apps/admin/design.md` — 한글 8섹션 + 부록 A(Apple 영감) + 부록 B(영구 예외 등록부)
- `apps/admin/scripts/verify-design-tokens.mjs` — ΔE2000 검증
- `apps/admin/app/globals.css` — runtime 진실원

---

## 6. 품질·테스트 인프라

### 2-track Vitest

한 컴포넌트에 `*.stories.tsx`와 `*.test.tsx`를 동시에 두지 않는다 (겹치는 테스트 회피).

| 트랙          | 환경                               | 대상                                                                       | 파일명                          |
| ------------- | ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------- |
| **unit**      | jsdom                              | 순수 함수 / Zod schema / Prisma builder / 훅 pure logic                    | `*.test.{ts,tsx}`               |
| **storybook** | Playwright Chromium (real browser) | 폼 validation / hover/focus / scroll / ResizeObserver / swiper / 권한별 UI | `*.stories.tsx`의 play function |

**판단 기준**:

- jsdom 재현 불가 영역(`ResizeObserver` 콜백, `IntersectionObserver`, swiper, scroll-snap)은 storybook 트랙
- DOM 불필요한 pure logic + 훅 상태 계산만(`renderHook`)은 unit 트랙

**공유 설정**: `packages/config/vitest/{base,browser}.js` — `unitProjectDefaults`, `browserDefaults`, `coverageDefaults`

**현황**: 280+ tests 통과 중. admin 56 tests + web 다수 + packages unit tests.

### Playwright E2E + RBAC 매트릭스

```
e2e/
├── golden-flow.spec.ts          # 5단계 골든 플로우
├── admin/
│   ├── auth.spec.ts             # 로그인/로그아웃/PENDING 분기
│   ├── branding.spec.ts         # SVG 차단 + PNG 허용 (브랜딩 MIME)
│   └── rbac-matrix.spec.ts      # Owner/Editor/Viewer × 사이드바·API 403
└── web/
    ├── accessibility.spec.ts    # @axe-core/playwright WCAG AA
    └── navigation.spec.ts       # 탐색 플로우
```

`workflow_dispatch` + nightly cron으로 CI에서 자동 실행.

### 접근성 (WCAG AA)

- `@axe-core/playwright`로 자동 검사
- HeaderBranding 로고 Link `aria-label` 명시
- 검색 SVG `aria-hidden`
- 컬러 대비율: globals.css 22 토큰이 모두 4.5:1 이상 (design.md §2 참조)
- 페이지 레이아웃: PageHeader → PageToolbar → 본문 (semantic landmarks)

### GitHub Actions

| Workflow             | 트리거                      | 내용                                                                              |
| -------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `ci.yml`             | push / PR                   | admin/web × {lint, typecheck, test, build} = **8 jobs 병렬** + packages typecheck |
| `e2e.yml`            | workflow_dispatch + nightly | Playwright 골든 플로우 + RBAC 매트릭스 + 접근성                                   |
| `demo-keepalive.yml` | 6h cron                     | Vercel Hobby plan 시연 keepalive (지표 자동 issue 생성)                           |

### `/check-fsd` 스킬 CI 통합

FSD 의존성 위반을 PR에서 자동 감지 + 차단:

```
pages → features, entities, shared    ✅
features → entities, shared           ✅
entities → shared                     ✅
역방향 / 같은 레이어 직접 import      ❌
```

기존 기술 부채는 `@fsd-allow` 블록 주석으로 명시적 문서화.

### fetch stub decorator (MSW 대체)

`msw-storybook-addon` v2.1+ 부재 / addon-vitest Playwright browser mode 호환성 이슈로 MSW 도입 보류 → `window.fetch` override decorator로 우회.

- `apps/admin/.storybook/fetchStubDecorator.ts`
- Story parameter `fetchMock: { [path-substring]: { status, body } }` 맵
- `useRef` + `useEffect`로 re-render 안전한 설치/복원
- admin fetchClient 표준(`{success, data?, error?}`) 응답 포맷 일치

**검증**: CreateRoleDialog Submit Success(`/api/roles` → 201) / SubmitConflict(409), SectionReorderProbe Reorder500(`/api/home/reorder` → 500 → onError rollback 검증)

---

## 7. 기능 카탈로그

### admin (관리자 CMS)

| 도메인            | 기능                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **인증**          | 로그인 + 가입 승인제(PENDING→ACTIVE) + 동시 로그인 정책 + 비밀번호 변경 + 프로필                                        |
| **RBAC**          | 역할 CRUD + 권한 매트릭스(메뉴별 CRUD) + 사이드바 권한 필터링 + 클라이언트 권한 게이팅                                  |
| **서브페이지**    | 블록 콘텐츠 + 자유 순서 + 슬러그 + 발행/초안 + 미리보기 토큰 + **버전 이력/롤백** + KOGL 공공누리 라이선스              |
| **게시판/게시글** | 스킨(list/gallery) + 게시판별 slug unique + 일괄 발행/이동/삭제 + SEO 필드                                              |
| **메뉴**          | HEADER/FOOTER/SIDEBAR 슬롯 배정 + 3depth + dnd-kit staged save                                                          |
| **메인 페이지**   | HomeSection 6타입 (Hero/Recommended/Latest Posts/CTA/Shortcut/Notice) + 팝업 (콘텐츠/이미지)                            |
| **미디어**        | 그리드 + 필터 + 상세 Dialog + 일괄 선택/삭제 + 사용처 표시 + Tiptap 통합                                                |
| **사이트 설정**   | 도메인 + 보안(동시 로그인) + 업로드(확장자/MIME/크기) + 역할 + **브랜딩**(로고/favicon/OG/사이트명) + SEO + 시연 스냅샷 |
| **감사 로그**     | 모든 데이터 변경 + 인증 이벤트 + Excel 내보내기 + 화면 필터 그대로 반영                                                 |
| **에러 로그**     | 공개 웹 런타임 에러 fingerprint 그룹핑 + 해결 처리 + 대시보드 위젯                                                      |
| **피드백 통계**   | 일별/긍정 이유 차트(recharts) + 서브페이지별 표 + Excel 내보내기 (KST 자정 경계)                                        |
| **빠른 전환**     | Cmd+K Command Palette (subpage/post/board/menu 통합 검색)                                                               |

### web (공개 웹)

| 영역              | 기능                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| **레이아웃**      | KRDS 기반 + Tailwind v4 utility + 헤더/푸터/사이드바 슬롯                                                             |
| **메인**          | Hero/Recommended/Latest Posts/CTA/Shortcut/Notice 6 섹션 + 팝업 모달 + Swiper 캐러셀                                  |
| **서브페이지**    | 좌측 트리 + 우측 InPageNavigation + KOGL 공공누리 마크 + 블록 렌더링                                                  |
| **게시판/게시글** | 갤러리 스킨 (썸네일 자동 추출 fallback) + 페이지네이션                                                                |
| **검색**          | PGroonga 한글 검색 (`/search?q=`) — 형태소 분석 기반                                                                  |
| **피드백**        | 익명 만족도 조사 (네/아니오 + 긍정 이유 + 자유 텍스트) + IP 해싱 + 24h rate limit                                     |
| **미리보기**      | admin 토큰 교환 → web 도메인 쿠키 (TTL 10분) — 크로스 오리진 회피                                                     |
| **커스텀 도메인** | admin에서 도메인 설정 → DNS 검증 → 재배포 없이 반영                                                                   |
| **동적 브랜딩**   | SITE_NAME / 로고 / favicon / OG 이미지 / 사이트 설명 (60s 캐시)                                                       |
| **SEO**           | `generateMetadata` 동적 + Schema.org JSON-LD (Article/BreadcrumbList/Organization/WebSite) + sitemap.xml + robots.txt |
| **에러 캡처**     | 클라이언트/서버 런타임 에러 → admin 에러 로그 자동 전송 (fingerprint)                                                 |

### 권한 리소스 (RESOURCE_ACTIONS — packages/types 단일 출처)

| 리소스                        | 지원 액션                    |
| ----------------------------- | ---------------------------- |
| dashboard                     | read                         |
| subpages, boards, posts       | create, read, update, delete |
| navigation, home, home-popups | create, read, update, delete |
| media, users, roles           | create, read, update, delete |
| auditLogs                     | read                         |
| errorLogs                     | read, update                 |
| settings                      | read, update                 |
| subpage-feedback              | read, delete                 |
| demo-snapshot                 | read, create, update         |

---

## 8. 개발 프로세스 — Stage 진행 표

> 매 Stage마다 해당 기능의 UI까지 함께 개발하여 직접 확인 가능한 상태를 목표로 함 (수직 슬라이싱).
> Stage 7c부터 결과 요약은 `docs/stages/stage-{id}.md`에 분리 작성.

### Stage 1~3 — 기초 + admin CRUD

- **1** 모노레포 초기화 + 공유 설정
- **2** Prisma 스키마 + 커스텀 세션 인증 + 회원가입 + 관리자 레이아웃 + 사용자 관리 + 프로필 + 역할/권한 (6 sub-stages)
- **3** 서브페이지 / 게시판 / 게시글 / 메뉴 / 감사 로그 / 사이트 설정 (6 sub-stages) + 메뉴 슬롯·3depth

### Stage 4 — 공개 웹

- Web 메인+서브페이지 + KRDS 레이아웃 / 게시판/게시글 / 메뉴 + 도메인 프록시 / PGroonga 검색 / 에러 캡처 + admin 에러 로그 UI (5 sub-stages)

### Stage 5 — 메인 페이지 전용 + 미디어 라이브러리

- 메인 섹션 6타입 + 미디어 라이브러리(SHA-256 + 참조 추적 + Tiptap 통합) + 메인 팝업

### Stage 6~10 — 콘텐츠 / 운영 UX / 디자인 / 테스트 / 인프라

| Stage | 내용                                                               | 상세                                                                                      |
| ----- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 6     | 서브페이지 블록 모델 (RICH_TEXT/HTML/IMAGE/IFRAME)                 | —                                                                                         |
| 7a    | Draft 미리보기 (preview 토큰 교환)                                 | —                                                                                         |
| 7b    | HTML 블록 = HTML + 페이지 스코프 CSS (Monaco Tabs)                 | —                                                                                         |
| 7c    | 운영 UX (Dirty 가드 / 사이트 보기 / 빠른 상태 토글 / 벌크 / Cmd+K) | [상세](docs/stages/stage-7c.md)                                                           |
| 7d    | 공개 웹 좌·우 사이드바 + KOGL 마크 + Dialog 외부 클릭 차단         | [상세](docs/stages/stage-7d.md)                                                           |
| 7e    | 공개 웹 KRDS Tailwind 도입 + Hero utility 마이그레이션             | [상세](docs/stages/stage-7e.md)                                                           |
| 7f~h  | Storybook + Vitest 2-track 인프라 + play function 5건              | [7f](docs/stages/stage-7f.md) [7g](docs/stages/stage-7g.md) [7h](docs/stages/stage-7h.md) |
| 7i    | Swiper 22M 회귀 자동 감지 + LinkTargetInput 승격                   | [상세](docs/stages/stage-7i.md)                                                           |
| 7j    | CI matrix + fetch stub decorator (MSW 대체)                        | [상세](docs/stages/stage-7j.md)                                                           |
| 7k-1  | IFRAME_ALLOWED_HOSTS 공유 모듈 추출                                | [상세](docs/stages/stage-7k-1.md)                                                         |
| 7l    | 사이트 브랜딩 + SEO 메타데이터 통합                                | [상세](docs/stages/stage-7l.md)                                                           |
| 7m    | 서브페이지 버전 관리 (이력/롤백/작성자 필터)                       | [상세](docs/stages/stage-7m.md)                                                           |
| 8     | Docker + CI/CD + 운영 self-host 가이드                             | [상세](docs/stages/stage-8.md)                                                            |
| 9     | SEO 기반 구축 (sitemap / robots / Schema.org JSON-LD)              | [상세](docs/stages/stage-9.md)                                                            |
| 10    | 사용자 피드백 (서브페이지 만족도 + recharts 통계)                  | [상세](docs/stages/stage-10.md)                                                           |

### Stage 11~12 — 품질 강화 + 테스트 커버리지

- **11a~f** — 타입 안전성 / N+1 / 에러 바운더리 / 접근성 / E2E / `/check-fsd` CI ([11a](docs/stages/stage-11a.md) [11b](docs/stages/stage-11b.md) [11c](docs/stages/stage-11c.md) [11d](docs/stages/stage-11d.md) [11e](docs/stages/stage-11e.md) [11f](docs/stages/stage-11f.md))
- **12a~j** — 보안 unit + RBAC + 데이터 무결성 + 콘텐츠 무결성 + 블록 UI play + 메인+네비+일괄 play + RBAC UI play + 미디어+브랜딩 play + P1 일괄 + CI E2E job ([상세](docs/stages/stage-12.md))

### Stage 13~16 — UX / 디자인 시스템 / 코드 최적화

- **13** DnD Staged Save (HomeSection/HomePopup/PageBlock/NavigationMenuItem) ([상세](docs/stages/stage-13.md))
- **14** PageHeader + PageToolbar 공통화 ([상세](docs/stages/stage-14.md))
- **15** admin 디자인 시스템 도입 — design.md SSOT + 12 sub-stages ([15c-2](docs/stages/stage-15c-2.md) [15c-3a](docs/stages/stage-15c-3a.md) [15c-3b](docs/stages/stage-15c-3b.md) [15c-3c](docs/stages/stage-15c-3c.md) [15c-3d](docs/stages/stage-15c-3d.md) [15c-3e](docs/stages/stage-15c-3e.md) [15c-3f](docs/stages/stage-15c-3f.md))
- **16** 코드 최적화 — SSOT 통합 + 공용 컴포넌트 추출 + `defineRoute` 마이그레이션 + SettingsCardForm

### 개발 원칙

1. **운영 기준 + 책임 분리 우선** — 코드 경계를 명확히 나누고, 장애 추적·모니터링이 용이한 구조를 선택
2. **코드 재사용성 + 단일 소스** — 동일 로직의 중복을 피하고, 하나의 정의가 하나의 진실을 담당
3. **외부 라이브러리 문서 우선 조회** — Context7 MCP를 먼저 사용 (학습 데이터가 최신이 아닐 수 있음)

---

## 9. Quick Start

### Dev (로컬 개발)

```bash
git clone <repo-url> simple-cms
cd simple-cms

pnpm install

# Postgres + PGroonga 컨테이너
docker compose -f docker/docker-compose.yml up -d db

# 스키마 + 검색 인덱스 + 시드
pnpm db:push
pnpm db:pgroonga
pnpm db:seed

# admin (3001) + web (3000) 동시 실행
pnpm dev
```

- admin 로그인: `http://localhost:3001/login`
- web: `http://localhost:3000/`

### 운영 self-host (Docker compose)

```bash
cp .env.example .env
# SESSION_SECRET / FEEDBACK_IP_SALT 등 강한 랜덤 값 입력

docker compose -f docker/docker-compose.yml up -d db
pnpm install --frozen-lockfile
pnpm db:push
pnpm db:pgroonga
pnpm db:seed
docker compose -f docker/docker-compose.yml up -d admin web
```

상세는 [`docs/react-cms-운영-배포-가이드.md`](docs/react-cms-운영-배포-가이드.md).

### 시연 모드 (Vercel + Supabase)

```bash
# 시연 Supabase에 schema 적용 + 시드
pnpm db:push
pnpm db:pgroonga
pnpm db:demo-seed   # __SEED__ row 22건 prefill
```

Vercel 환경변수: `DEMO_MODE=true`, `STORAGE_PROVIDER=supabase`, `CRON_SECRET=...`. 상세는 [`docs/react-cms-시연모드-배포-가이드.md`](docs/react-cms-시연모드-배포-가이드.md).

### 주요 명령어

| 명령                                            | 설명                                   |
| ----------------------------------------------- | -------------------------------------- |
| `pnpm dev`                                      | admin + web dev 서버 (Turborepo 병렬)  |
| `pnpm build`                                    | 전체 빌드                              |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`    | 전체 검사                              |
| `pnpm e2e` / `pnpm e2e:ui` / `pnpm e2e:report`  | Playwright E2E                         |
| `pnpm storybook`                                | admin/web Storybook (port 6006 / 6007) |
| `pnpm build-storybook`                          | Storybook 정적 빌드                    |
| `pnpm db:push`                                  | Prisma schema push                     |
| `pnpm db:migrate`                               | Prisma migrate                         |
| `pnpm db:studio`                                | Prisma Studio                          |
| `pnpm db:seed`                                  | 최초 관리자 + 기본 역할 시드           |
| `pnpm db:demo-seed`                             | 시연 모드 `__SEED__` 22건 시드         |
| `pnpm db:pgroonga`                              | PGroonga 확장 + 검색 인덱스 설정       |
| `pnpm db:generate`                              | Prisma client 생성                     |
| `pnpm demo:export` / `pnpm demo:import`         | 시연 데이터 snapshot CLI               |
| `pnpm format`                                   | Prettier 포맷팅                        |
| `pnpm clean`                                    | 빌드 캐시 정리                         |
| `pnpm --filter @simple-cms/admin design:verify` | design.md ΔE2000 검증                  |

---

## 10. 프로젝트 구조

```
simple-cms/
├── apps/
│   ├── admin/                # 관리자 CMS (Next.js 16, port 3001)
│   │   ├── app/              # App Router (BFF API + 페이지)
│   │   ├── pages/            # Pages Router placeholder (충돌 방지)
│   │   ├── src/              # FSD 경량 5레이어
│   │   │   ├── pages/        # FSD pages 레이어
│   │   │   ├── features/     # 도메인 기능 (subpage / post / board / ...)
│   │   │   ├── entities/     # auth / media / link-target / preview / ...
│   │   │   └── shared/       # api / lib / ui (shadcn wrapper) / hooks
│   │   ├── scripts/          # verify-design-tokens.mjs (ΔE2000)
│   │   ├── .storybook/       # 2-track 테스트 인프라 + fetchStubDecorator
│   │   ├── design.md         # 시각 결정 SSOT (Stitch DESIGN.md 형식)
│   │   └── AGENTS.md         # 운영 정책 + Stage 진행
│   └── web/                  # 공개 웹 (Next.js 16, port 3000)
│       ├── app/              # App Router (SSR 페이지)
│       ├── src/              # FSD 정석 6레이어
│       │   ├── pages/widgets/features/entities/shared/
│       └── AGENTS.md         # KRDS 통합 + Tiptap 렌더링
├── packages/
│   ├── db/                   # Prisma schema + client + DEMO extension
│   │   ├── prisma/           # schema.prisma + seed + demo-seed + migrations
│   │   ├── src/
│   │   │   ├── demo/         # clientExtension / sessionContext / cloneSeed / snapshot
│   │   │   ├── auditLog.ts   # 감사 로그 헬퍼
│   │   │   └── sessionHelper.ts
│   │   └── scripts/          # demo-export / demo-import CLI
│   ├── editor/               # 공유 Tiptap 확장 (ImageWithMediaId 등)
│   ├── types/                # 공용 DTO + 도메인 인터페이스 + IFRAME_ALLOWED_HOSTS
│   └── config/               # tsconfig + eslint + vitest 공유 설정
├── docker/                   # docker-compose.yml (PGroonga + admin + web)
├── e2e/                      # Playwright spec
│   ├── golden-flow.spec.ts
│   ├── admin/{auth,branding,rbac-matrix}.spec.ts
│   └── web/{accessibility,navigation}.spec.ts
├── .github/workflows/        # ci.yml + e2e.yml + demo-keepalive.yml
└── docs/                     # 설계서 + 배포 가이드 + 32개 Stage deep-dive
    ├── stages/               # stage-7c.md ~ stage-15c-3f.md
    ├── react-cms-개발-설계서.md
    ├── react-cms-운영-배포-가이드.md
    └── react-cms-시연모드-배포-가이드.md
```

---

## 11. 문서

### 마스터 문서

- **[`AGENTS.md`](AGENTS.md)** — 도메인 모델 / 운영 정책 / Stage 진행 표 / 시연 모드 격리 인프라 (모든 결정의 마스터)
- **[`apps/admin/AGENTS.md`](apps/admin/AGENTS.md)** — admin 권한 / API Route 패턴 / 페이지 레이아웃 / 운영 UX
- **[`apps/web/AGENTS.md`](apps/web/AGENTS.md)** — KRDS 통합 / Tiptap 렌더 / 도메인 프록시 / SEO
- **[`apps/admin/design.md`](apps/admin/design.md)** — 시각 결정 단일 진실원 (색·타이포·간격·primitives + Apple 영감 부록)

### 설계 문서

- [`docs/react-cms-개발-설계서.md`](docs/react-cms-개발-설계서.md) — 전체 기술 설계 (기준 문서)
- [`docs/react-cms-개발-설계-해설서.md`](docs/react-cms-개발-설계-해설서.md) — 설계 판단의 "왜"
- [`docs/react-cms-구현-로드맵.md`](docs/react-cms-구현-로드맵.md) — 21단계 세분화 구현 순서
- [`docs/react-cms-README-요약본.md`](docs/react-cms-README-요약본.md) — 프로젝트 요약

### 배포 가이드

- [`docs/react-cms-운영-배포-가이드.md`](docs/react-cms-운영-배포-가이드.md) — Docker self-host 10장 (환경변수 / 백업 / PGroonga 재구축)
- [`docs/react-cms-시연모드-배포-가이드.md`](docs/react-cms-시연모드-배포-가이드.md) — Vercel + Supabase + DEMO_MODE 환경변수 / cron 검증 / 문제 해결
- [`docs/react-cms-커스텀-도메인-명세서.md`](docs/react-cms-커스텀-도메인-명세서.md) — 커스텀 도메인 + DNS 검증

### Stage Deep-dive (32 docs)

- [`docs/stages/`](docs/stages/) — Stage 7c~15c-3f의 의사결정 로그 + 트레이드오프 + 트러블슈팅

---

## 마무리

이 프로젝트는 단순히 동작하는 CMS를 만드는 것을 넘어, **운영 가능한 인프라 + 유지보수 가능한 코드 + 미래의 개발자에게 인계 가능한 의사결정 로그**를 목표로 했다. 16 Stage에 걸친 점진적 빌드와 32개의 deep-dive 문서가 그 증거다.

질문, 피드백, 코드 리뷰 환영합니다.
