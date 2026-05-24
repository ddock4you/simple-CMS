<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 대화 컨텍스트를 분석하여 **사이트 브랜딩 + SEO 메타데이터 설정 기능 (로고/favicon/OG 이미지/사이트명/사이트 설명/로고 alt)**을 구현해줘.

## 동작 순서

1. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인한다.
   - SiteSettings 모델 존재 여부 → `packages/db/prisma/schema.prisma`
   - `MediaReferenceType`에 `'SITE_SETTINGS'` 포함 여부 → `packages/types/src/dto/media.dto.ts`
   - MediaPicker `acceptMimeTypes` prop 지원 여부 → `apps/admin/src/entities/media/ui/MediaPicker.tsx`
   - 미디어 화이트리스트 단일 출처 존재 여부 → `apps/admin/src/features/media-management/lib/mediaBearingSettings.ts`
   - 브랜딩 업로드 엔드포인트 → `apps/admin/app/api/media/branding-upload/route.ts`
   - 브랜딩 설정 API → `apps/admin/app/api/settings/branding/route.ts`
   - 브랜딩 설정 UI → `apps/admin/src/features/site-settings/ui/BrandingSettingsForm.tsx`
   - 브랜딩 라우트 → `apps/admin/app/(authenticated)/settings/branding/page.tsx`
   - web 캐시 + 헤더 + generateMetadata → `apps/web/src/shared/lib/brandingCache.ts`, `apps/web/src/widgets/layout/ui/HeaderBranding.tsx`, `apps/web/app/layout.tsx`
2. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
3. **컨벤션 검증**: FSD 구조, 감사 로그 연동, import 규칙, 권한 체크, 키별 MIME 게이트, MediaPicker 우회 차단을 확인한다.

## 전제 조건

- SiteSettings 모델이 이미 존재해야 한다
- `features/site-settings/` 슬라이스가 존재해야 한다 (도메인/보안/업로드 설정에서 생성)
- `SettingsNav.tsx`가 존재해야 한다 (탭 추가 대상)
- Media 라이브러리 + ImageUrlInput + MediaPicker가 이미 존재해야 한다 (`/create-media-library`)
- 전제 조건이 충족되지 않으면 먼저 구현해야 할 항목을 안내한다

## SiteSettings 키 정의 (6개)

| 키                       | 값             | 설명                                              |
| ------------------------ | -------------- | ------------------------------------------------- |
| `SITE_NAME`              | string (≤60)  | 헤더 폴백 텍스트, metadata title, 푸터 copyright |
| `SITE_DESCRIPTION`       | string (≤200) | metadata description (SEO)                        |
| `SITE_LOGO_MEDIA_ID`     | Media.id       | 헤더 로고                                         |
| `SITE_LOGO_ALT`          | string (≤120) | 로고 sr-only (비우면 SITE_NAME 폴백)              |
| `SITE_FAVICON_MEDIA_ID`  | Media.id       | 브라우저 탭 favicon                               |
| `SITE_OG_IMAGE_MEDIA_ID` | Media.id       | OG 카드 미리보기 (1200x630 권장)                  |

**원칙**: mediaId만 저장 + GET/캐시에서 `Media.url` join. URL은 별도 키로 저장하지 않음 → 단일 출처 + Media 삭제 시 자동 일관성. **외부 URL 직접 입력 차단**(보안 + SVG 정책 일관성).

## Phase별 생성 대상

### Phase A: 참조 추적 단일 출처 + 8번째 경로

| 대상                | 파일                                                                       | 핵심                                                                                           |
| ------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| MediaReferenceType  | `packages/types/src/dto/media.dto.ts`                                      | union에 `'SITE_SETTINGS'` 추가                                                                 |
| 화이트리스트 상수   | `apps/admin/src/features/media-management/lib/mediaBearingSettings.ts`     | `MEDIA_BEARING_SETTING_KEYS = ['SITE_LOGO_MEDIA_ID', 'SITE_FAVICON_MEDIA_ID', 'SITE_OG_IMAGE_MEDIA_ID']` + 키별 라벨 매핑 |
| 참조 추적 8번째     | `apps/admin/src/features/media-management/lib/findMediaReferences.ts`      | 화이트리스트 부분 스캔 (전체 SiteSettings.value 풀스캔 금지)                                   |

### Phase B: branding 업로드 엔드포인트 (분리 + SVG 차단)

| 대상                  | 파일                                                  | 핵심                                                                                                       |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| branding-upload Route | `apps/admin/app/api/media/branding-upload/route.ts`   | `image/jpeg|png|webp|x-icon|vnd.microsoft.icon`만 허용. category='branding' 강제. 기존 `/api/media/upload`는 무변경 |

**중요**: `application/octet-stream` 의도적 제외 — valid ICO 일부가 octet-stream으로 보고되지만 임의 바이너리도 같은 MIME이라 스푸핑 위험. 거부 시 PNG 변환 안내.

### Phase C: 미디어 공용 컴포넌트 prop 확장

| 대상              | 파일                                                  | 추가 prop                                                                                  |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| uploadMedia       | `apps/admin/src/entities/media/api/mediaFetchers.ts` | `endpoint?: string` (기본 `/api/media/upload`)                                             |
| useUploadMedia    | `apps/admin/src/entities/media/api/useUploadMedia.ts` | `UploadMediaInput.endpoint?: string`                                                       |
| MediaUploadButton | `apps/admin/src/entities/media/ui/MediaUploadButton.tsx` | `endpoint?: string`, `acceptMimeTypes?: string[]` (`<input accept>` 동적 생성)           |
| MediaCard         | `apps/admin/src/entities/media/ui/MediaCard.tsx`     | `disabled?: boolean`, `disabledReason?: string` — disabled 시 클릭 차단 + opacity-50 + Tooltip |
| MediaGrid         | `apps/admin/src/entities/media/ui/MediaGrid.tsx`     | `acceptMimeTypes?: string[]`, `disabledReason?: string` — 비매칭 카드를 MediaCard에 disabled 전파 |
| MediaPicker       | `apps/admin/src/entities/media/ui/MediaPicker.tsx`   | `endpoint?`, `acceptMimeTypes?`, `disabledReason?` 패스스루                                |
| ImageUrlInput     | `apps/admin/src/entities/media/ui/ImageUrlInput.tsx` | `endpoint?`, `acceptMimeTypes?`, `disabledReason?`, `disableUrlInput?: boolean` (Input readOnly) |

**MediaPicker UI 게이트 원칙** (advisor 권장): SVG 등 비매칭 미디어를 **hide가 아닌 disabled + Tooltip**으로 표시. "어제 올린 SVG가 왜 안 보이지?" 혼란 회피. 서버 게이트가 보안, UI는 affordance.

### Phase D: 설정 API + Zod + Slice 확장

| 대상            | 파일                                                                            | 핵심                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod 스키마      | `apps/admin/src/features/site-settings/model/settingsSchemas.ts`                | `updateBrandingSchema` (6필드: siteName/siteDescription/logoMediaId/logoAlt/faviconMediaId/ogImageMediaId), `BrandingSettingsData`, `BrandingAssetKind = 'logo'|'favicon'|'og'` |
| API Route       | `apps/admin/app/api/settings/branding/route.ts`                                 | GET/PATCH/DELETE — 6키 통합 + **키별 MIME 게이트** + **변경된 키만 audit diff** + no-op short-circuit                                                  |
| Fetchers        | `apps/admin/src/features/site-settings/api/settingsFetchers.ts`                 | `getBrandingSettings`, `updateBrandingSettings(data)`, `deleteBrandingAsset(kind)`                                                                    |
| Queries         | `apps/admin/src/features/site-settings/api/settingsQueries.ts`                  | `brandingSettingsOptions()`                                                                                                                           |
| Mutations       | `apps/admin/src/features/site-settings/api/useSettingsMutations.ts`             | `useUpdateBranding`, `useDeleteBrandingAsset`                                                                                                         |
| Query Keys      | `apps/admin/src/shared/api/queryKeys.ts`                                        | `settingsKeys.branding()`                                                                                                                             |
| SettingsNav 탭  | `apps/admin/src/features/site-settings/ui/SettingsNav.tsx`                      | `{ label: '브랜딩', href: '/settings/branding' }` 추가                                                                                                |
| Form UI         | `apps/admin/src/features/site-settings/ui/BrandingSettingsForm.tsx`             | 6필드 + 3 ImageUrlInput + 외부 URL 차단 헬퍼 + useDirtyGuard + 자산별 [제거] 버튼                                                                     |
| 페이지          | `apps/admin/src/pages/site-settings/ui/BrandingSettingsPage.tsx`                | Server Component prefetch + HydrationBoundary                                                                                                         |
| App route       | `apps/admin/app/(authenticated)/settings/branding/page.tsx`                     | re-export                                                                                                                                             |
| Stories         | `apps/admin/src/features/site-settings/ui/BrandingSettingsForm.stories.tsx`     | 4 variants — Default/Filled/SubmitSuccess/SubmitError400 (MockBrandingProvider + fetchStubDecorator)                                                   |

권한: 기존 `settings:read|update` 그대로. 변경 없음.

### Phase E: 공개 웹 반영

| 대상              | 파일                                                                | 핵심                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| brandingCache     | `apps/web/src/shared/lib/brandingCache.ts`                          | 인메모리 60s prod / 5s dev TTL (`domainCache.ts` 미러). 6키 + 3 Media join 1회. fetch 실패 시 폴백 객체 (페이지 렌더 차단 X)          |
| HeaderBranding    | `apps/web/src/widgets/layout/ui/HeaderBranding.tsx` (NEW)           | KRDS DOM 클래스(`.header-branding > h2.logo > a`) 차용 커스텀 JSX. logoUrl 없으면 `.header-logo-text` 사이트명 시각 폴백              |
| PageLayout        | `apps/web/src/widgets/layout/ui/PageLayout.tsx`                     | `branding: Branding` prop + `<HeaderBranding>` 교체 + `copyright={`© ${siteName}. All rights reserved.`}` 동적                       |
| layout.tsx        | `apps/web/app/layout.tsx`                                           | `export const metadata` → `export async function generateMetadata()` 변환 + `RootLayout`에서 `getCachedBranding()` Promise.all 추가 |
| globals.css       | `apps/web/app/globals.css`                                          | `.header-branding .header-logo-image { max-height: 100%; width: auto; max-width: 200px; object-fit: contain }` + `.header-logo-text` |

**파일 컨벤션 충돌 검증 (구현 전 필수)**: `apps/web/app/{favicon,icon,apple-icon,opengraph-image,twitter-image}.*` 파일이 0건인지 Glob 확인. 존재 시 Next.js 자동 picking이 `generateMetadata().icons` / `openGraph` override함 → 삭제하거나 동적 미적용.

## 핵심 패턴 참조

### 키별 MIME 게이트 (PATCH server gate)

```ts
const MIME_RULES: Record<'logoMediaId' | 'faviconMediaId' | 'ogImageMediaId', { allowed: Set<string>; label: string }> = {
  logoMediaId:    { allowed: new Set(['image/jpeg', 'image/png', 'image/webp']), label: '로고는 PNG, JPG, WEBP만 사용할 수 있습니다.' },
  faviconMediaId: { allowed: new Set(['image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']), label: '파비콘은 PNG, WEBP, ICO만 사용할 수 있습니다.' },
  ogImageMediaId: { allowed: new Set(['image/jpeg', 'image/png', 'image/webp']), label: 'OG 이미지는 PNG, JPG, WEBP만 사용할 수 있습니다.' },
};

// 변경된 mediaId만 검증 (before와 다른 경우)
if (mediaIdsToCheck.length > 0) {
  const medias = await prisma.media.findMany({
    where: { id: { in: mediaIdsToCheck.map(([, id]) => id) } },
    select: { id: true, mimeType: true },
  });
  const mimeMap = new Map(medias.map((m) => [m.id, m.mimeType]));
  for (const [field, mediaId] of mediaIdsToCheck) {
    const mime = mimeMap.get(mediaId);
    if (!mime || !MIME_RULES[field].allowed.has(mime)) {
      return 400 with MIME_RULES[field].label;
    }
  }
}
```

**사유**: MediaPicker UX 게이트가 SVG를 disabled 표시해도 사용자가 강제로 PATCH 호출(curl 등) 시 우회 가능. 서버가 최종 게이트 (defense-in-depth).

### 변경된 키만 diff (audit log)

```ts
// 6키 풀 덤프는 노이즈 — 도메인 설정 패턴 일관성
const before = await getSiteSettings(Object.values(SETTING_KEYS));
// ... setSiteSetting × 6 (null이면 deleteSiteSetting)
const after = { /* 6키 */ };
const changedKeys = Object.keys(after).filter((k) => (after[k] ?? '') !== (before[k] ?? ''));
if (changedKeys.length === 0) return success(null); // no-op short-circuit
const changes = {
  before: Object.fromEntries(changedKeys.map((k) => [k, before[k] ?? ''])),
  after:  Object.fromEntries(changedKeys.map((k) => [k, after[k] ?? ''])),
};
logAuditEvent({ entityType: 'SITE_SETTINGS', entityId: 'SITE_BRANDING', changes, ... });
```

### brandingCache (`domainCache.ts` 미러)

```ts
const TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 5_000;
let cache: { data: Branding; fetchedAt: number } | null = null;
const FALLBACK: Branding = { siteName: 'Simple CMS', siteDescription: '공개 웹', logoUrl: null, ... };

export async function getCachedBranding(): Promise<Branding> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.data;
  try {
    const values = await getSiteSettings([6키]);
    const mediaIds = [logo, favicon, og].filter(Boolean);
    const urlByMediaId = new Map((await prisma.media.findMany({ where: { id: { in: mediaIds } }, select: { id, url } })).map((m) => [m.id, m.url]));
    const data = { /* 6필드 + 3 url join + logoAlt/siteName 폴백 */ };
    cache = { data, fetchedAt: now };
    return data;
  } catch (err) {
    console.error('[brandingCache] fetch failed', err);
    return FALLBACK;  // 캐시 갱신 안 함 — 다음 요청 재시도
  }
}
```

**캐시 정책**: admin → web 별 인스턴스라 즉시 invalidate 불가. UI/AGENTS.md에 "**최대 1분 후 반영**" 명시. favicon은 브라우저 캐시로 추가 수일 지연 가능 — `?v=mediaId` cache busting.

### `generateMetadata` 동적화 (try/catch 폴백)

```ts
export async function generateMetadata(): Promise<Metadata> {
  let branding: Branding;
  try {
    branding = await getCachedBranding();
  } catch (err) {
    console.error('[generateMetadata] branding fetch failed', err);
    branding = FALLBACK;  // metadata만 폴백, 페이지 렌더 차단 X
  }
  const metadata: Metadata = {
    title: { default: branding.siteName, template: `%s | ${branding.siteName}` },
    description: branding.siteDescription,
  };
  if (branding.faviconUrl) {
    // ?v={mediaId} cache busting (mediaId가 SHA-256 기반이라 동일 바이너리 재업로드는 무효화 안 됨 — 의도적)
    metadata.icons = { icon: `${branding.faviconUrl}?v=${branding.faviconMediaId ?? ''}` };
  }
  if (branding.ogImageUrl) {
    metadata.openGraph = { images: [{ url: branding.ogImageUrl, width: 1200, height: 630, alt: branding.siteName }] };
  }
  return metadata;
}
```

`RootLayout`도 같은 `getCachedBranding()` 호출 → 모듈 레벨 TTL 캐시로 dedup, 첫 호출만 DB hit.

### HeaderBranding (KRDS markup replication)

KRDS 원본 `<Header.Branding>`은 `children`을 `.logo` `<h2>` **밖**에 렌더하므로 로고 이미지를 클릭 가능 영역 안에 두려면 그대로 사용 불가. **Stage 7d `RightSidebar`/`SubpageSideNavigation` 동일 패턴** — KRDS DOM 클래스(`.header-branding > h2.logo > a`) 차용한 커스텀 JSX. 검색 아이콘은 PageLayout에서 HeaderBranding으로 이전.

```tsx
'use client';
export function HeaderBranding({ branding }: { branding: Branding }) {
  return (
    <div className="header-branding">
      <h2 className="logo">
        <Link href="/">
          {branding.logoUrl ? (
            <>
              <img src={branding.logoUrl} alt="" className="header-logo-image" />
              <span className="sr-only">{branding.logoAlt}</span>
            </>
          ) : (
            <span className="header-logo-text">{branding.siteName}</span>
          )}
        </Link>
      </h2>
      <Link href="/search" className="header-search-link" aria-label="검색">{/* SVG */}</Link>
    </div>
  );
}
```

### 외부 URL 차단 (BrandingSettingsForm)

```tsx
const handleAssetChange = (field, setLocalUrl, next) => {
  if (!next.mediaId && next.url) {
    toast.error('업로드 또는 라이브러리에서 선택해주세요.');
    return;
  }
  setValue(field, next.mediaId, { shouldDirty: true });
  setLocalUrl(next.url);
};

<ImageUrlInput
  value={localLogoUrl}
  mediaId={watchLogoMediaId}
  category="branding"
  endpoint="/api/media/branding-upload"
  acceptMimeTypes={LOGO_MIME}
  disabledReason={LOGO_REASON}
  disableUrlInput  // Input readOnly — 외부 URL 직접 입력 차단
  onChange={(next) => handleAssetChange('logoMediaId', setLogoUrl, next)}
/>
```

**사유**: 외부 URL의 mimeType 검증 불가(HEAD 요청도 spoofing 가능) → SVG 차단 정책 충돌, SSRF 잠재 위험, 외부 도메인 다운/SSL/CORS 시 헤더 깨짐.

### `setValueAs` null safety (RHF)

```ts
// 잘못된 패턴 — 초기값이 null이면 v.trim() 실패
{...register('siteDescription', { setValueAs: (v: string) => v.trim() === '' ? null : v })}

// 올바른 패턴
{...register('siteDescription', {
  setValueAs: (v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s === '' ? null : s;
  },
})}
```

## 검증 체크리스트 (PR 전)

- [ ] `MediaReferenceType`에 `'SITE_SETTINGS'` 포함
- [ ] `MEDIA_BEARING_SETTING_KEYS` 화이트리스트로 `findMediaReferences()` 8번째 경로 부분 스캔 (전체 풀스캔 금지)
- [ ] `branding-upload`가 SVG 차단 + ICO 허용 + `application/octet-stream` 제외
- [ ] PATCH handler에 키별 MIME 게이트 (MediaPicker SVG 우회 차단)
- [ ] 변경된 키만 audit `changes`에 포함 + no-op short-circuit
- [ ] DELETE에 `?kind=logo|favicon|og` 쿼리 — 단일 자산만 제거 (siteName/description은 PATCH로만)
- [ ] MediaPicker `acceptMimeTypes` prop이 disabled+Tooltip으로 표시 (hide 아님)
- [ ] ImageUrlInput에 `disableUrlInput=true` + onChange 외부 URL 차단 toast
- [ ] brandingCache 60s prod / 5s dev TTL + 폴백 객체 + try/catch
- [ ] `generateMetadata` try/catch 폴백 + favicon `?v=mediaId` cache busting + OG 1200x630
- [ ] `apps/web/app/favicon.ico` / `app/icon.*` / `app/apple-icon.*` / `app/opengraph-image.*` 0건 확인 (Glob)
- [ ] HeaderBranding 커스텀 JSX (KRDS Header.Branding 그대로 사용 X)
- [ ] PageLayout 푸터 copyright `© ${siteName}` 동기화
- [ ] BrandingSettingsForm Storybook 4 variants + fetchStubDecorator
- [ ] AGENTS.md 3곳 업데이트 (root + admin + web)

## 참고

- `/create-domain-settings` — 같은 SiteSettings 도메인의 도메인 설정 구현 스킬
- `/create-security-settings` — 같은 SiteSettings 도메인의 보안 설정 구현 스킬
- `/create-upload-settings` — 같은 SiteSettings 도메인의 업로드 제한 설정 구현 스킬
- `/create-media-library` — Media 라이브러리 + ImageUrlInput + MediaPicker 패턴 (Phase C에서 prop 확장 필요)
- `/create-api` — API Route 생성 패턴
- `/check-permissions` — settings 권한 체크 일관성 검사
- `/check-fsd` — FSD 아키텍처 규칙 검증
- `/review-code` — 코드 품질 체크리스트 (감사 로그 포함 여부 확인)
