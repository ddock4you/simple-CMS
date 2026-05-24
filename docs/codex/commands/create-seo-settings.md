<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 대화 컨텍스트를 분석하여 **SEO 기반 구축 (sitemap.xml + robots.txt + 페이지별 SEO 필드 + Schema.org JSON-LD)**을 구현해줘.

## 동작 순서

1. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인한다.
   - sitemap 라우트 → `apps/web/app/sitemap.ts`
   - robots 라우트 → `apps/web/app/robots.ts`
   - SEO 캐시 → `apps/web/src/shared/lib/seoCache.ts`
   - Post SEO 필드 → `packages/db/prisma/schema.prisma`의 `Post { seoTitle, seoDescription }`
   - Post 편집 UI → `apps/admin/src/features/post-management/ui/PostForm.tsx`, `PostView.tsx`
   - 페이지별 generateMetadata → `apps/web/app/board/[boardSlug]/[postSlug]/page.tsx`, `apps/web/app/p/[slug]/page.tsx`
   - Schema.org 헬퍼 → `apps/web/src/shared/lib/structuredData.ts`
   - JSON-LD 삽입 위치 → `apps/web/app/layout.tsx` (Organization + WebSite), 각 상세 페이지 (Article + BreadcrumbList)
   - admin `/settings/seo` UI → `apps/admin/app/(authenticated)/settings/seo/page.tsx`, `apps/admin/src/features/site-settings/ui/SeoSettingsForm.tsx`
   - SEO API → `apps/admin/app/api/settings/seo/route.ts`
2. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
3. **컨벤션 검증**: FSD 구조, 감사 로그 연동, import 규칙, 권한 체크, `serializeJsonLd` 이스케이프 사용을 확인한다.

## 전제 조건

- SiteSettings 모델이 이미 존재해야 한다
- `features/site-settings/` 슬라이스 + `SettingsNav.tsx` + `settingsKeys` 존재해야 한다 (도메인/보안/업로드/권한/브랜딩 설정에서 생성)
- Subpage는 `seoTitle`/`seoDescription` 필드 기존 보유 (Stage 7m 이전) — 갭 없음 확인
- `getCachedBranding` (Stage 7l)와 `getSiteUrl` (Stage 4c)이 존재해야 한다
- 전제 조건이 충족되지 않으면 먼저 구현해야 할 항목을 안내한다

## SiteSettings 키 정의 (1개)

| 키                           | 값 형식          | 기본값 | 설명                                                                        |
| ---------------------------- | ---------------- | ------ | --------------------------------------------------------------------------- |
| `ROBOTS_ADDITIONAL_DISALLOW` | JSON 배열 문자열 | `[]`   | robots.txt에 `/api/`(기본 차단) 외로 추가할 Disallow 경로. 경로는 `/` 시작 |

**원칙**: `/api/`는 robots.ts에서 항상 기본 Disallow로 포함 → 관리자 입력에서 중복 시 서버 PATCH에서 제거. baseUrl / sitemapUrl은 GET 응답에서 `SITE_DOMAIN` 기반으로 파생 (저장 안 함).

## Phase별 생성 대상

### Phase 1: sitemap.xml + robots.txt (공개 웹)

| 대상        | 파일                                         | 핵심                                                                                                                   |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| sitemap     | `apps/web/app/sitemap.ts`                    | `MetadataRoute.Sitemap` + `dynamic = 'force-dynamic'`. Prisma 직접 조회(Subpage/Board/Post published만). 타입별 priority/changefreq |
| robots      | `apps/web/app/robots.ts`                     | `MetadataRoute.Robots` + `dynamic = 'force-dynamic'`. 기본 `/api/` + `ROBOTS_ADDITIONAL_DISALLOW` 병합(`Set` dedupe) + `sitemap` + `host` |
| seoCache    | `apps/web/src/shared/lib/seoCache.ts`        | `brandingCache`/`domainCache` 동일 패턴(60s prod / 5s dev TTL). JSON 파싱 실패 시 빈 배열 폴백(robots.txt 서빙 차단 금지) |

**규모 스케일**: 현재는 요청당 Prisma 3쿼리(sitemap) + 1쿼리(robots). 수만 건 이상으로 커지면 `revalidate = 300` 검토.

### Phase 2: Post SEO 필드 (admin)

| 대상              | 파일                                                                   | 핵심                                                                                                       |
| ----------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Prisma 스키마     | `packages/db/prisma/schema.prisma`                                     | `Post { seoTitle String?, seoDescription String? @db.Text }` 추가 → `pnpm db:push` + `pnpm db:generate`   |
| Zod 스키마        | `apps/admin/src/features/post-management/model/postSchemas.ts`        | create/update 양쪽에 `seoTitle`(max 200) / `seoDescription`(max 500) 추가. update는 nullable              |
| PostDetail 타입   | `apps/admin/src/features/post-management/model/postFilters.ts`        | `seoTitle: string \| null; seoDescription: string \| null;` 추가                                           |
| POST API          | `apps/admin/app/api/posts/route.ts`                                    | destructure + `.trim() \|\| null` 정규화 + `changes.after`에 포함                                          |
| PATCH/GET API     | `apps/admin/app/api/posts/[id]/route.ts`                               | GET 응답에 SEO 필드 포함 + PATCH updateData에 포함 + changes.before/after diff (정규화 후 비교)          |
| PostForm UI       | `apps/admin/src/features/post-management/ui/PostForm.tsx`              | 좌측 콘텐츠 컬럼 하단 "SEO" Card (seoTitle Input + seoDescription Textarea). SubpageForm 패턴 복제        |
| PostView UI       | `apps/admin/src/features/post-management/ui/PostView.tsx`              | 우측 컬럼에 seoTitle/seoDescription 중 하나라도 있을 때 SEO Card 조건부 렌더                               |
| Post stories 수정 | `apps/admin/src/features/post-management/ui/PostForm.stories.tsx`      | `draftPost` fixture에 `seoTitle: null, seoDescription: null` 추가 (PostDetail 타입 호환)                   |

**정규화 규칙**: `seoTitle?.trim() || null`, `seoDescription?.trim() || null` — 빈 문자열을 DB에 null로 저장해 `null` 대 `''` 모호성 제거.

### Phase 3: generateMetadata 확장 (공개 웹)

| 대상                  | 파일                                                          | 핵심                                                                                                         |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| getPost select        | `apps/web/src/entities/post/api/getPost.ts`                   | `PublishedPost`/`PreviewPost` 타입 + select에 `seoTitle`, `seoDescription`, `content` 추가                   |
| Post 상세 metadata    | `apps/web/app/board/[boardSlug]/[postSlug]/page.tsx`          | `title = seoTitle?.trim() \|\| title`, `description = seoDescription?.trim() \|\| summarizeContent(content)` |
| summarizeContent      | (same file, inline)                                           | `raw.replace(/\s+/g, ' ').trim().slice(0, 160) + '…'` 3단 폴백                                               |

Subpage는 기존 구현(seoTitle 우선순위 + seoDescription)을 그대로 유지. Board는 `description` 필드만 사용 (SEO 전용 필드는 범위 외).

### Phase 4: Schema.org JSON-LD

| 대상                       | 파일                                                     | 핵심                                                                                                     |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| structuredData 헬퍼        | `apps/web/src/shared/lib/structuredData.ts`              | `buildOrganizationJsonLd`, `buildWebSiteJsonLd`(SearchAction 포함), `buildArticleJsonLd`, `buildBreadcrumbJsonLd`, `serializeJsonLd`(`<` → `<` 이스케이프) |
| 전역 삽입                  | `apps/web/app/layout.tsx`                                | `<head>`에 Organization + WebSite 2개 삽입. `Promise.all([getMenuBySlot×3, getCachedBranding, getSiteUrl])` |
| Subpage Article+Breadcrumb | `apps/web/app/p/[slug]/page.tsx`                         | Page 컴포넌트에서 `getPublishedSubpage` + branding + baseUrl 조합하여 Article + BreadcrumbList 삽입       |
| Board Breadcrumb           | `apps/web/app/board/[boardSlug]/page.tsx`                | 홈 → Board 2뎁스 BreadcrumbList                                                                          |
| Post Article+Breadcrumb    | `apps/web/app/board/[boardSlug]/[postSlug]/page.tsx`     | 홈 → Board → Post 3뎁스. `authorName` 포함. Preview 모드는 JSON-LD 삽입 안 함(draft 노출 부적합)         |

**Article 필수 필드**: `mainEntityOfPage` + `headline` + `publisher(Organization.name + logo)` + `datePublished` + `dateModified`(없으면 publishedAt 폴백).

**BreadcrumbList 패턴**: `itemListElement: [{ '@type': 'ListItem', position: i+1, name, item: url }, ...]`. 빈 배열이면 `null` 반환 → 호출 측 조건부 렌더.

### Phase 5: admin `/settings/seo` UI

| 대상            | 파일                                                                       | 핵심                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod 스키마      | `apps/admin/src/features/site-settings/model/settingsSchemas.ts`          | `updateSeoSchema`(`robotsAdditionalDisallow: array(string.trim().min(1).max(200).regex(/^\//)).max(50)`), `UpdateSeoData`, `SeoSettingsData`(`{robotsAdditionalDisallow, baseUrl, sitemapUrl}`) |
| API Route       | `apps/admin/app/api/settings/seo/route.ts`                                 | GET: 1키 + baseUrl/sitemapUrl 파생. PATCH: dedupe + `/api/` 중복 제거 + 정렬 비교 no-op short-circuit + audit                                    |
| Fetchers        | `apps/admin/src/features/site-settings/api/settingsFetchers.ts`           | `getSeoSettings`, `updateSeoSettings(data)`                                                                                                       |
| Queries         | `apps/admin/src/features/site-settings/api/settingsQueries.ts`            | `seoSettingsOptions()`                                                                                                                            |
| Mutations       | `apps/admin/src/features/site-settings/api/useSettingsMutations.ts`       | `useUpdateSeo` (invalidate + toast "최대 1분 후 반영")                                                                                            |
| Query Keys      | `apps/admin/src/shared/api/queryKeys.ts`                                  | `settingsKeys.seo()`                                                                                                                              |
| SettingsNav 탭  | `apps/admin/src/features/site-settings/ui/SettingsNav.tsx`                | `{ label: 'SEO', href: '/settings/seo' }` (6번째)                                                                                                 |
| Form UI         | `apps/admin/src/features/site-settings/ui/SeoSettingsForm.tsx`            | 2개 Card(정보 + robots) + Textarea ↔ `string[]` 변환 Controller + `parseTextareaToPaths`/`pathsToTextarea` 헬퍼                                 |
| 페이지          | `apps/admin/src/pages/site-settings/ui/SeoSettingsPage.tsx`               | Server Component prefetch + HydrationBoundary                                                                                                     |
| App route       | `apps/admin/app/(authenticated)/settings/seo/page.tsx`                     | re-export                                                                                                                                         |

권한: 기존 `settings:read|update` 그대로. 변경 없음.

## 핵심 패턴 참조

### sitemap.ts (Next.js 16 App Router)

```ts
import type { MetadataRoute } from 'next';
import { prisma } from '@simple-cms/db';
import { getSiteUrl } from '@/shared/lib/siteUrl';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteUrl();
  const now = new Date();
  const [subpages, boards, posts] = await Promise.all([
    prisma.subpage.findMany({ where: { status: 'PUBLISHED' }, select: { slug, updatedAt, publishedAt }, orderBy: { updatedAt: 'desc' } }),
    prisma.board.findMany({ where: { isPublic: true }, select: { slug, updatedAt }, orderBy: { updatedAt: 'desc' } }),
    prisma.post.findMany({ where: { status: 'PUBLISHED', board: { isPublic: true } }, select: { slug, updatedAt, publishedAt, board: { select: { slug } } }, orderBy: { updatedAt: 'desc' } }),
  ]);
  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    ...subpages.map(s => ({ url: `${baseUrl}/p/${s.slug}`, lastModified: s.updatedAt ?? s.publishedAt ?? now, changeFrequency: 'monthly', priority: 0.8 })),
    ...boards.map(b => ({ url: `${baseUrl}/board/${b.slug}`, lastModified: b.updatedAt ?? now, changeFrequency: 'weekly', priority: 0.7 })),
    ...posts.map(p => ({ url: `${baseUrl}/board/${p.board.slug}/${p.slug}`, lastModified: p.updatedAt ?? p.publishedAt ?? now, changeFrequency: 'weekly', priority: 0.6 })),
  ];
}
```

**우선순위/변경주기 정책**: 홈 daily/1.0 > Subpage monthly/0.8 > Board index weekly/0.7 > Post weekly/0.6.

### robots.ts + seoCache (인메모리 TTL)

```ts
// seoCache.ts — brandingCache 패턴 미러
const TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 5_000;
let cache: { data: SeoSettings; fetchedAt: number } | null = null;
const FALLBACK = { robotsAdditionalDisallow: [] };

export async function getCachedSeo() {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache.data;
  try {
    const raw = await getSiteSetting('ROBOTS_ADDITIONAL_DISALLOW');
    let robotsAdditionalDisallow: string[] = [];
    if (raw) {
      try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) robotsAdditionalDisallow = parsed.filter(p => typeof p === 'string' && p.trim().length > 0); }
      catch { /* malformed JSON — 폴백 */ }
    }
    const data = { robotsAdditionalDisallow };
    cache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) { console.error('[seoCache] fetch failed', err); return FALLBACK; }
}

// robots.ts
export default async function robots(): Promise<MetadataRoute.Robots> {
  const [baseUrl, seo] = await Promise.all([getSiteUrl(), getCachedSeo()]);
  const disallow = Array.from(new Set<string>(['/api/', ...seo.robotsAdditionalDisallow]));
  return { rules: { userAgent: '*', allow: '/', disallow }, sitemap: `${baseUrl}/sitemap.xml`, host: baseUrl };
}
```

### Schema.org JSON-LD 헬퍼 + 안전 직렬화

```ts
// serializeJsonLd: <script dangerouslySetInnerHTML> 전 XSS 방어
export function serializeJsonLd(jsonLd: JsonLdObject): string {
  return JSON.stringify(jsonLd).replace(/</g, '\\u003c');  // </script>, <!-- 인젝션 모두 차단
}

// 삽입 예시 (layout.tsx)
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }} />
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }} />
```

**JSON-LD는 `<script>` 태그가 표준**. Next.js `metadata.other`는 meta 태그 전용이라 부적합 → `<script dangerouslySetInnerHTML>` + `serializeJsonLd` 패턴 고정.

### WebSite SearchAction (sitelinks searchbox)

```ts
return {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: baseUrl,
  ...(siteDescription ? { description: siteDescription } : {}),
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};
```

Google sitelinks searchbox 자격 확보용. `/search?q=...` 검색 페이지가 이미 구현되어 있어야 함.

### PATCH /api/settings/seo — dedupe + no-op short-circuit

```ts
const cleaned = Array.from(new Set(parsed.data.robotsAdditionalDisallow.map(p => p.trim())))
  .filter(p => p !== '/api/' && p !== '/api');  // 기본 Disallow 중복 제거

const oldSorted = [...parseRobotsDisallow(oldRaw)].sort();
const newSorted = [...cleaned].sort();
const changed = oldSorted.length !== newSorted.length || oldSorted.some((v, i) => v !== newSorted[i]);
if (!changed) return success(null);  // no-op short-circuit (브랜딩 패턴 일관성)
```

### generateMetadata 3단 description 폴백 (Post)

```ts
function summarizeContent(raw: string | null, max = 160): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  return normalized.length <= max ? normalized : `${normalized.slice(0, max)}…`;
}

const title = post.seoTitle?.trim() || post.title;
const description = post.seoDescription?.trim() || summarizeContent(post.content);
```

Subpage는 description 폴백 미적용 — 블록 구성 다양성으로 content가 200~수천 자로 뛰므로 truncate 시 맥락 훼손 위험. seoDescription 입력을 기본 전제로 유지.

### Textarea ↔ string[] Controller 변환

```tsx
function parseTextareaToPaths(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}
function pathsToTextarea(paths: string[]): string {
  return paths.join('\n');
}

<Controller name="robotsAdditionalDisallow" control={control} render={({ field }) => (
  <Textarea
    value={pathsToTextarea(field.value)}
    onChange={(e) => field.onChange(parseTextareaToPaths(e.target.value))}
    onBlur={field.onBlur}
    placeholder={'/preview\n/_internal'}
    rows={8}
    className="font-mono text-sm"
  />
)} />
```

## 검증 체크리스트 (PR 전)

- [ ] `sitemap.ts` `dynamic = 'force-dynamic'` + Subpage `status: 'PUBLISHED'` + Post `board: { isPublic: true }` 필터
- [ ] `robots.ts` 기본 Disallow `/api/` + `ROBOTS_ADDITIONAL_DISALLOW` `Set` dedupe + sitemap/host 포함
- [ ] seoCache 60s prod / 5s dev TTL + JSON 파싱 실패 시 빈 배열 폴백
- [ ] Post `seoTitle`/`seoDescription` 스키마 추가 + `pnpm db:push` + `pnpm db:generate` (dev server 재시작 필요)
- [ ] PostForm SEO Card + PostView SEO Card 조건부 렌더 + `.trim() || null` 정규화
- [ ] audit diff에 SEO 필드 포함 (CREATE/UPDATE 양쪽)
- [ ] `structuredData.ts` 4개 빌더 + `serializeJsonLd` `<` → `<` 이스케이프 (XSS 방어)
- [ ] layout.tsx에 Organization + WebSite JSON-LD 2개 (전 페이지 공통)
- [ ] Subpage/Post 상세: Article + BreadcrumbList. Preview 모드는 JSON-LD 삽입 안 함
- [ ] `/settings/seo` 탭 + Zod `max(50)` + 경로 `/` 시작 regex
- [ ] PATCH에서 `/api/` 중복 제거 + 정렬 비교 no-op short-circuit
- [ ] 감사 로그: `SITE_SETTINGS` entityType, `entityId: ROBOTS_ADDITIONAL_DISALLOW`
- [ ] `summarizeContent` 3단 폴백 inline 헬퍼 (Post 상세 generateMetadata)
- [ ] 검증 방법: `curl /sitemap.xml` + `/robots.txt` + 홈 view-source(Organization/WebSite JSON-LD) + Subpage/Board/Post 상세 view-source(Article/BreadcrumbList JSON-LD) + [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] AGENTS.md 3곳 업데이트 (root 로드맵 표 + apps/web "SSR/SEO 정책" + apps/admin "SEO 설정 관리")
- [ ] `docs/stages/stage-9.md` 작성 (Stage 7c+ 문서 정책 준수)

## Out of Scope (옵션 확장)

- **페이지별 OG 이미지**: Subpage/Post `ogImageMediaId` 필드 + MediaPicker 통합 + `openGraph.images` 폴백(페이지별 → 사이트 전역 → 없음). 이벤트/캠페인 페이지 특수 케이스에서만 필요
- **Board SEO 필드**: `seoTitle`/`seoDescription` 추가. 현재는 `description`만 사용
- **robots.txt 전체 텍스트 편집**: 현재는 Disallow 배열만 관리. 크롤 지연/Host/복수 UA 규칙 등 고급 설정은 `app/robots.txt/route.ts` 전환 시 가능 (Next.js 파일 컨벤션 제약 때문에 robots.ts와 공존 불가)
- **Image/Video Sitemap**: `MetadataRoute.Sitemap`의 `images?: string[]` 필드 미사용
- **Subpage description 폴백**: content 기반 truncate는 블록 맥락 훼손 위험으로 미적용. seoDescription 입력을 기본 전제
- **대규모 sitemap**: 수만 건 초과 시 `revalidate = 300` 또는 sitemap index 분할 검토

## 참고

- `/create-domain-settings` — 같은 SiteSettings 도메인의 도메인 설정 구현 스킬 (baseUrl 파생 근원)
- `/create-branding-settings` — Stage 7l 브랜딩+메타데이터 패턴 (캐시/generateMetadata 동적화 근원)
- `/create-api` — API Route 생성 패턴
- `/check-permissions` — settings 권한 체크 일관성 검사
- `/check-fsd` — FSD 아키텍처 규칙 검증
- `/review-code` — 코드 품질 체크리스트 (감사 로그 포함 여부 확인)
