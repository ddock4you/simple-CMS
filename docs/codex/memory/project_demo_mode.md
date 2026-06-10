<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Demo Mode (DEMO_MODE) Master-merge Strategy
description: 시연 모드 격리 인프라를 master 단일 스택으로 운영하는 결정 + 새 코드 관습 (sentinel + composite unique + findFirst + upsert 회피)
type: project
originSessionId: 1a163919-6e9b-4728-9ba3-889a763293fa
---
**시연 모드 인프라(`DEMO_MODE`)는 master 브랜치에 합쳐 단일 스택으로 운영**한다 (2026-05-08 결정). 운영 Vercel 프로젝트는 `DEMO_MODE` 미설정, 시연 Vercel 프로젝트는 `DEMO_MODE=true`로 같은 master 코드에서 분기.

**Why:** PR3 격리 인프라가 운영에 0 영향이도록 설계됨 — sentinel `'__PROD__'`로 모든 운영 row가 채워지고, composite unique가 글로벌 unique와 동일하게 동작하며, Prisma `$extends`는 `DEMO_MODE=true`일 때만 적용. 두 브랜치 분리 시 cherry-pick 동기화 부담 vs 코드 cruft 잔존을 trade-off한 결과 통합이 합리적. 향후 multi-tenant SaaS 확장에도 같은 인프라 재사용 가능.

**How to apply:**

새 코드 작성 시 다음 관습을 자동으로 따라야 master 호환:

1. **단일 필드 unique lookup → `findFirst`**: `findUnique({where:{slug|key|name|contentHash|email|username}})` 사용 금지. extension이 sessionId 자동 주입.
2. **`id` 기반 lookup은 `findUnique` 그대로**: extension result hook이 sessionId 검증 (select 빠뜨려도 강제 주입 후 strip)
3. **upsert 회피**: helper 레벨에서 `findFirst → update | create` 명시 분기. extension에서 upsert는 `console.warn` 후 통과만 (cross-tenant 안전 처리 어려움)
4. **Raw SQL (`$queryRaw`)에 sessionId 필터 명시**: `WHERE "sessionId" = ${demo.getCurrentSessionId()}` (extension은 raw SQL 우회)
5. **인증 부트스트랩은 `demo.runWithBypass`로 감싸기**: Session+User+Role include 체인이 sessionId 격리에 안전망 보장
6. **Seed/일회성 스크립트는 composite where 명시**: `where: { sessionId_key: { sessionId: '__PROD__', key } }`
7. **schema 변경 시 17 모델 sentinel 패턴 유지**: 새 모델에도 `sessionId String @default("__PROD__")` + `@@index([sessionId])` 적용. 격리 대상이면 `@@unique([sessionId, ...])` composite 추가

**관련 파일 (PR3 인프라):**
- `packages/db/src/demo/` — 인프라 본체 (sessionContext + clientExtension + tests)
- `packages/db/prisma/backfill-session-id.ts` — 신규 운영 DB에 schema 적용 시 1회 백필
- `apps/admin/src/entities/auth/lib/getCurrentUser.ts` — runWithBypass 안전망 적용 사례
- `packages/db/src/siteSettings.ts` — upsert → findFirst→update|create 패턴 사례
- 루트 `AGENTS.md` "시연 모드 (DEMO_MODE) 격리 인프라" 섹션 — 정책 단일 출처
- `packages/db/AGENTS.md` "시연 모드(DEMO_MODE) 격리 인프라" 섹션 — 구현 세부

**관련 파일 (PR4 자동 진입):**
- `packages/db/prisma/demo-seed.ts` — `pnpm db:demo-seed`. `__SEED__` 22 row 멱등 prefill (Role x2 + demo_admin User + SiteSettings x6 + NavigationMenu x2 + Board + Subpage about + PageBlock RICH_TEXT + HomeSection x6 + NavigationMenuItem x2)
- `packages/db/src/demo/cloneSeedToSession.ts` — 14모델 in-memory remap 클론. cuid2 사전 생성 + createMany + NavigationMenuItem.parentId 2-pass + 30s transaction. 호출자는 `demo.runWithBypass`로 감쌈
- `packages/db/src/demo/SeedNotFoundError.ts` — `code: 'SEED_NOT_FOUND'` (bootstrap 503 분기)
- `apps/admin/app/api/demo/bootstrap/route.ts` — POST `/_cms/admin/api/demo/bootstrap`
- `apps/{admin,web}/app/demo-bootstrap/{page,DemoBootstrapClient}.tsx` — splash UI 양쪽 동일 (admin basePath 자동 prepend로 redirect가 admin origin으로 향하므로 양쪽 모두 라우트 필요)
- `apps/{admin,web}/src/shared/lib/ensureDemoSession.ts` — layout gate
- `apps/{admin,web}/proxy.ts` — `x-pathname` 헤더 주입

**제외 모델 (extension 격리 외):**
- `Session` (sessionToken 글로벌 unique, 인증 인프라)
- `PreviewToken` (token 글로벌 unique, admin↔web cross-origin 교환 패턴)

**Visitor 진입 흐름 (PR4):**
1. 시크릿 창 첫 방문 → cookie `session-token` 없음
2. layout gate가 `/demo-bootstrap?next=...`로 redirect
3. splash가 bootstrap API POST → 새 cuid sessionId + cloneSeedToSession + Set-Cookie(httpOnly Max-Age=3600)
4. router.replace(nextPath) → cookie 통과 → `enterWith({sessionId})` → 모든 후속 쿼리 격리
5. 1시간 후 cookie 만료 → 다시 splash → 새 sessionId

**Known limitations (PR9/11 walker로 일괄 처리 예정):**
- SubpageVersion.snapshot Json 내부 mediaId/blockId stale id 잔존 (롤백 시 image dangling 가능)
- HomeSection.configJson 내부 boardId stale id (NOTICE/GALLERY_COLLECTION 참조)
- RICH_TEXT 블록 Tiptap image의 attrs.mediaId stale (시각 렌더는 url 별도 보존이라 무관)

**진행 단계 현황 (2026-05-20 갱신):**
- PR5 완료: Storage sessionId prefix + cleanup cron + Reset API + DemoBanner UI
- PR6 완료: snapshot export/import 코어 + walker + CLI (`pnpm demo:export` / `demo:import`)
- PR7 완료: Admin UI (`/settings/demo-snapshot`)
- 시연 가이드 + 코드 정합성은 `docs/react-cms-시연모드-배포-가이드.md` 11장 + 루트 AGENTS.md "시연 모드" 섹션 단일 출처
- Storybook 시연 동봉은 별도 메모리 `project_build_demo_bundling.md` 참조 (PR5+와 직교)
- 상세 명세: `docs/react-cms-시연모드-배포-가이드.md`
