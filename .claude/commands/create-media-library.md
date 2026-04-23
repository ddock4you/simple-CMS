현재 대화 컨텍스트를 분석하여 **미디어 라이브러리 기능 (SHA-256 중복 방지 + 참조 추적 + MediaPicker + Tiptap 통합)**을 구현해줘.

## 동작 순서

1. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인.
   - Media 모델의 contentHash/uploadedById 필드 → `packages/db/prisma/schema.prisma`
   - media 권한 리소스 → `packages/types/src/domain/permission.types.ts` (`RESOURCE_ACTIONS.media`)
   - media.dto.ts → `packages/types/src/dto/media.dto.ts`
   - 업로드 API 중복 방지 → `apps/admin/app/api/media/upload/route.ts` 내 `crypto.createHash('sha256')`
   - 참조 추적 헬퍼 → `apps/admin/src/features/media-management/lib/findMediaReferences.ts`
   - `/media` 페이지 → `apps/admin/app/(authenticated)/media/page.tsx`
   - 공용 UI(MediaPicker/ImageUrlInput 등) → `apps/admin/src/entities/media/`
   - 관리 UI(Detail/Delete/BulkDelete Dialog) → `apps/admin/src/features/media-management/ui/`
   - Tiptap 통합 → `packages/editor/src/imageWithMediaId.ts`, `uploadPlugin.ts`
2. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
3. **컨벤션 검증**: FSD 구조, 감사 로그 연동, import 규칙, 권한 체크, URL 경계 정규화 확인.

## FSD 레이어 분할 원칙 (중요)

미디어는 **여러 슬라이스(home/popup/block 등)에서 공통 재사용**되는 엔티티이므로 `entities/media/` 슬라이스로 분리한다. `features/media-management/`는 `/media` 페이지 전용 관리 기능(상세 편집/삭제/일괄 삭제)만 남긴다.

| 위치 | 담당 |
| --- | --- |
| `entities/media/api/` | `mediaFetchers.ts`, `mediaQueries.ts`, `useUploadMedia.ts` (범용 쿼리·업로드 훅) |
| `entities/media/model/` | `mediaFilters.ts` (parseMediaFilters 등) |
| `entities/media/lib/` | `formatFileSize.ts` |
| `entities/media/ui/` | `MediaCard`, `MediaGrid`, `MediaFilters`, `MediaPagination`, `MediaUploadButton`, `MediaPicker`, `ImageUrlInput` (호출 측이 재사용) |
| `features/media-management/api/` | `useMediaMutations.ts` (update/delete/bulkDelete — `/media` 페이지 전용) |
| `features/media-management/lib/` | `findMediaReferences.ts` (삭제 검증) |
| `features/media-management/model/` | `mediaSchemas.ts` (CRUD Zod) |
| `features/media-management/ui/` | `MediaDetailDialog`, `DeleteMediaDialog`, `BulkDeleteMediaDialog` |

## 전제 조건

- Storage Adapter 추상화가 이미 존재해야 한다 (`apps/admin/src/shared/lib/storage/`)
- RESOURCE_ACTIONS 기반 권한 시스템이 이미 존재해야 한다
- Tiptap 공용 확장 패키지 `@simple-cms/editor`의 `getSharedExtensions()`이 이미 존재해야 한다
- 전제 조건이 충족되지 않으면 먼저 구현해야 할 항목을 안내한다

## Phase별 생성 대상

### Phase A: 스키마 + 권한 + DTO (인프라)

| 대상 | 파일 | 핵심 변경 |
| ---- | ---- | --------- |
| Prisma Media | `packages/db/prisma/schema.prisma` | `contentHash String? @unique`, `uploadedById String?`, `uploadedBy User? @relation("MediaUploader", ...)`, `@@index([uploadedById])` |
| User 역관계 | 같은 파일 | `uploadedMedia Media[] @relation("MediaUploader")` |
| 권한 레지스트리 | `packages/types/src/domain/permission.types.ts` | `ResourceKey`에 `'media'` 추가, `RESOURCE_ACTIONS.media = { name: '미디어 라이브러리', actions: ['create','read','update','delete'] }` |
| Seed 권한 | `packages/db/prisma/seed.ts` | `FULL_PERMISSIONS.media` 4종 true, `DEFAULT_PERMISSIONS.media = { read: true, create: true }` |
| 사이드바 메뉴 | `apps/admin/src/shared/config/navigation.ts` | 콘텐츠 그룹에 `{ title: '미디어', url: '/media', icon: ImageIcon, resource: 'media' }` |
| DTO | `packages/types/src/dto/media.dto.ts` (신규) | `MediaListItem`, `MediaDetail`, `MediaListFilters`, `MediaListResponse`, `UpdateMediaDto`, `UploadMediaResponse(+reused)`, `MediaReference`, `MediaReferencesResponse`, `BulkDeleteMediaResponse` |
| types index | `packages/types/src/index.ts` | 위 타입 re-export |

마이그레이션: `pnpm db:push --accept-data-loss` (기존 Media 레코드는 contentHash null 유지 — UNIQUE는 NULL 중복을 무시해 안전).

### Phase B: 업로드 API 중복 방지 + CRUD + 참조 추적

| 대상 | 파일 | 핵심 |
| ---- | ---- | ---- |
| 업로드 중복 방지 | `apps/admin/app/api/media/upload/route.ts` (수정) | SHA-256 해시 계산 → `findUnique({ contentHash })` → hit면 `reused: true` 반환(파일·레코드·로그 모두 skip) |
| 참조 추적 헬퍼 | `apps/admin/src/features/media-management/lib/findMediaReferences.ts` (신규) | 다중 경로 스캔: FK(Subpage/Post.featuredImageId, HomePopup.imageMediaId), JSONB `@>` (HomeSection configJson, PageBlock IMAGE), Tiptap JSON 재귀 walk (Post.contentJson, RICH_TEXT 블록), **SiteSettings 화이트리스트 (Stage 7l — `MEDIA_BEARING_SETTING_KEYS` 부분 스캔, 풀스캔 금지)** |
| 목록 API | `apps/admin/app/api/media/route.ts` (신규) | GET, `media:read`, q/mimeType 필터 + 페이지네이션 + uploadedBy include |
| 상세/수정/삭제 API | `apps/admin/app/api/media/[id]/route.ts` (신규) | GET/PATCH/DELETE, 참조 있으면 409 차단 |
| 사용처 조회 API | `apps/admin/app/api/media/[id]/references/route.ts` (신규) | `findMediaReferences` 결과 반환 |
| 일괄 삭제 API | `apps/admin/app/api/media/bulk-delete/route.ts` (신규) | POST, `ids[]` 받아 건별 참조 확인 후 삭제/차단 분리. 트랜잭션 없음. `{ deleted, blocked }` 응답 |
| StorageAdapter 확장 | `apps/admin/src/shared/lib/storage/types.ts` + 어댑터 구현 | `delete(storageKey)`, `urlToStorageKey(url)` 메서드 추가 |

감사 로그: `MEDIA` entityType. 재사용 시 skip, 신규 CREATE / alt 변경 UPDATE / 단건·일괄 DELETE 모두 기록.

### Phase C: FSD + Query 레이어

| 대상 | 파일 | 핵심 |
| ---- | ---- | ---- |
| Query Keys | `apps/admin/src/shared/api/queryKeys.ts` | `mediaKeys = { all, lists(), list(filters), detail(id), references(id) }` |
| Schemas | `apps/admin/src/features/media-management/model/mediaSchemas.ts` | zod: `mediaListQuerySchema`, `updateMediaSchema` |
| Filters | `apps/admin/src/entities/media/model/mediaFilters.ts` | `parseMediaFilters(searchParams)`, `buildMediaSearchParams(filters)` |
| Fetchers | `apps/admin/src/entities/media/api/mediaFetchers.ts` | `getMediaList`, `getMediaDetail`, `getMediaReferences`, `updateMedia`, `deleteMedia`, `bulkDeleteMedia`, `uploadMedia` (FormData 직접 fetch) |
| Queries | `apps/admin/src/entities/media/api/mediaQueries.ts` | `mediaListOptions`, `mediaDetailOptions`, `mediaReferencesOptions` (nullable id + enabled) |
| Upload Mutation | `apps/admin/src/entities/media/api/useUploadMedia.ts` | `useUploadMedia` (`reused` 토스트 분기) — entities에 둬야 공용 UI(MediaUploadButton)가 features 의존 없이 사용 |
| 관리 Mutations | `apps/admin/src/features/media-management/api/useMediaMutations.ts` | `useUpdateMedia`, `useDeleteMedia`, `useBulkDeleteMedia` (`/media` 페이지 전용) |

### Phase D: 공용 UI (entities/media) + 관리 UI (features/media-management)

| 대상 | 파일 | 핵심 |
| ---- | ---- | ---- |
| Card | `entities/media/ui/MediaCard.tsx` | `selectable/checked/onToggleSelect` props 지원, 우측상단 체크박스(hover/선택 시 표시) |
| Grid | `entities/media/ui/MediaGrid.tsx` | `selectedIds: Set<string>` 전파 |
| Filters | `entities/media/ui/MediaFilters.tsx` | `onChange` 콜백 지원 — `/media`는 URL, Picker는 internal state 분기 |
| Pagination | `entities/media/ui/MediaPagination.tsx` | `onPageChange` 콜백 지원 |
| UploadButton | `entities/media/ui/MediaUploadButton.tsx` | `onUploaded` 콜백, `entities/media/api/useUploadMedia` 참조. **Stage 7l 추가 prop**: `endpoint?: string` (기본 `/api/media/upload`, 브랜딩은 `/api/media/branding-upload`), `acceptMimeTypes?: string[]` (`<input accept>` 동적 생성) |
| MediaCard | `entities/media/ui/MediaCard.tsx` | `selectable/checked/onToggleSelect` props 지원, 우측상단 체크박스. **Stage 7l 추가 prop**: `disabled?: boolean` + `disabledReason?: string` (disabled 시 클릭 차단 + opacity-50 + Tooltip) |
| MediaGrid | `entities/media/ui/MediaGrid.tsx` | `selectedIds: Set<string>` 전파. **Stage 7l 추가 prop**: `acceptMimeTypes?: string[]` + `disabledReason?: string` (비매칭 카드를 MediaCard에 disabled 전파 — `acceptSet ? !acceptSet.has(media.mimeType) : false`) |
| MediaPicker | `entities/media/ui/MediaPicker.tsx` | 위 컴포넌트 조합, internal state + `onSelect` 콜백 (공용 — home/popup/block/tiptap에서 재사용). **Stage 7l 추가 prop**: `endpoint?`, `acceptMimeTypes?`, `disabledReason?` 패스스루 |
| ImageUrlInput | `entities/media/ui/ImageUrlInput.tsx` | URL 직접 입력 + UploadButton + MediaPicker 통합 복합 입력 (공용). **단일 `onChange(next: { url, mediaId, originalName })`** API — §"ImageUrlInput 단일 onChange 패턴" 참조. **Stage 7l 추가 prop**: `endpoint?`, `acceptMimeTypes?`, `disabledReason?` 패스스루 + `disableUrlInput?: boolean` (Input readOnly로 외부 URL 직접 입력 차단) |
| formatFileSize | `entities/media/lib/formatFileSize.ts` | B/KB/MB/GB 변환 |
| DetailDialog | `features/media-management/ui/MediaDetailDialog.tsx` | useQuery(`@/entities/media/api/mediaQueries`) + references + alt 편집 + 삭제 버튼 |
| DeleteDialog | `features/media-management/ui/DeleteMediaDialog.tsx` | AlertDialog + 사용처 표시 + 차단 |
| BulkDeleteDialog | `features/media-management/ui/BulkDeleteMediaDialog.tsx` | 2단계(확인 → 결과), blocked 사용처 목록 |
| Pages | `src/pages/media-management/ui/MediaPage.tsx` (Server) + `MediaPageClient.tsx` (Client) | prefetch + HydrationBoundary + 상단 툴바(전체선택 checkbox + 일괄 삭제). 공용 UI는 `@/entities/media/ui/*` 에서, 관리 Dialog는 `@/features/media-management/ui/*` 에서 import |
| App route | `app/(authenticated)/media/page.tsx` | `export { default } from '@/pages/media-management/ui/MediaPage';` |

### Phase E: URL 경계 정규화 (admin 표시용)

| 대상 | 파일 | 핵심 |
| ---- | ---- | ---- |
| URL 헬퍼 | `apps/admin/src/shared/lib/mediaUrl.ts` (신규) | `WEB_BASE_URL` export, `resolveMediaPreviewUrl(url)` (상대→절대, 절대 URL은 통과), `toRelativeMediaUrl(url)` (역방향) |
| Tiptap JSON 변환 | `apps/admin/src/shared/lib/tiptapContentTransform.ts` (신규) | `preprocessTiptapForAdmin(json)`, `postprocessTiptapForSave(json)` — `image.attrs.src` 재귀 walk |
| 뷰 렌더러 | `apps/admin/src/shared/lib/renderContent.ts` (신규) | `renderTiptapContentForAdmin(json)` — preprocess → generateHTML (HTML regex 치환 금지) |
| 미디어 이미지 지점 | `entities/media/ui/MediaCard`, `entities/media/ui/ImageUrlInput`, `features/media-management/ui/MediaDetailDialog` | `src={resolveMediaPreviewUrl(url)}` 적용 |
| 뷰 페이지 | `SubpageView.tsx`, `PostView.tsx` | `renderTiptapContentForAdmin(data.contentJson)` 사용 |

**Web 쪽 DOMPurify**: `apps/web/src/shared/lib/renderContent.ts`의 ALLOWED_ATTR에 `data-media-id` 추가.

### Phase F: HERO/RECOMMENDED 통합

| 대상 | 파일 | 변경 |
| ---- | ---- | ---- |
| 도메인 타입 | `packages/types/src/domain/home.types.ts` | HeroSlide/RecommendedItem에 `mediaId?: string \| null` 추가 |
| Zod 스키마 | `apps/admin/src/features/home-management/model/homeSchemas.ts` | heroSlideSchema/recommendedItemSchema에 `mediaId: z.string().max(64).nullable().optional()` |
| Web 파서 | `apps/web/src/entities/home-section/lib/parseConfig.ts` | mediaId optional 허용 (저장값 보존) |
| ImageUrlInput | `apps/admin/src/entities/media/ui/ImageUrlInput.tsx` | `value`/`mediaId`/`originalName` props + 단일 `onChange(next: ImageUrlInputValue)`, [라이브러리] 버튼 + MediaPicker, `MediaUploadButton` 재사용. 호출 측에서 `import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput'` |
| HeroFields/RecommendedFields | 같은 폴더 | `append()` 기본값에 `mediaId: null`, 서브필드에서 mediaId watch/setValue |

### Phase G: Tiptap 확장 + 에디터 통합

| 대상 | 파일 | 핵심 |
| ---- | ---- | ---- |
| ImageWithMediaId | `packages/editor/src/imageWithMediaId.ts` (신규) | `Image.extend({ addAttributes })` + `...this.parent?.()` + `mediaId` renderHTML/parseHTML (`data-media-id` 속성) |
| uploadPlugin | `packages/editor/src/uploadPlugin.ts` (신규) | `Extension.create` + `addProseMirrorPlugins` + `handlePaste`/`handleDrop`. `uploadImage` 콜백 옵션 (null이면 no-op) |
| extensions 교체 | `packages/editor/src/extensions.ts` | 기본 Image → `ImageWithMediaId.configure(...)`. StarterKit v3 Link/Underline 기본 포함 주의: `StarterKit.configure({ link: false })` + 별도 `Link.configure({ openOnClick: false, autolink: true })` |
| editor index | `packages/editor/src/index.ts` | `ImageWithMediaId`, `ImageUploadExtension`, `UploadResult` export |
| TiptapEditor | `apps/admin/src/shared/ui/TiptapEditor.tsx` | (1) extensions에 `ImageUploadExtension.configure({ uploadImage, onError })` (2) initial content preprocess (useMemo) (3) onUpdate postprocess (4) setImage 호출 시 src를 `resolveMediaPreviewUrl` 적용 (5) 툴바 [이미지] 드롭다운: 업로드/라이브러리/URL 3옵션 |

## 핵심 패턴 참조

### ImageUrlInput 단일 onChange 패턴 (React 18 배칭 경합 방지)

과거에는 `ImageUrlInput`이 `onChange(url)`, `onMediaIdChange(id)`, `onOriginalNameChange(name)` 3개의 콜백을 선택/업로드 완료 시 순차 호출했다. 호출 측이 **단일 useState 객체**를 쓰고 `setConfig({ ...value, imageUrl: url })` / `setConfig({ ...value, imageMediaId: id })` 처럼 direct value로 연속 setState하면:

- React 18+ 자동 배칭으로 두 호출이 같은 렌더 사이클에서 처리
- 두 payload 모두 closure의 `value`(초기값)를 참조 → 뒷 호출이 앞 호출을 **덮어씀**
- 결과: 업로드 후 `imageUrl`이 빈값, `imageMediaId`만 저장되는 버그

해결: 단일 `onChange` 콜백으로 3필드를 묶어 전달 → 호출 측이 **한 번의 state 업데이트**로 3필드를 일괄 반영.

```ts
// entities/media/ui/ImageUrlInput.tsx
export interface ImageUrlInputValue {
  url: string;
  mediaId: string | null;
  originalName: string | null;
}

interface ImageUrlInputProps {
  value: string;
  mediaId?: string | null;
  originalName?: string | null;
  onChange: (next: ImageUrlInputValue) => void;
  category?: string;
  ...
}

// 내부 — URL 직접 입력/업로드/선택/제거 모두 단일 onChange 호출
const handleUploaded = (uploaded) => {
  onChange({
    url: uploaded.url,
    mediaId: uploaded.id,
    originalName: uploaded.originalFilename ?? null,
  });
};
```

**호출 측 두 가지 패턴**:

1. **useState 객체 관리 (block-management 등)**: 단일 setConfig로 일괄 반영
   ```tsx
   <ImageUrlInput
     value={value.imageUrl}
     mediaId={value.imageMediaId ?? null}
     onChange={(next) => onChange({
       ...value,
       imageUrl: next.url,
       imageMediaId: next.mediaId,
     })}
   />
   ```

2. **react-hook-form 필드별 관리 (home-management 등)**: setValue 3회 (RHF는 필드별 독립이라 순차 호출 안전)
   ```tsx
   onChange={(next) => {
     setValue(`slides.${index}.imageUrl`, next.url, { shouldDirty: true });
     setValue(`slides.${index}.imageOriginalName`, next.originalName, { shouldDirty: true });
     setValue(`slides.${index}.mediaId`, next.mediaId, { shouldDirty: true });
   }}
   ```

**원칙**: React useState 객체를 여러 필드로 쪼개 순차 업데이트하는 패턴은 피할 것. 다중 필드가 연관된 state는 항상 하나의 update payload로 처리.

### SHA-256 중복 방지 (업로드 API)

```ts
const buffer = Buffer.from(await file.arrayBuffer());
const contentHash = createHash('sha256').update(buffer).digest('hex');
const existing = await prisma.media.findUnique({
  where: { contentHash },
  include: { uploadedBy: { select: { id: true, name: true, username: true } } },
});
if (existing) {
  return ok({ ...existingToDto, reused: true });  // 파일·레코드·감사로그 모두 skip
}
// miss → storage.upload + Media.create({ contentHash, uploadedById: user.id }) + 감사 로그
```

### 참조 추적 3경로

```ts
// 1) FK: prisma findMany로 featuredImageId
// 2) JSONB: $queryRaw + @> 연산자
const homeSectionMatches = await prisma.$queryRaw<HomeSectionRaw[]>`
  SELECT id, "sectionType", title FROM "HomeSection"
  WHERE ("configJson" -> 'slides') @> ${JSON.stringify([{ mediaId }])}::jsonb
     OR ("configJson" -> 'items')  @> ${JSON.stringify([{ mediaId }])}::jsonb
`;
// 3) Tiptap JSON 재귀 walk
const hasImage = (node) =>
  (node?.type === 'image' && node.attrs?.mediaId === mediaId) ||
  (Array.isArray(node?.content) && node.content.some(hasImage));
```

### URL 경계 정규화

```ts
// mediaUrl.ts
export const WEB_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export function resolveMediaPreviewUrl(url: string): string {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;  // 절대 URL 통과
  if (url.startsWith('/')) return `${WEB_BASE_URL}${url}`;                  // 상대 → 절대
  return url;
}
// tiptapContentTransform.ts — JSON walk
function walk(node, transform) {
  if (node?.type === 'image' && typeof node.attrs?.src === 'string') {
    node.attrs.src = transform(node.attrs.src);
  }
  node?.content?.forEach?.(c => walk(c, transform));
}
```

**금지 패턴**: HTML 문자열에서 regex로 `src="..."` 치환 — Tiptap Image의 resize 래퍼/data-src 속성 누락 위험. 반드시 **JSON 단계**에서 변환.

### Tiptap `.extend` + ProseMirror Plugin

```ts
// addAttributes: 부모 attrs 유지 필수
export const ImageWithMediaId = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),  // ← src/alt/width/... 계승
      mediaId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-media-id'),
        renderHTML: (attrs) => attrs.mediaId ? { 'data-media-id': attrs.mediaId } : {},
      },
    };
  },
});

// ProseMirror Plugin — handlePaste/handleDrop return true = 기본 동작 취소
new Plugin({
  props: {
    handlePaste(view, event) {
      if (!opts.uploadImage) return false;
      const imgs = Array.from(event.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'));
      if (imgs.length === 0) return false;
      event.preventDefault();
      imgs.forEach(file => opts.uploadImage(file).then(({ src, mediaId, alt }) => {
        view.dispatch(view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src, alt, mediaId })));
      }));
      return true;
    },
  },
});
```

### 일괄 삭제 부분 성공 응답

```ts
// POST /api/media/bulk-delete — 트랜잭션 없음 (의도적)
const deleted: string[] = [];
const blocked: Array<{ id; originalFilename; references }> = [];
for (const media of medias) {
  const references = await findMediaReferences(media.id);
  if (references.length > 0) {
    blocked.push({ id: media.id, originalFilename: media.originalFilename, references });
    continue;
  }
  await adapter.delete(adapter.urlToStorageKey(media.url));
  await prisma.media.delete({ where: { id: media.id } });
  logAuditEvent({ action: 'DELETE', entityType: 'MEDIA', ... });
  deleted.push(media.id);
}
return ok({ deleted, blocked });
```

## 검증 체크리스트 (PR 전)

- [ ] `contentHash`가 `@unique` + nullable인지 (기존 데이터 호환)
- [ ] 업로드 응답이 신규/재사용 모두 동일 `MediaListItem + reused` 형태인지
- [ ] 삭제 전 `findMediaReferences`가 3경로(FK/JSONB/JSON walk) 모두 스캔하는지
- [ ] 참조 있으면 409 + 사용처 목록 반환, 강제 삭제 옵션 없는지
- [ ] `ImageWithMediaId`의 `addAttributes`에 `...this.parent?.()` 포함, NodeView 재정의 안 했는지
- [ ] Tiptap 편집기 `useEditor({ content })`에 preprocess 통과한 JSON 전달, `onUpdate`에서 postprocess 후 저장
- [ ] 뷰 페이지 렌더러가 JSON preprocess → generateHTML (HTML regex 치환 금지)
- [ ] `data-media-id`가 admin `ImageWithMediaId` renderHTML + web DOMPurify ALLOWED_ATTR 양쪽에 있는지
- [ ] MediaPicker가 `/media`, ImageUrlInput, Tiptap 툴바 3곳에서 동일 컴포넌트로 사용되는지
- [ ] Picker 내부 필터가 URL이 아닌 internal state인지 (`onChange` 콜백 경로)
- [ ] 권한 체크: 모든 Media API Route에 `requirePermission('media', ...)`, UI는 `usePermission('media', ...)`
- [ ] 감사 로그: `MEDIA` entityType, 재사용은 skip, 일괄 삭제는 성공 건별로 기록
- [ ] **FSD 레이어 분할**: 공용 UI(Picker/ImageUrlInput 등)는 `entities/media/`, `/media` 관리 Dialog는 `features/media-management/`. home/popup/block 등 다른 슬라이스는 `@/entities/media/ui/*`만 import (같은 레이어 간 슬라이스 직접 import 금지)

## 참고

- `/check-permissions` — media 권한 등록 + API Route 권한 체크 + 사이드바 필터링 일관성 검사
- `/check-fsd` — `features/media-management/` 슬라이스 레이어 의존성 검증
- `/check-imports` — `resolveMediaPreviewUrl` 등 헬퍼가 FSD 규칙 준수하는지
- `/create-api` — Media CRUD API Route 템플릿 (requirePermission 포함)
- `docs/learning/2-develop/5a2-미디어라이브러리-*-학습정리.md` — 실제 구현 상 트러블과 설계 판단 정리
