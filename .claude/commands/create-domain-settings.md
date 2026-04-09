현재 대화 컨텍스트를 분석하여 **커스텀 도메인 설정 기능**을 명세서 기반으로 구현해줘.

## 동작 순서

1. **명세서 확인**: `docs/react-cms-커스텀-도메인-명세서.md`를 읽고 전체 구조를 파악한다.
2. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인한다.
   - DB 모델(SiteSettings) 존재 여부 → `packages/db/prisma/schema.prisma`
   - 타입 정의 존재 여부 → `packages/types/src/domain/siteSettings.types.ts`
   - Admin 기능 존재 여부 → `apps/admin/src/features/site-settings/`
   - Web middleware 존재 여부 → `apps/web/middleware.ts`
   - Docker/Traefik 설정 존재 여부 → `docker/traefik/`
3. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
4. **컨벤션 검증**: FSD 구조, 감사 로그 연동, import 규칙을 확인한다.

## Phase별 생성 대상

### Phase A: DB + 타입 + Admin (단계 2~3 시점)

| 대상             | 파일                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma 모델      | `packages/db/prisma/schema.prisma` (SiteSettings 추가)                                                                                       |
| 쿼리 헬퍼        | `packages/db/src/repositories/siteSettings.ts`                                                                                               |
| 타입             | `packages/types/src/domain/siteSettings.types.ts`                                                                                            |
| DTO              | `packages/types/src/dto/siteSettings.dto.ts`                                                                                                 |
| Zod 스키마       | `apps/admin/src/features/site-settings/model/domain.schema.ts`                                                                               |
| API Routes       | `apps/admin/app/api/settings/domain/route.ts`, `apps/admin/app/api/settings/domain/check-dns/route.ts`                                       |
| Fetcher/Mutation | `apps/admin/src/features/site-settings/api/siteSettingsFetchers.ts`, `apps/admin/src/features/site-settings/api/useSiteSettingsMutations.ts` |
| UI               | `apps/admin/src/features/site-settings/ui/DomainSettingsForm.tsx`                                                                            |
| 페이지           | `apps/admin/src/pages/settings/DomainSettingsPage.tsx`                                                                                       |
| 라우트           | `apps/admin/app/settings/domain/page.tsx`                                                                                                    |

감사 로그: `SITE_SETTINGS` entityType으로 `logAuditEvent()` 호출 필수.

### Phase B: Web middleware + SEO (단계 4 시점)

| 대상         | 파일                                     |
| ------------ | ---------------------------------------- |
| 도메인 캐시  | `apps/web/src/shared/lib/domainCache.ts` |
| URL 유틸리티 | `apps/web/src/shared/lib/siteUrl.ts`     |
| Middleware   | `apps/web/middleware.ts`                 |
| Layout 수정  | `apps/web/app/layout.tsx` (metadataBase) |
| Sitemap      | `apps/web/app/sitemap.ts`                |
| Robots       | `apps/web/app/robots.ts`                 |

개발 모드 localhost 허용 로직 필수 포함.

### Phase C: Docker + Traefik (단계 9 시점)

| 대상                | 파일                                   |
| ------------------- | -------------------------------------- |
| Traefik 동적 설정   | `docker/traefik/dynamic.yml`           |
| Docker Compose 수정 | `docker/docker-compose.yml`            |
| Dev override        | `docker-compose.dev.yml`               |
| 환경변수            | `.env.example` (EXPECTED_SERVER_IP 등) |

## 핵심 패턴 참조

### API Route 핸들러 템플릿

명세서 6.3절의 구조를 따른다. `/create-api` 스킬의 API Route 생성 패턴과 동일:

- `NextRequest`/`NextResponse` 기반 Route Handler
- 인증 확인 → Zod 검증 → DB 처리 → 감사 로그
- 결과: `NextResponse.json({ success: true, data })` | `NextResponse.json({ success: false, error }, { status })`

### Zod 도메인 스키마

명세서 6.4절의 호스트네임 검증 스키마를 그대로 사용한다.

### Web middleware 흐름

명세서 7.1절의 로직 흐름을 따른다:

- 캐시 확인 → 도메인 미설정이면 통과 → 개발 모드 localhost 통과 → 일치하면 통과 → 불일치 시 301

## 참고

- `/create-api` — API Route 생성 패턴
- `/create-feature` — FSD feature 슬라이스 스캐폴딩
- `/create-security-settings` — 같은 SiteSettings 도메인의 보안 설정 (동시 로그인 정책) 구현 스킬
- `/check-fsd` — FSD 아키텍처 규칙 검증
- `/check-imports` — import 규칙 검증
